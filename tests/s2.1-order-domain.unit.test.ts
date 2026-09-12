import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { OrderStatus } from "@prisma/client";

import {
  calculateOrderItemSubtotal,
  canTransitionOrderStatus,
  orderStatusTimestamps,
  sumMoney,
} from "../lib/orders/domain";

describe("S2.1 - domínio de pedidos", () => {
  test("calcula adicionais por unidade antes de multiplicar a quantidade", () => {
    assert.deepEqual(
      calculateOrderItemSubtotal("20.00", ["3.50", "1.50"], 2),
      { unitPrice: "25.00", subtotal: "50.00" },
    );
    assert.equal(sumMoney(["0.10", "0.20", "49.70"]), "50.00");
  });

  test("permite somente o fluxo operacional do MVP", () => {
    assert.equal(
      canTransitionOrderStatus(OrderStatus.NEW, OrderStatus.PREPARING),
      true,
    );
    assert.equal(
      canTransitionOrderStatus(OrderStatus.PREPARING, OrderStatus.READY),
      true,
    );
    assert.equal(
      canTransitionOrderStatus(OrderStatus.READY, OrderStatus.COMPLETED),
      true,
    );
    assert.equal(
      canTransitionOrderStatus(OrderStatus.NEW, OrderStatus.READY),
      false,
    );
    assert.equal(
      canTransitionOrderStatus(OrderStatus.COMPLETED, OrderStatus.NEW),
      false,
    );
  });

  test("registra timestamps somente nos marcos correspondentes", () => {
    const now = new Date("2026-09-12T22:00:00.000Z");
    assert.deepEqual(orderStatusTimestamps(OrderStatus.PREPARING, now), {});
    assert.deepEqual(orderStatusTimestamps(OrderStatus.READY, now), {
      readyAt: now,
    });
    assert.deepEqual(orderStatusTimestamps(OrderStatus.COMPLETED, now), {
      completedAt: now,
    });
    assert.deepEqual(orderStatusTimestamps(OrderStatus.CANCELLED, now), {
      cancelledAt: now,
    });
  });
});
