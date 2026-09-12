import "dotenv/config";

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { ProductStatus, RoleCode, SelectionType } from "@prisma/client";

import { AuditActions } from "../lib/audit/actions";
import {
  createOptionGroupForTenant,
  updateOptionGroupForTenant,
} from "../lib/data/option-groups";
import {
  attachOptionGroupToProductForTenant,
  detachOptionGroupFromProductForTenant,
} from "../lib/data/product-option-groups";
import { prisma } from "../lib/db/prisma";

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
let tenantAId = "";
let tenantBId = "";
let actorUserId = "";
let productId = "";
let groupId = "";
let foreignGroupId = "";

const auditContext = {
  get actorUserId() {
    return actorUserId;
  },
  ipAddress: "203.0.113.15",
};

describe("S1.12E - auditoria de OptionGroup e vínculos", () => {
  before(async () => {
    const [tenantA, tenantB] = await Promise.all([
      prisma.tenant.create({
        data: { name: `S1.12E A ${runId}`, slug: `s112e-a-${runId}` },
      }),
      prisma.tenant.create({
        data: { name: `S1.12E B ${runId}`, slug: `s112e-b-${runId}` },
      }),
    ]);
    tenantAId = tenantA.id;
    tenantBId = tenantB.id;

    const [category, actor, foreignGroup] = await Promise.all([
      prisma.category.create({
        data: {
          tenantId: tenantAId,
          name: "Refeições",
          slug: `refeicoes-${runId}`,
        },
      }),
      prisma.user.create({
        data: {
          tenantId: tenantAId,
          name: "Auditor S1.12E",
          email: `s112e-${runId}@example.test`,
          role: RoleCode.OWNER,
          status: "ACTIVE",
        },
      }),
      prisma.optionGroup.create({
        data: {
          tenantId: tenantBId,
          name: "Grupo estrangeiro",
          slug: `estrangeiro-${runId}`,
          selectionType: SelectionType.SINGLE,
        },
      }),
    ]);
    actorUserId = actor.id;
    foreignGroupId = foreignGroup.id;

    const product = await prisma.product.create({
      data: {
        tenantId: tenantAId,
        categoryId: category.id,
        name: "Marmitex",
        slug: `marmitex-${runId}`,
        status: ProductStatus.ACTIVE,
      },
    });
    productId = product.id;
  });

  after(async () => {
    await prisma.tenant.deleteMany({
      where: { id: { in: [tenantAId, tenantBId].filter(Boolean) } },
    });
    await prisma.$disconnect();
  });

  test("criação e atualização de OptionGroup são auditadas", async () => {
    const group = await createOptionGroupForTenant(
      tenantAId,
      {
        name: "Mistura",
        slug: `mistura-${runId}`,
        selectionType: SelectionType.SINGLE,
        minSelections: 1,
        maxSelections: 1,
        required: true,
      },
      auditContext,
    );
    groupId = group.id;

    const updated = await updateOptionGroupForTenant(
      tenantAId,
      groupId,
      { name: "Mistura principal", position: 2 },
      auditContext,
    );
    assert.ok(updated);

    const logs = await prisma.auditLog.findMany({
      where: { tenantId: tenantAId, entityId: groupId },
      orderBy: { createdAt: "asc" },
    });
    assert.deepEqual(
      logs.map((log) => log.action),
      [AuditActions.OPTION_GROUP_CREATED, AuditActions.OPTION_GROUP_UPDATED],
    );
    assert.equal(logs[0]?.actorUserId, actorUserId);
    assert.equal(logs[0]?.ipAddress, auditContext.ipAddress);
  });

  test("attach e detach são auditados com identidade composta", async () => {
    const attached = await attachOptionGroupToProductForTenant(
      tenantAId,
      productId,
      groupId,
      1,
      auditContext,
    );
    assert.ok(attached);

    const detached = await detachOptionGroupFromProductForTenant(
      tenantAId,
      productId,
      groupId,
      auditContext,
    );
    assert.ok(detached);

    const entityId = `${productId}:${groupId}`;
    const logs = await prisma.auditLog.findMany({
      where: { tenantId: tenantAId, entityId },
      orderBy: { createdAt: "asc" },
    });
    assert.deepEqual(
      logs.map((log) => log.action),
      [
        AuditActions.PRODUCT_OPTION_GROUP_ATTACHED,
        AuditActions.PRODUCT_OPTION_GROUP_DETACHED,
      ],
    );
  });

  test("vínculo cross-tenant é bloqueado sem auditoria", async () => {
    const countBefore = await prisma.auditLog.count({
      where: { tenantId: tenantAId },
    });
    assert.equal(
      await attachOptionGroupToProductForTenant(
        tenantAId,
        productId,
        foreignGroupId,
        9,
        auditContext,
      ),
      null,
    );
    assert.equal(
      await prisma.auditLog.count({ where: { tenantId: tenantAId } }),
      countBefore,
    );
  });

  test("falha de auditoria reverte atomicamente o vínculo", async () => {
    await assert.rejects(() =>
      attachOptionGroupToProductForTenant(
        tenantAId,
        productId,
        groupId,
        1,
        { actorUserId: "usuario-inexistente" },
      ),
    );
    assert.equal(
      await prisma.productOptionGroup.findUnique({
        where: {
          productId_optionGroupId: { productId, optionGroupId: groupId },
        },
      }),
      null,
    );
  });
});
