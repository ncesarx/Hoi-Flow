import { ProductStatus, WhatsAppConversationStatus, WhatsAppIntent, WhatsAppMessageType } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { classifyWhatsAppIntent } from "./intents";
import { buildWhatsAppReply } from "./replies";

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
    const existingConversation = await tx.whatsAppConversation.findUnique({
      where: { tenantId_customerPhone: { tenantId, customerPhone: message.sender } },
      select: { id: true, status: true },
    });
    if (existingConversation?.status === WhatsAppConversationStatus.HANDED_OFF) {
      await tx.whatsAppConversation.update({
        where: { id: existingConversation.id },
        data: { lastIntent: intent, lastMessageAt: message.receivedAt },
      });
      await tx.whatsAppInboundMessage.update({
        where: { id: message.id },
        data: {
          conversationId: existingConversation.id,
          processedAt: new Date(),
          processingAt: null,
        },
      });
      return {
        messageId: message.id,
        conversationId: existingConversation.id,
        intent,
        handedOff: true,
      };
    }

    const tenant = await tx.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { name: true },
    });
    const products = intent === WhatsAppIntent.MENU
      ? await tx.product.findMany({
          where: { tenantId, status: ProductStatus.ACTIVE, category: { active: true } },
          select: { name: true, basePrice: true },
          orderBy: [{ category: { position: "asc" } }, { name: "asc" }],
          take: 20,
        })
      : [];
    const latestOrder = intent === WhatsAppIntent.STATUS
      ? await tx.order.findFirst({
          where: { tenantId, customerPhone: message.sender },
          select: { code: true, status: true },
          orderBy: { createdAt: "desc" },
        })
      : null;
    const conversation = await tx.whatsAppConversation.upsert({
      where: { tenantId_customerPhone: { tenantId, customerPhone: message.sender } },
      create: {
        tenantId,
        phoneNumberId: message.phoneNumberId,
        customerPhone: message.sender,
        status: intent === WhatsAppIntent.HELP
          ? WhatsAppConversationStatus.HANDED_OFF
          : WhatsAppConversationStatus.ACTIVE,
        lastIntent: intent,
        draft: {},
        lastMessageAt: message.receivedAt,
      },
      update: {
        phoneNumberId: message.phoneNumberId,
        status: intent === WhatsAppIntent.HELP
          ? WhatsAppConversationStatus.HANDED_OFF
          : WhatsAppConversationStatus.ACTIVE,
        lastIntent: intent,
        lastMessageAt: message.receivedAt,
      },
    });

    await tx.whatsAppOutboundMessage.create({
      data: {
        tenantId,
        conversationId: conversation.id,
        inReplyToId: message.id,
        phoneNumberId: message.phoneNumberId,
        recipient: message.sender,
        text: buildWhatsAppReply({
          intent,
          tenantName: tenant.name,
          products: products.map((product) => ({
            name: product.name,
            price: product.basePrice?.toString() ?? null,
          })),
          latestOrder,
        }),
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
