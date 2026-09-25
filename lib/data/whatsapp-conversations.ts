import { WhatsAppConversationStatus } from "@prisma/client";

import { AuditActions, AuditEntityTypes } from "@/lib/audit/actions";
import { createAuditLog } from "@/lib/audit/audit";
import { prisma } from "@/lib/db/prisma";

type ConversationAuditContext = {
  actorUserId?: string | null;
  ipAddress?: string | null;
};

export async function listWhatsAppConversationsForTenant(
  tenantId: string,
  limit = 40,
) {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  return prisma.whatsAppConversation.findMany({
    where: { tenantId },
    include: {
      messages: {
        orderBy: { receivedAt: "desc" },
        take: 40,
        select: {
          id: true,
          type: true,
          text: true,
          receivedAt: true,
        },
      },
      replies: {
        orderBy: { createdAt: "desc" },
        take: 40,
        select: {
          id: true,
          text: true,
          status: true,
          createdAt: true,
          sentAt: true,
        },
      },
    },
    orderBy: { lastMessageAt: "desc" },
    take: safeLimit,
  });
}

export async function resumeWhatsAppConversationForTenant(
  tenantId: string,
  conversationId: string,
  auditContext: ConversationAuditContext = {},
) {
  return prisma.$transaction(async (tx) => {
    const conversation = await tx.whatsAppConversation.findFirst({
      where: {
        id: conversationId,
        tenantId,
        status: WhatsAppConversationStatus.HANDED_OFF,
      },
    });
    if (!conversation) return null;

    const updated = await tx.whatsAppConversation.updateMany({
      where: {
        id: conversation.id,
        tenantId,
        status: WhatsAppConversationStatus.HANDED_OFF,
      },
      data: {
        status: WhatsAppConversationStatus.ACTIVE,
        draft: {},
      },
    });
    if (updated.count !== 1) return null;

    await createAuditLog(
      {
        tenantId,
        actorUserId: auditContext.actorUserId,
        action: AuditActions.WHATSAPP_CONVERSATION_RESUMED,
        entityType: AuditEntityTypes.WHATSAPP_CONVERSATION,
        entityId: conversation.id,
        metadata: {
          customerPhone: conversation.customerPhone,
          before: conversation.status,
          after: WhatsAppConversationStatus.ACTIVE,
        },
        ipAddress: auditContext.ipAddress,
      },
      tx,
    );

    return tx.whatsAppConversation.findFirst({
      where: { id: conversation.id, tenantId },
    });
  });
}

export async function sendWhatsAppConversationMessageForTenant(
  tenantId: string,
  conversationId: string,
  text: string,
  auditContext: ConversationAuditContext = {},
) {
  const messageText = text.trim();
  if (!messageText || messageText.length > 1_000) return null;

  return prisma.$transaction(async (tx) => {
    const conversation = await tx.whatsAppConversation.findFirst({
      where: {
        id: conversationId,
        tenantId,
        status: WhatsAppConversationStatus.HANDED_OFF,
      },
    });
    if (!conversation) return null;

    const message = await tx.whatsAppOutboundMessage.create({
      data: {
        tenantId,
        conversationId: conversation.id,
        inReplyToId: null,
        phoneNumberId: conversation.phoneNumberId,
        recipient: conversation.customerPhone,
        text: messageText,
      },
    });

    await createAuditLog(
      {
        tenantId,
        actorUserId: auditContext.actorUserId,
        action: AuditActions.WHATSAPP_MESSAGE_SENT,
        entityType: AuditEntityTypes.WHATSAPP_CONVERSATION,
        entityId: conversation.id,
        metadata: {
          outboundMessageId: message.id,
          characters: messageText.length,
        },
        ipAddress: auditContext.ipAddress,
      },
      tx,
    );

    return message;
  });
}
