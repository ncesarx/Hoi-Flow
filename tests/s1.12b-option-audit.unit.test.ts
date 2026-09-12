import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  AuditActions,
  AuditEntityTypes,
} from "../lib/audit/actions";
import { buildOptionAuditSnapshot } from "../lib/audit/option-snapshot";

describe("S1.12B - contrato de auditoria de Option", () => {
  test("expõe as três ações e o tipo de entidade esperados", () => {
    assert.deepEqual(
      [
        AuditActions.OPTION_CREATED,
        AuditActions.OPTION_UPDATED,
        AuditActions.OPTION_DELETED,
      ],
      [
        "OPTION_CREATED",
        "OPTION_UPDATED",
        "OPTION_DELETED",
      ],
    );
    assert.equal(AuditEntityTypes.OPTION, "Option");
  });

  test("normaliza o valor monetário e preserva os campos auditáveis", () => {
    const decimalPlaces: number[] = [];

    const snapshot = buildOptionAuditSnapshot({
      optionGroupId: "group-a",
      name: "Queijo extra",
      position: 3,
      active: false,
      priceDelta: {
        toFixed(places) {
          decimalPlaces.push(places);
          return "4.50";
        },
      },
    });

    assert.deepEqual(decimalPlaces, [2]);
    assert.deepEqual(snapshot, {
      optionGroupId: "group-a",
      name: "Queijo extra",
      position: 3,
      active: false,
      priceDelta: "4.50",
    });
  });
});
