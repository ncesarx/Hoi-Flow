import "dotenv/config";

import assert from "node:assert/strict";
import {
  after,
  before,
  describe,
  test,
} from "node:test";

import { RoleCode } from "@prisma/client";

import {
  AuditActions,
  AuditEntityTypes,
} from "../lib/audit/actions";
import {
  createCategoryForTenant,
  deleteCategoryForTenant,
  updateCategoryForTenant,
} from "../lib/data/categories";
import { prisma } from "../lib/db/prisma";

const runId = `${Date.now()}-${Math.random()
  .toString(36)
  .slice(2, 8)}`;

let tenantAId = "";
let tenantBId = "";
let actorUserId = "";
let categoryId = "";

const auditContext = {
  get actorUserId() {
    return actorUserId;
  },
  ipAddress: "203.0.113.13",
};

describe("S1.12C - auditoria das mutações de Category", () => {
  before(async () => {
    const [tenantA, tenantB] = await Promise.all([
      prisma.tenant.create({
        data: {
          name: `S1.12C Tenant A ${runId}`,
          slug: `s112c-a-${runId}`,
        },
      }),
      prisma.tenant.create({
        data: {
          name: `S1.12C Tenant B ${runId}`,
          slug: `s112c-b-${runId}`,
        },
      }),
    ]);

    tenantAId = tenantA.id;
    tenantBId = tenantB.id;

    const actor = await prisma.user.create({
      data: {
        tenantId: tenantAId,
        name: "Auditor S1.12C",
        email: `s112c-${runId}@example.test`,
        role: RoleCode.OWNER,
        status: "ACTIVE",
      },
    });

    actorUserId = actor.id;
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

  test("CATEGORY_CREATED registra ator, IP e snapshot no tenant correto", async () => {
    const category = await createCategoryForTenant(
      tenantAId,
      {
        name: "Refeições auditadas",
        slug: `refeicoes-${runId}`,
        position: 1,
        active: true,
      },
      auditContext,
    );

    categoryId = category.id;

    const auditLog = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenantAId,
        action: AuditActions.CATEGORY_CREATED,
        entityId: categoryId,
      },
    });

    assert.ok(auditLog);
    assert.equal(auditLog.actorUserId, actorUserId);
    assert.equal(auditLog.entityType, AuditEntityTypes.CATEGORY);
    assert.equal(auditLog.ipAddress, auditContext.ipAddress);
    assert.deepEqual(auditLog.metadata, {
      after: {
        name: "Refeições auditadas",
        slug: `refeicoes-${runId}`,
        position: 1,
        active: true,
      },
    });
  });

  test("CATEGORY_UPDATED registra snapshots anterior e posterior", async () => {
    const category = await updateCategoryForTenant(
      tenantAId,
      categoryId,
      {
        name: "Pratos executivos",
        slug: `executivos-${runId}`,
        position: 2,
        active: false,
      },
      auditContext,
    );

    assert.ok(category);

    const auditLog = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenantAId,
        action: AuditActions.CATEGORY_UPDATED,
        entityId: categoryId,
      },
    });

    assert.ok(auditLog);
    assert.deepEqual(auditLog.metadata, {
      before: {
        name: "Refeições auditadas",
        slug: `refeicoes-${runId}`,
        position: 1,
        active: true,
      },
      after: {
        name: "Pratos executivos",
        slug: `executivos-${runId}`,
        position: 2,
        active: false,
      },
    });
  });

  test("tenant diferente não altera Category nem cria auditoria", async () => {
    const auditCountBefore = await prisma.auditLog.count({
      where: { tenantId: tenantBId },
    });

    const category = await updateCategoryForTenant(
      tenantBId,
      categoryId,
      { name: "Alteração indevida" },
      { ipAddress: auditContext.ipAddress },
    );

    assert.equal(category, null);
    assert.equal(
      await prisma.auditLog.count({
        where: { tenantId: tenantBId },
      }),
      auditCountBefore,
    );

    const persisted = await prisma.category.findUnique({
      where: { id: categoryId },
    });
    assert.ok(persisted);
    assert.equal(persisted.name, "Pratos executivos");
  });

  test("falha ao auditar reverte atomicamente a criação", async () => {
    const slug = `rollback-${runId}`;

    await assert.rejects(() =>
      createCategoryForTenant(
        tenantAId,
        {
          name: "Rollback S1.12C",
          slug,
        },
        { actorUserId: "usuario-inexistente" },
      ),
    );

    assert.equal(
      await prisma.category.findFirst({
        where: { tenantId: tenantAId, slug },
      }),
      null,
    );
  });

  test("CATEGORY_DELETED preserva snapshot após remover a entidade", async () => {
    const category = await deleteCategoryForTenant(
      tenantAId,
      categoryId,
      auditContext,
    );

    assert.ok(category);
    assert.equal(
      await prisma.category.findUnique({
        where: { id: categoryId },
      }),
      null,
    );

    const auditLog = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenantAId,
        action: AuditActions.CATEGORY_DELETED,
        entityId: categoryId,
      },
    });

    assert.ok(auditLog);
    assert.deepEqual(auditLog.metadata, {
      before: {
        name: "Pratos executivos",
        slug: `executivos-${runId}`,
        position: 2,
        active: false,
      },
    });
  });
});
