import "dotenv/config";

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import {
  getAuditLogForTenant,
  listAuditLogsForTenant,
} from "../lib/data/audit-logs";
import { prisma } from "../lib/db/prisma";

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
let tenantAId = "";
let tenantBId = "";
let auditAId = "";
let auditBId = "";

describe("S1.12F - isolamento da consulta de auditoria", () => {
  before(async () => {
    const [tenantA, tenantB] = await Promise.all([
      prisma.tenant.create({
        data: { name: `S1.12F A ${runId}`, slug: `s112f-a-${runId}` },
      }),
      prisma.tenant.create({
        data: { name: `S1.12F B ${runId}`, slug: `s112f-b-${runId}` },
      }),
    ]);
    tenantAId = tenantA.id;
    tenantBId = tenantB.id;

    const [auditA, auditB] = await Promise.all([
      prisma.auditLog.create({
        data: {
          tenantId: tenantAId,
          action: "TENANT_A_EVENT",
          entityType: "Tenant",
          entityId: tenantAId,
        },
      }),
      prisma.auditLog.create({
        data: {
          tenantId: tenantBId,
          action: "TENANT_B_EVENT",
          entityType: "Tenant",
          entityId: tenantBId,
        },
      }),
    ]);
    auditAId = auditA.id;
    auditBId = auditB.id;
  });

  after(async () => {
    await prisma.tenant.deleteMany({
      where: { id: { in: [tenantAId, tenantBId].filter(Boolean) } },
    });
    await prisma.$disconnect();
  });

  test("listagem retorna somente eventos do tenant solicitado", async () => {
    const logs = await listAuditLogsForTenant(tenantAId, 200);
    assert.ok(logs.some((log) => log.id === auditAId));
    assert.equal(logs.some((log) => log.id === auditBId), false);
    assert.ok(logs.every((log) => log.tenantId === tenantAId));
  });

  test("consulta por ID não atravessa tenants", async () => {
    assert.equal(
      await getAuditLogForTenant(tenantAId, auditBId),
      null,
    );
    assert.ok(await getAuditLogForTenant(tenantAId, auditAId));
  });
});
