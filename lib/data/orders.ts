import { randomUUID } from "node:crypto";

import {
  NotificationChannel,
  OrderChannel,
  OrderNotificationEvent,
  OrderStatus,
  type Prisma,
  ProductStatus,
} from "@prisma/client";

import { AuditActions, AuditEntityTypes } from "@/lib/audit/actions";
import { createAuditLog } from "@/lib/audit/audit";
import { prisma } from "@/lib/db/prisma";
import {
  calculateOrderItemSubtotal,
  canTransitionOrderStatus,
  orderStatusTimestamps,
  orderStatusNotificationEvent,
  sumMoney,
} from "@/lib/orders/domain";

type OrderAuditContext = {
  actorUserId?: string | null;
  ipAddress?: string | null;
};

export type CreateOrderInput = {
  unitId?: string | null;
  channel?: OrderChannel;
  customerName?: string | null;
  customerPhone?: string | null;
  notes?: string | null;
  items: Array<{
    productId: string;
    quantity: number;
    notes?: string | null;
    optionIds?: string[];
  }>;
};

function createOrderCode() {
  return `HF-${Date.now().toString(36).toUpperCase()}-${randomUUID()
    .slice(0, 6)
    .toUpperCase()}`;
}

export async function listOrdersForTenant(
  tenantId: string,
  status?: OrderStatus,
) {
  return prisma.order.findMany({
    where: {
      tenantId,
      status,
    },
    include: {
      unit: true,
      items: {
        include: { options: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function listKitchenOrdersForTenant(tenantId: string) {
  return prisma.order.findMany({
    where: {
      tenantId,
      status: {
        in: [OrderStatus.NEW, OrderStatus.PREPARING, OrderStatus.READY],
      },
    },
    include: {
      unit: true,
      items: {
        include: { options: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
}

export async function listOrderCatalogForTenant(tenantId: string) {
  return prisma.product.findMany({
    where: {
      tenantId,
      status: ProductStatus.ACTIVE,
      basePrice: { not: null },
    },
    include: {
      category: true,
      optionGroups: {
        include: {
          optionGroup: {
            include: {
              options: {
                where: { active: true },
                orderBy: { name: "asc" },
              },
            },
          },
        },
        orderBy: { position: "asc" },
      },
    },
    orderBy: [{ category: { position: "asc" } }, { name: "asc" }],
  });
}

export async function getOrderForTenant(tenantId: string, orderId: string) {
  return prisma.order.findFirst({
    where: { id: orderId, tenantId },
    include: {
      unit: true,
      items: {
        include: { options: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function createOrderForTenant(
  tenantId: string,
  input: CreateOrderInput,
  auditContext: OrderAuditContext = {},
) {
  return prisma.$transaction((tx) =>
    createOrderForTenantInTransaction(tx, tenantId, input, auditContext),
  );
}

export async function createOrderForTenantInTransaction(
  tx: Prisma.TransactionClient,
  tenantId: string,
  input: CreateOrderInput,
  auditContext: OrderAuditContext = {},
  options: { enqueueConfirmationNotification?: boolean } = {},
) {
  if (input.items.length === 0) {
    return null;
  }

  if (input.unitId) {
    const unit = await tx.unit.findFirst({
      where: {
        id: input.unitId,
        tenantId,
        status: "ACTIVE",
      },
    });
    if (!unit) return null;
  }

  const preparedItems = [];

  for (const requestedItem of input.items) {
    if (
      !Number.isInteger(requestedItem.quantity) ||
      requestedItem.quantity < 1
    ) {
      return null;
    }

    const product = await tx.product.findFirst({
      where: {
        id: requestedItem.productId,
        tenantId,
        status: ProductStatus.ACTIVE,
        basePrice: { not: null },
      },
      include: {
        optionGroups: {
          include: {
            optionGroup: {
              include: {
                options: {
                  where: { active: true },
                },
              },
            },
          },
        },
      },
    });
    if (!product || !product.basePrice) return null;

    const requestedOptionIds = [...new Set(requestedItem.optionIds ?? [])];
    const allowedOptions = product.optionGroups.flatMap(({ optionGroup }) =>
      optionGroup.options.map((option) => ({
        ...option,
        optionGroupId: optionGroup.id,
      })),
    );
    const selectedOptions = requestedOptionIds.map((optionId) =>
      allowedOptions.find((option) => option.id === optionId),
    );
    if (selectedOptions.some((option) => !option)) return null;

    for (const { optionGroup } of product.optionGroups) {
      const selectionCount = selectedOptions.filter(
        (option) => option?.optionGroupId === optionGroup.id,
      ).length;
      if (
        selectionCount < optionGroup.minSelections ||
        selectionCount > optionGroup.maxSelections ||
        (optionGroup.required && selectionCount === 0)
      ) {
        return null;
      }
    }

    const options = selectedOptions.filter(
      (option): option is NonNullable<typeof option> => Boolean(option),
    );
    const pricing = calculateOrderItemSubtotal(
      product.basePrice.toFixed(2),
      options.map((option) => option.priceDelta.toFixed(2)),
      requestedItem.quantity,
    );

    preparedItems.push({
      tenantId,
      productId: product.id,
      productName: product.name,
      quantity: requestedItem.quantity,
      unitPrice: pricing.unitPrice,
      subtotal: pricing.subtotal,
      notes: requestedItem.notes ?? null,
      options: {
        create: options.map((option) => ({
          tenantId,
          optionId: option.id,
          optionName: option.name,
          priceDelta: option.priceDelta,
        })),
      },
    });
  }

  const total = sumMoney(preparedItems.map((item) => item.subtotal));
  const createdOrder = await tx.order.create({
    data: {
      tenantId,
      unitId: input.unitId ?? null,
      code: createOrderCode(),
      channel: input.channel ?? OrderChannel.MANUAL,
      status: OrderStatus.NEW,
      customerName: input.customerName ?? null,
      customerPhone: input.customerPhone ?? null,
      notes: input.notes ?? null,
      total,
      confirmedAt: new Date(),
    },
  });

  for (const preparedItem of preparedItems) {
    const { options, ...itemData } = preparedItem;
    const orderItem = await tx.orderItem.create({
      data: {
        ...itemData,
        orderId: createdOrder.id,
      },
    });

    if (options.create.length > 0) {
      await tx.orderItemOption.createMany({
        data: options.create.map((option) => ({
          ...option,
          orderItemId: orderItem.id,
        })),
      });
    }
  }

  const order = await tx.order.findUniqueOrThrow({
    where: { id: createdOrder.id },
    include: {
      unit: true,
      items: {
        include: { options: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (
    order.customerPhone &&
    options.enqueueConfirmationNotification !== false
  ) {
    await tx.orderNotification.create({
      data: {
        tenantId,
        orderId: order.id,
        channel: NotificationChannel.WHATSAPP,
        event: OrderNotificationEvent.ORDER_CONFIRMED,
        recipient: order.customerPhone,
        payload: {
          orderId: order.id,
          code: order.code,
          customerName: order.customerName,
          status: order.status,
          total: order.total.toFixed(2),
        },
      },
    });
  }

  await createAuditLog(
    {
      tenantId,
      actorUserId: auditContext.actorUserId,
      action: AuditActions.ORDER_CREATED,
      entityType: AuditEntityTypes.ORDER,
      entityId: order.id,
      metadata: {
        code: order.code,
        channel: order.channel,
        status: order.status,
        total: order.total.toFixed(2),
        itemCount: order.items.length,
      },
      ipAddress: auditContext.ipAddress,
    },
    tx,
  );

  return order;
}

export async function updateOrderStatusForTenant(
  tenantId: string,
  orderId: string,
  status: OrderStatus,
  auditContext: OrderAuditContext = {},
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: orderId, tenantId },
    });
    if (!order || !canTransitionOrderStatus(order.status, status)) {
      return null;
    }

    const update = await tx.order.updateMany({
      where: {
        id: order.id,
        tenantId,
        status: order.status,
      },
      data: {
        status,
        ...orderStatusTimestamps(status, new Date()),
      },
    });
    if (update.count !== 1) return null;

    const updatedOrder = await tx.order.findUniqueOrThrow({
      where: { id: order.id },
      include: {
        unit: true,
        items: {
          include: { options: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    const notificationEvent = orderStatusNotificationEvent(status);
    if (order.customerPhone && notificationEvent) {
      await tx.orderNotification.create({
        data: {
          tenantId,
          orderId: order.id,
          channel: NotificationChannel.WHATSAPP,
          event: notificationEvent,
          recipient: order.customerPhone,
          payload: {
            orderId: order.id,
            code: order.code,
            customerName: order.customerName,
            status: updatedOrder.status,
          },
        },
      });
    }

    await createAuditLog(
      {
        tenantId,
        actorUserId: auditContext.actorUserId,
        action: AuditActions.ORDER_STATUS_CHANGED,
        entityType: AuditEntityTypes.ORDER,
        entityId: order.id,
        metadata: {
          code: order.code,
          before: order.status,
          after: updatedOrder.status,
        },
        ipAddress: auditContext.ipAddress,
      },
      tx,
    );

    return updatedOrder;
  });
}
