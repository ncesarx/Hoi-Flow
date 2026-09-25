import { WhatsAppConversationStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export function whatsAppConversationExpirationCutoff(
  ttlMinutes: number,
  now = new Date(),
) {
  return new Date(now.getTime() - ttlMinutes * 60_000);
}

export async function expireInactiveWhatsAppConversations(
  tenantId: string,
  ttlMinutes: number,
) {
  return prisma.whatsAppConversation.updateMany({
    where: {
      tenantId,
      status: WhatsAppConversationStatus.ACTIVE,
      lastMessageAt: {
        lt: whatsAppConversationExpirationCutoff(ttlMinutes),
      },
    },
    data: {
      status: WhatsAppConversationStatus.EXPIRED,
      draft: {},
    },
  });
}
