import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  AuditActions,
  AuditEntityTypes,
} from "../lib/audit/actions";
import { buildProductAuditSnapshot } from "../lib/audit/product-snapshot";

describe("S1.12D - contrato de auditoria de Product", () => {
  test("expõe as ações implementadas e o tipo de entidade", () => {
    assert.deepEqual(
      [
        AuditActions.PRODUCT_CREATED,
        AuditActions.PRODUCT_UPDATED,
      ],
      ["PRODUCT_CREATED", "PRODUCT_UPDATED"],
    );
    assert.equal(AuditEntityTypes.PRODUCT, "Product");
  });

  test("serializa preço e campos opcionais de forma estável", () => {
    assert.deepEqual(
      buildProductAuditSnapshot({
        categoryId: "category-a",
        name: "Marmitex do Dia",
        slug: "marmitex-do-dia",
        description: null,
        basePrice: {
          toFixed: () => "24.90",
        },
        status: "ACTIVE",
        imageUrl: null,
      }),
      {
        categoryId: "category-a",
        name: "Marmitex do Dia",
        slug: "marmitex-do-dia",
        description: null,
        basePrice: "24.90",
        status: "ACTIVE",
        imageUrl: null,
      },
    );
  });
});
