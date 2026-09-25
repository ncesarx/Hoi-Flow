import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { RoleCode } from "@prisma/client";

import { AuditActions, AuditEntityTypes } from "../lib/audit/actions";
import { hasPermission, Permissions } from "../lib/auth/rbac";

describe("S2.14 - atendimento humano do WhatsApp", () => {
  test("permite operação para os papéis do restaurante", () => {
    assert.equal(
      hasPermission(RoleCode.OWNER, Permissions.WHATSAPP_WRITE),
      true,
    );
    assert.equal(
      hasPermission(RoleCode.MANAGER, Permissions.WHATSAPP_WRITE),
      true,
    );
    assert.equal(
      hasPermission(RoleCode.ATTENDANT, Permissions.WHATSAPP_WRITE),
      true,
    );
    assert.equal(
      hasPermission(RoleCode.SUPER_ADMIN, Permissions.WHATSAPP_READ),
      false,
    );
  });

  test("expõe contratos de auditoria da conversa", () => {
    assert.equal(AuditActions.WHATSAPP_MESSAGE_SENT, "WHATSAPP_MESSAGE_SENT");
    assert.equal(
      AuditActions.WHATSAPP_CONVERSATION_RESUMED,
      "WHATSAPP_CONVERSATION_RESUMED",
    );
    assert.equal(
      AuditEntityTypes.WHATSAPP_CONVERSATION,
      "WhatsAppConversation",
    );
  });
});
