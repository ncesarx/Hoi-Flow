import { NotificationDeliveryStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { notificationRetryDelay, type NotificationSender } from "@/lib/notifications/provider";

const MAX_ATTEMPTS = 5;

export async function dispatchNextWhatsAppReply(
  tenantId: string,
  phoneNumberId: string,
  sender: NotificationSender,
) {
  const candidate = await prisma.whatsAppOutboundMessage.findFirst({
    where: {
      tenantId,
      phoneNumberId,
      status: NotificationDeliveryStatus.PENDING,
      availableAt: { lte: new Date() },
    },
    orderBy: { createdAt: "asc" },
  });
  if (!candidate) return { processed: false as const };

  const claimed = await prisma.whatsAppOutboundMessage.updateMany({
    where: {
      id: candidate.id,
      tenantId,
      phoneNumberId,
      status: NotificationDeliveryStatus.PENDING,
    },
    data: {
      status: NotificationDeliveryStatus.PROCESSING,
      lockedAt: new Date(),
      attempts: { increment: 1 },
    },
  });
  if (claimed.count !== 1) return { processed: false as const };

  try {
    const result = await sender.send({
      recipient: candidate.recipient,
      text: candidate.text,
      idempotencyKey: candidate.id,
    });
    await prisma.whatsAppOutboundMessage.updateMany({
      where: {
        id: candidate.id,
        tenantId,
        phoneNumberId,
        status: NotificationDeliveryStatus.PROCESSING,
      },
      data: {
        status: NotificationDeliveryStatus.SENT,
        sentAt: new Date(),
        lockedAt: null,
        providerMessageId: result.providerMessageId,
        lastError: null,
      },
    });
    return { processed: true as const, sent: true as const };
  } catch (error) {
    const attempts = candidate.attempts + 1;
    const failed = attempts >= MAX_ATTEMPTS;
    await prisma.whatsAppOutboundMessage.updateMany({
      where: {
        id: candidate.id,
        tenantId,
        phoneNumberId,
        status: NotificationDeliveryStatus.PROCESSING,
      },
      data: {
        status: failed ? NotificationDeliveryStatus.FAILED : NotificationDeliveryStatus.PENDING,
        availableAt: new Date(Date.now() + notificationRetryDelay(attempts)),
        lockedAt: null,
        lastError: error instanceof Error ? error.message.slice(0, 500) : "Falha desconhecida",
      },
    });
    return { processed: true as const, sent: false as const };
  }
}

export async function releaseExpiredWhatsAppReplyClaims(tenantId: string, phoneNumberId: string) {
  return prisma.whatsAppOutboundMessage.updateMany({
    where: {
      tenantId,
      phoneNumberId,
      status: NotificationDeliveryStatus.PROCESSING,
      lockedAt: { lt: new Date(Date.now() - 5 * 60_000) },
    },
    data: { status: NotificationDeliveryStatus.PENDING, lockedAt: null },
  });
}
