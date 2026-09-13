import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { OrderStatus } from "@prisma/client";

import { nextKitchenOrderStatus } from "../lib/orders/domain";

describe("S2.2 - painel da cozinha", () => {
  test("define o próximo status operacional exibido no KDS", () => {
    assert.equal(
      nextKitchenOrderStatus(OrderStatus.NEW),
      OrderStatus.PREPARING,
    );
    assert.equal(
      nextKitchenOrderStatus(OrderStatus.PREPARING),
      OrderStatus.READY,
    );
    assert.equal(
      nextKitchenOrderStatus(OrderStatus.READY),
      OrderStatus.COMPLETED,
    );
    assert.equal(nextKitchenOrderStatus(OrderStatus.COMPLETED), null);
    assert.equal(nextKitchenOrderStatus(OrderStatus.CANCELLED), null);
  });
});
