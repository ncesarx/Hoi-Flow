import "dotenv/config";

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import {
  OrderStatus,
  ProductStatus,
  RoleCode,
  SelectionType,
} from "@prisma/client";

import { AuditActions } from "../lib/audit/actions";
import {
  createOrderForTenant,
  getOrderForTenant,
  updateOrderStatusForTenant,
} from "../lib/data/orders";
import { prisma } from "../lib/db/prisma";

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
let tenantAId = "";
let tenantBId = "";
let actorId = "";
let productId = "";
let optionId = "";
let orderId = "";

describe("S2.1 - fundação do motor de pedidos", () => {
  before(async () => {
    const [tenantA, tenantB] = await Promise.all([
      prisma.tenant.create({
        data: { name: `S2.1 A ${runId}`, slug: `s21-a-${runId}` },
      }),
      prisma.tenant.create({
        data: { name: `S2.1 B ${runId}`, slug: `s21-b-${runId}` },
      }),
    ]);
    tenantAId = tenantA.id;
    tenantBId = tenantB.id;

    const category = await prisma.category.create({
      data: {
        tenantId: tenantAId,
        name: "Refeições",
        slug: `refeicoes-${runId}`,
      },
    });
    const [product, group, actor] = await Promise.all([
      prisma.product.create({
        data: {
          tenantId: tenantAId,
          categoryId: category.id,
          name: "Marmitex",
          slug: `marmitex-${runId}`,
          basePrice: "20.00",
          status: ProductStatus.ACTIVE,
        },
      }),
      prisma.optionGroup.create({
        data: {
          tenantId: tenantAId,
          name: "Mistura",
          slug: `mistura-${runId}`,
          selectionType: SelectionType.SINGLE,
          minSelections: 1,
          maxSelections: 1,
          required: true,
        },
      }),
      prisma.user.create({
        data: {
          tenantId: tenantAId,
          name: "Operador S2.1",
          email: `s21-${runId}@example.test`,
          role: RoleCode.OWNER,
          status: "ACTIVE",
        },
      }),
    ]);
    productId = product.id;
    actorId = actor.id;

    const option = await prisma.option.create({
      data: {
        tenantId: tenantAId,
        optionGroupId: group.id,
        name: "Frango",
        priceDelta: "3.50",
      },
    });
    optionId = option.id;
    await prisma.productOptionGroup.create({
      data: {
        tenantId: tenantAId,
        productId,
        optionGroupId: group.id,
      },
    });
  });

  after(async () => {
    await prisma.tenant.deleteMany({
      where: { id: { in: [tenantAId, tenantBId].filter(Boolean) } },
    });
    await prisma.$disconnect();
  });

  test("cria pedido com snapshots, total e auditoria", async () => {
    const order = await createOrderForTenant(
      tenantAId,
      {
        customerName: "Cliente piloto",
        items: [
          {
            productId,
            quantity: 2,
            optionIds: [optionId],
          },
        ],
      },
      { actorUserId: actorId, ipAddress: "203.0.113.21" },
    );
    assert.ok(order);
    orderId = order.id;
    assert.equal(order.status, OrderStatus.NEW);
    assert.equal(order.total.toFixed(2), "47.00");
    assert.equal(order.items[0]?.productName, "Marmitex");
    assert.equal(order.items[0]?.unitPrice.toFixed(2), "23.50");
    assert.equal(order.items[0]?.options[0]?.optionName, "Frango");

    const log = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenantAId,
        entityId: orderId,
        action: AuditActions.ORDER_CREATED,
      },
    });
    assert.ok(log);
    assert.equal(log.actorUserId, actorId);
  });

  test("outro tenant não consulta nem altera o pedido", async () => {
    assert.equal(await getOrderForTenant(tenantBId, orderId), null);
    assert.equal(
      await updateOrderStatusForTenant(
        tenantBId,
        orderId,
        OrderStatus.PREPARING,
      ),
      null,
    );
  });

  test("aplica somente transições válidas e registra auditoria", async () => {
    assert.equal(
      await updateOrderStatusForTenant(
        tenantAId,
        orderId,
        OrderStatus.READY,
      ),
      null,
    );
    const preparing = await updateOrderStatusForTenant(
      tenantAId,
      orderId,
      OrderStatus.PREPARING,
      { actorUserId: actorId },
    );
    assert.equal(preparing?.status, OrderStatus.PREPARING);

    const logs = await prisma.auditLog.count({
      where: {
        tenantId: tenantAId,
        entityId: orderId,
        action: AuditActions.ORDER_STATUS_CHANGED,
      },
    });
    assert.equal(logs, 1);
  });

  test("rejeita seleção obrigatória ausente sem persistir pedido", async () => {
    const countBefore = await prisma.order.count({
      where: { tenantId: tenantAId },
    });
    assert.equal(
      await createOrderForTenant(tenantAId, {
        items: [{ productId, quantity: 1 }],
      }),
      null,
    );
    assert.equal(
      await prisma.order.count({ where: { tenantId: tenantAId } }),
      countBefore,
    );
  });
});
