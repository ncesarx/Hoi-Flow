import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  AuditActions,
  AuditEntityTypes,
} from "../lib/audit/actions";
import { buildCategoryAuditSnapshot } from "../lib/audit/category-snapshot";

describe("S1.12C - contrato de auditoria de Category", () => {
  test("expõe as três ações e o tipo de entidade esperados", () => {
    assert.deepEqual(
      [
        AuditActions.CATEGORY_CREATED,
        AuditActions.CATEGORY_UPDATED,
        AuditActions.CATEGORY_DELETED,
      ],
      [
        "CATEGORY_CREATED",
        "CATEGORY_UPDATED",
        "CATEGORY_DELETED",
      ],
    );
    assert.equal(AuditEntityTypes.CATEGORY, "Category");
  });

  test("preserva somente os campos auditáveis da categoria", () => {
    assert.deepEqual(
      buildCategoryAuditSnapshot({
        name: "Refeições",
        slug: "refeicoes",
        position: 1,
        active: true,
      }),
      {
        name: "Refeições",
        slug: "refeicoes",
        position: 1,
        active: true,
      },
    );
  });
});
