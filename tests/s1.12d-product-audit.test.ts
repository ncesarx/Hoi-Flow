import "dotenv/config";

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { ProductStatus, RoleCode } from "@prisma/client";

import { AuditActions, AuditEntityTypes } from "../lib/audit/actions";
import {
  createProductForTenant,
  updateProductForTenant,
} from "../lib/data/products";
import { prisma } from "../lib/db/prisma";

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
let tenantAId = "";
let tenantBId = "";
let categoryAId = "";
let categoryBId = "";
let actorUserId = "";
let productId = "";

const auditContext = {
  get actorUserId() {
    return actorUserId;
  },
  ipAddress: "203.0.113.14",
};

describe("S1.12D - auditoria das mutações de Product", () => {
  before(async () => {
    const [tenantA, tenantB] = await Promise.all([
      prisma.tenant.create({
        data: { name: `S1.12D A ${runId}`, slug: `s112d-a-${runId}` },
      }),
      prisma.tenant.create({
        data: { name: `S1.12D B ${runId}`, slug: `s112d-b-${runId}` },
      }),
    ]);
    tenantAId = tenantA.id;
    tenantBId = tenantB.id;

    const [categoryA, categoryB, actor] = await Promise.all([
      prisma.category.create({
        data: {
          tenantId: tenantAId,
          name: "Categoria A",
          slug: `categoria-a-${runId}`,
        },
      }),
      prisma.category.create({
        data: {
          tenantId: tenantBId,
          name: "Categoria B",
          slug: `categoria-b-${runId}`,
        },
      }),
      prisma.user.create({
        data: {
          tenantId: tenantAId,
          name: "Auditor S1.12D",
          email: `s112d-${runId}@example.test`,
          role: RoleCode.OWNER,
          status: "ACTIVE",
        },
      }),
    ]);
    categoryAId = categoryA.id;
    categoryBId = categoryB.id;
    actorUserId = actor.id;
  });

  after(async () => {
    await prisma.tenant.deleteMany({
      where: { id: { in: [tenantAId, tenantBId].filter(Boolean) } },
    });
    await prisma.$disconnect();
  });

  test("PRODUCT_CREATED registra contexto e snapshot", async () => {
    const product = await createProductForTenant(
      tenantAId,
      {
        categoryId: categoryAId,
        name: "Marmitex auditado",
        slug: `marmitex-${runId}`,
        description: "Piloto Xero Verde",
        basePrice: "24.90",
      },
      auditContext,
    );
    assert.ok(product);
    productId = product.id;

    const log = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenantAId,
        action: AuditActions.PRODUCT_CREATED,
        entityId: productId,
      },
    });
    assert.ok(log);
    assert.equal(log.actorUserId, actorUserId);
    assert.equal(log.entityType, AuditEntityTypes.PRODUCT);
    assert.equal(log.ipAddress, auditContext.ipAddress);
    assert.deepEqual(log.metadata, {
      after: {
        categoryId: categoryAId,
        name: "Marmitex auditado",
        slug: `marmitex-${runId}`,
        description: "Piloto Xero Verde",
        basePrice: "24.90",
        status: ProductStatus.ACTIVE,
        imageUrl: null,
      },
    });
  });

  test("PRODUCT_UPDATED registra before e after", async () => {
    const product = await updateProductForTenant(
      tenantAId,
      productId,
      {
        name: "Marmitex atualizado",
        basePrice: "26.50",
        status: ProductStatus.INACTIVE,
      },
      auditContext,
    );
    assert.ok(product);

    const log = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenantAId,
        action: AuditActions.PRODUCT_UPDATED,
        entityId: productId,
      },
    });
    assert.ok(log);
    const metadata = log.metadata as {
      before: { name: string; basePrice: string };
      after: { name: string; basePrice: string; status: string };
    };
    assert.equal(metadata.before.name, "Marmitex auditado");
    assert.equal(metadata.before.basePrice, "24.90");
    assert.equal(metadata.after.name, "Marmitex atualizado");
    assert.equal(metadata.after.basePrice, "26.50");
    assert.equal(metadata.after.status, ProductStatus.INACTIVE);
  });

  test("categoria de outro tenant não altera produto nem gera log", async () => {
    const countBefore = await prisma.auditLog.count({
      where: { tenantId: tenantAId, entityId: productId },
    });
    const result = await updateProductForTenant(
      tenantAId,
      productId,
      { categoryId: categoryBId },
      auditContext,
    );
    assert.equal(result, null);
    assert.equal(
      await prisma.auditLog.count({
        where: { tenantId: tenantAId, entityId: productId },
      }),
      countBefore,
    );
  });

  test("falha de auditoria reverte a criação", async () => {
    const slug = `rollback-product-${runId}`;
    await assert.rejects(() =>
      createProductForTenant(
        tenantAId,
        {
          categoryId: categoryAId,
          name: "Rollback Product",
          slug,
        },
        { actorUserId: "usuario-inexistente" },
      ),
    );
    assert.equal(
      await prisma.product.findFirst({ where: { tenantId: tenantAId, slug } }),
      null,
    );
  });
});
