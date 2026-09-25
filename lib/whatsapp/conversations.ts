import {
  OrderChannel,
  ProductStatus,
  type Prisma,
  WhatsAppConversationStatus,
  WhatsAppIntent,
  WhatsAppMessageType,
} from "@prisma/client";

import { createOrderForTenantInTransaction } from "@/lib/data/orders";
import { prisma } from "@/lib/db/prisma";
import { classifyWhatsAppIntent } from "./intents";
import {
  advanceWhatsAppOrderDraft,
  createWhatsAppOrderDraft,
  isWhatsAppDraftConfirmation,
  parseWhatsAppOrderDraft,
  type WhatsAppCatalogProduct,
} from "./order-draft";
import { buildWhatsAppReply } from "./replies";

export async function processNextWhatsAppMessage(tenantId: string) {
  return prisma.$transaction(async (tx) => {
    const message = await tx.whatsAppInboundMessage.findFirst({
      where: {
        tenantId,
        type: WhatsAppMessageType.TEXT,
        processedAt: null,
        processingAt: null,
      },
      orderBy: { receivedAt: "asc" },
    });
    if (!message || !message.text) return null;

    const claimed = await tx.whatsAppInboundMessage.updateMany({
      where: {
        id: message.id,
        tenantId,
        processedAt: null,
        processingAt: null,
      },
      data: { processingAt: new Date() },
    });
    if (claimed.count !== 1) return null;

    const intent = classifyWhatsAppIntent(message.text);
    const existingConversation = await tx.whatsAppConversation.findUnique({
      where: {
        tenantId_customerPhone: { tenantId, customerPhone: message.sender },
      },
      select: { id: true, status: true, draft: true },
    });
    if (
      existingConversation?.status === WhatsAppConversationStatus.HANDED_OFF
    ) {
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
    const currentDraft = parseWhatsAppOrderDraft(
      existingConversation?.draft ?? {},
    );
    const needsOrderCatalog =
      Boolean(currentDraft) ||
      intent === WhatsAppIntent.ORDER ||
      intent === WhatsAppIntent.MENU;
    const orderCatalog = needsOrderCatalog
      ? await tx.product.findMany({
          where: {
            tenantId,
            status: ProductStatus.ACTIVE,
            basePrice: { not: null },
            OR: [{ categoryId: null }, { category: { active: true } }],
          },
          include: {
            optionGroups: {
              where: { optionGroup: { active: true } },
              include: {
                optionGroup: {
                  include: {
                    options: {
                      where: { active: true },
                      orderBy: { position: "asc" },
                    },
                  },
                },
              },
              orderBy: { position: "asc" },
            },
          },
          orderBy: [{ category: { position: "asc" } }, { name: "asc" }],
          take: 20,
        })
      : [];
    const catalog: WhatsAppCatalogProduct[] = orderCatalog
      .filter(
        (
          product,
        ): product is typeof product & {
          basePrice: NonNullable<typeof product.basePrice>;
        } => product.basePrice !== null,
      )
      .map((product) => ({
        id: product.id,
        name: product.name,
        basePrice: product.basePrice.toFixed(2),
        optionGroups: product.optionGroups.map(({ optionGroup }) => ({
          id: optionGroup.id,
          name: optionGroup.name,
          selectionType: optionGroup.selectionType,
          minSelections: optionGroup.minSelections,
          maxSelections: optionGroup.maxSelections,
          required: optionGroup.required,
          options: optionGroup.options.map((option) => ({
            id: option.id,
            name: option.name,
            priceDelta: option.priceDelta.toFixed(2),
          })),
        })),
      }));
    const latestOrder =
      intent === WhatsAppIntent.STATUS
        ? await tx.order.findFirst({
            where: { tenantId, customerPhone: message.sender },
            select: { code: true, status: true },
            orderBy: { createdAt: "desc" },
          })
        : null;
    const conversation = await tx.whatsAppConversation.upsert({
      where: {
        tenantId_customerPhone: { tenantId, customerPhone: message.sender },
      },
      create: {
        tenantId,
        phoneNumberId: message.phoneNumberId,
        customerPhone: message.sender,
        status:
          intent === WhatsAppIntent.HELP
            ? WhatsAppConversationStatus.HANDED_OFF
            : WhatsAppConversationStatus.ACTIVE,
        lastIntent: intent,
        draft: {},
        lastMessageAt: message.receivedAt,
      },
      update: {
        phoneNumberId: message.phoneNumberId,
        status:
          intent === WhatsAppIntent.HELP
            ? WhatsAppConversationStatus.HANDED_OFF
            : WhatsAppConversationStatus.ACTIVE,
        lastIntent: intent,
        lastMessageAt: message.receivedAt,
      },
    });

    let draft = currentDraft;
    let reply: string | null = null;
    if (currentDraft && intent === WhatsAppIntent.CANCEL) {
      draft = null;
      reply =
        "A montagem do pedido foi cancelada. Envie *cardápio* quando quiser começar novamente.";
    } else if (
      currentDraft?.stage === "CONFIRM" &&
      currentDraft.item &&
      isWhatsAppDraftConfirmation(message.text)
    ) {
      const order = await createOrderForTenantInTransaction(
        tx,
        tenantId,
        {
          channel: OrderChannel.WHATSAPP,
          customerPhone: message.sender,
          items: [
            {
              productId: currentDraft.item.productId,
              quantity: currentDraft.item.quantity,
              optionIds: currentDraft.item.optionIds,
            },
          ],
        },
        {},
        { enqueueConfirmationNotification: false },
      );
      if (order) {
        draft = null;
        reply = `Pedido *${order.code}* confirmado e enviado para a cozinha. Total: R$ ${order.total.toFixed(2).replace(".", ",")}.`;
      } else {
        draft = null;
        reply =
          "O cardápio mudou durante a montagem. Envie *cardápio* para começar novamente.";
      }
    } else if (
      currentDraft &&
      intent !== WhatsAppIntent.HELP &&
      intent !== WhatsAppIntent.STATUS &&
      intent !== WhatsAppIntent.START &&
      intent !== WhatsAppIntent.MENU
    ) {
      const result = advanceWhatsAppOrderDraft(
        currentDraft,
        message.text,
        catalog,
      );
      draft = result.draft;
      reply = result.reply;
    } else if (
      intent === WhatsAppIntent.ORDER ||
      intent === WhatsAppIntent.MENU
    ) {
      const result = createWhatsAppOrderDraft(catalog);
      draft = result.draft;
      reply = result.reply;
    }

    if (draft !== currentDraft) {
      await tx.whatsAppConversation.update({
        where: { id: conversation.id },
        data: { draft: (draft ?? {}) as Prisma.InputJsonValue },
      });
    }

    await tx.whatsAppOutboundMessage.create({
      data: {
        tenantId,
        conversationId: conversation.id,
        inReplyToId: message.id,
        phoneNumberId: message.phoneNumberId,
        recipient: message.sender,
        text:
          reply ??
          buildWhatsAppReply({
            intent,
            tenantName: tenant.name,
            products: catalog.map((product) => ({
              name: product.name,
              price: product.basePrice,
            })),
            latestOrder,
          }),
      },
    });

    await tx.whatsAppInboundMessage.update({
      where: { id: message.id },
      data: {
        conversationId: conversation.id,
        processedAt: new Date(),
        processingAt: null,
      },
    });
    return { messageId: message.id, conversationId: conversation.id, intent };
  });
}

export async function releaseExpiredWhatsAppMessageClaims(tenantId: string) {
  return prisma.whatsAppInboundMessage.updateMany({
    where: {
      tenantId,
      processedAt: null,
      processingAt: { lt: new Date(Date.now() - 5 * 60_000) },
    },
    data: { processingAt: null },
  });
}
