import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  AuditActions,
  AuditEntityTypes,
} from "../lib/audit/actions";
import { buildOptionGroupAuditSnapshot } from "../lib/audit/option-group-snapshot";
import {
  buildProductOptionGroupAuditSnapshot,
  productOptionGroupEntityId,
} from "../lib/audit/product-option-group-snapshot";

describe("S1.12E - contratos de auditoria do catálogo", () => {
  test("expõe ações e snapshots de OptionGroup", () => {
    assert.deepEqual(
      [
        AuditActions.OPTION_GROUP_CREATED,
        AuditActions.OPTION_GROUP_UPDATED,
      ],
      ["OPTION_GROUP_CREATED", "OPTION_GROUP_UPDATED"],
    );
    assert.equal(AuditEntityTypes.OPTION_GROUP, "OptionGroup");
    assert.deepEqual(
      buildOptionGroupAuditSnapshot({
        name: "Mistura",
        slug: "mistura",
        selectionType: "SINGLE",
        minSelections: 1,
        maxSelections: 1,
        required: true,
        position: 1,
        active: true,
      }),
      {
        name: "Mistura",
        slug: "mistura",
        selectionType: "SINGLE",
        minSelections: 1,
        maxSelections: 1,
        required: true,
        position: 1,
        active: true,
      },
    );
  });

  test("usa identidade composta estável nos vínculos", () => {
    const relation = {
      productId: "product-a",
      optionGroupId: "group-a",
      position: 2,
    };
    assert.deepEqual(
      [
        AuditActions.PRODUCT_OPTION_GROUP_ATTACHED,
        AuditActions.PRODUCT_OPTION_GROUP_DETACHED,
      ],
      [
        "PRODUCT_OPTION_GROUP_ATTACHED",
        "PRODUCT_OPTION_GROUP_DETACHED",
      ],
    );
    assert.equal(
      AuditEntityTypes.PRODUCT_OPTION_GROUP,
      "ProductOptionGroup",
    );
    assert.equal(
      productOptionGroupEntityId(relation),
      "product-a:group-a",
    );
    assert.deepEqual(
      buildProductOptionGroupAuditSnapshot(relation),
      relation,
    );
  });
});
