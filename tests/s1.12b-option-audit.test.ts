import "dotenv/config";

import assert from "node:assert/strict";
import {
  after,
  before,
  describe,
  test,
} from "node:test";

import { RoleCode, SelectionType } from "@prisma/client";

import { AuditActions, AuditEntityTypes } from "../lib/audit/actions";
import { prisma } from "../lib/db/prisma";
import {
  createOptionForTenant,
  deleteOptionForTenant,
  updateOptionForTenant,
} from "../lib/data/options";

const runId = `${Date.now()}-${Math.random()
  .toString(36)
  .slice(2, 8)}`;

let tenantAId = "";
let tenantBId = "";
let actorUserId = "";
let groupAId = "";
let groupBId = "";
let optionId = "";

const auditContext = {
  get actorUserId() {
    return actorUserId;
  },
  ipAddress: "203.0.113.12",
};

describe("S1.12B - auditoria das mutações de Option", () => {
  before(async () => {
    const tenantA = await prisma.tenant.create({
      data: {
        name: `S1.12B Tenant A ${runId}`,
        slug: `s112b-a-${runId}`,
      },
    });

    const tenantB = await prisma.tenant.create({
      data: {
        name: `S1.12B Tenant B ${runId}`,
        slug: `s112b-b-${runId}`,
      },
    });

    tenantAId = tenantA.id;
    tenantBId = tenantB.id;

    const actor = await prisma.user.create({
      data: {
        tenantId: tenantAId,
        name: "Auditor S1.12B",
        email: `s112b-${runId}@example.test`,
        role: RoleCode.OWNER,
        status: "ACTIVE",
      },
    });

    actorUserId = actor.id;

    const [groupA, groupB] = await Promise.all([
      prisma.optionGroup.create({
        data: {
          tenantId: tenantAId,
          name: "Grupo A S1.12B",
          slug: `grupo-a-${runId}`,
          selectionType: SelectionType.SINGLE,
        },
      }),
      prisma.optionGroup.create({
        data: {
          tenantId: tenantBId,
          name: "Grupo B S1.12B",
          slug: `grupo-b-${runId}`,
          selectionType: SelectionType.SINGLE,
        },
      }),
    ]);

    groupAId = groupA.id;
    groupBId = groupB.id;
  });

  after(async () => {
    if (tenantAId || tenantBId) {
      await prisma.tenant.deleteMany({
        where: {
          id: {
            in: [tenantAId, tenantBId].filter(Boolean),
          },
        },
      });
    }

    await prisma.$disconnect();
  });

  test("OPTION_CREATED registra ator, IP e snapshot no tenant correto", async () => {
    const option = await createOptionForTenant(
      tenantAId,
      {
        optionGroupId: groupAId,
        name: "Opção auditada",
        position: 2,
        active: true,
        priceDelta: 3.5,
      },
      auditContext,
    );

    assert.ok(option);
    optionId = option.id;

    const auditLog = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenantAId,
        action: AuditActions.OPTION_CREATED,
        entityId: optionId,
      },
    });

    assert.ok(auditLog);
    assert.equal(auditLog.actorUserId, actorUserId);
    assert.equal(auditLog.entityType, AuditEntityTypes.OPTION);
    assert.equal(auditLog.ipAddress, auditContext.ipAddress);
    assert.deepEqual(auditLog.metadata, {
      after: {
        optionGroupId: groupAId,
        name: "Opção auditada",
        position: 2,
        active: true,
        priceDelta: "3.50",
      },
    });
  });

  test("OPTION_UPDATED registra snapshots anterior e posterior", async () => {
    const option = await updateOptionForTenant(
      tenantAId,
      optionId,
      {
        name: "Opção atualizada",
        active: false,
        priceDelta: 4.75,
      },
      auditContext,
    );

    assert.ok(option);

    const auditLog = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenantAId,
        action: AuditActions.OPTION_UPDATED,
        entityId: optionId,
      },
    });

    assert.ok(auditLog);
    assert.deepEqual(auditLog.metadata, {
      before: {
        optionGroupId: groupAId,
        name: "Opção auditada",
        position: 2,
        active: true,
        priceDelta: "3.50",
      },
      after: {
        optionGroupId: groupAId,
        name: "Opção atualizada",
        position: 2,
        active: false,
        priceDelta: "4.75",
      },
    });
  });

  test("tentativa cross-tenant não altera Option nem cria auditoria", async () => {
    const auditCountBefore = await prisma.auditLog.count({
      where: {
        tenantId: tenantAId,
        entityId: optionId,
      },
    });

    const option = await updateOptionForTenant(
      tenantAId,
      optionId,
      {
        optionGroupId: groupBId,
      },
      auditContext,
    );

    assert.equal(option, null);

    const persisted = await prisma.option.findUnique({
      where: { id: optionId },
    });
    const auditCountAfter = await prisma.auditLog.count({
      where: {
        tenantId: tenantAId,
        entityId: optionId,
      },
    });

    assert.ok(persisted);
    assert.equal(persisted.optionGroupId, groupAId);
    assert.equal(auditCountAfter, auditCountBefore);
  });

  test("falha ao auditar reverte atomicamente a criação", async () => {
    const name = `Rollback S1.12B ${runId}`;

    await assert.rejects(() =>
      createOptionForTenant(
        tenantAId,
        {
          optionGroupId: groupAId,
          name,
        },
        {
          actorUserId: "usuario-inexistente",
        },
      ),
    );

    const option = await prisma.option.findFirst({
      where: {
        tenantId: tenantAId,
        name,
      },
    });

    assert.equal(option, null);
  });

  test("OPTION_DELETED preserva snapshot após remover a entidade", async () => {
    const option = await deleteOptionForTenant(
      tenantAId,
      optionId,
      auditContext,
    );

    assert.ok(option);
    assert.equal(
      await prisma.option.findUnique({
        where: { id: optionId },
      }),
      null,
    );

    const auditLog = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenantAId,
        action: AuditActions.OPTION_DELETED,
        entityId: optionId,
      },
    });

    assert.ok(auditLog);
    assert.deepEqual(auditLog.metadata, {
      before: {
        optionGroupId: groupAId,
        name: "Opção atualizada",
        position: 2,
        active: false,
        priceDelta: "4.75",
      },
    });
  });
});
