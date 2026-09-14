import { WhatsAppConversationStatus, WhatsAppMessageType } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { classifyWhatsAppIntent } from "./intents";

export async function processNextWhatsAppMessage(tenantId: string) {
  return prisma.$transaction(async (tx) => {
    const message = await tx.whatsAppInboundMessage.findFirst({
      where: { tenantId, type: WhatsAppMessageType.TEXT, processedAt: null, processingAt: null },
      orderBy: { receivedAt: "asc" },
    });
    if (!message || !message.text) return null;

    const claimed = await tx.whatsAppInboundMessage.updateMany({
      where: { id: message.id, tenantId, processedAt: null, processingAt: null },
      data: { processingAt: new Date() },
    });
    if (claimed.count !== 1) return null;

    const intent = classifyWhatsAppIntent(message.text);
    const conversation = await tx.whatsAppConversation.upsert({
      where: { tenantId_customerPhone: { tenantId, customerPhone: message.sender } },
      create: {
        tenantId,
        phoneNumberId: message.phoneNumberId,
        customerPhone: message.sender,
        status: WhatsAppConversationStatus.ACTIVE,
        lastIntent: intent,
        draft: {},
        lastMessageAt: message.receivedAt,
      },
      update: {
        phoneNumberId: message.phoneNumberId,
        status: WhatsAppConversationStatus.ACTIVE,
        lastIntent: intent,
        lastMessageAt: message.receivedAt,
      },
    });

    await tx.whatsAppInboundMessage.update({
      where: { id: message.id },
      data: { conversationId: conversation.id, processedAt: new Date(), processingAt: null },
    });
    return { messageId: message.id, conversationId: conversation.id, intent };
  });
}

export async function releaseExpiredWhatsAppMessageClaims(tenantId: string) {
  return prisma.whatsAppInboundMessage.updateMany({
    where: { tenantId, processedAt: null, processingAt: { lt: new Date(Date.now() - 5 * 60_000) } },
    data: { processingAt: null },
  });
}
