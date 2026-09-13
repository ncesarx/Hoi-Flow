import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { OrderNotificationEvent, OrderStatus } from "@prisma/client";

import { normalizeWhatsAppPhone } from "../lib/notifications/phone";
import { orderStatusNotificationEvent } from "../lib/orders/domain";

describe("S2.4 - notificações de pedido", () => {
  test("normaliza telefone brasileiro para o formato do WhatsApp", () => {
    assert.deepEqual(normalizeWhatsAppPhone("(12) 99999-8877"), {
      valid: true,
      value: "5512999998877",
    });
    assert.deepEqual(normalizeWhatsAppPhone("5512999998877"), {
      valid: true,
      value: "5512999998877",
    });
    assert.deepEqual(normalizeWhatsAppPhone("123"), { valid: false });
  });

  test("mapeia os marcos operacionais para eventos da outbox", () => {
    assert.equal(orderStatusNotificationEvent(OrderStatus.NEW), null);
    assert.equal(
      orderStatusNotificationEvent(OrderStatus.PREPARING),
      OrderNotificationEvent.ORDER_PREPARING,
    );
    assert.equal(
      orderStatusNotificationEvent(OrderStatus.READY),
      OrderNotificationEvent.ORDER_READY,
    );
    assert.equal(
      orderStatusNotificationEvent(OrderStatus.COMPLETED),
      OrderNotificationEvent.ORDER_COMPLETED,
    );
    assert.equal(
      orderStatusNotificationEvent(OrderStatus.CANCELLED),
      OrderNotificationEvent.ORDER_CANCELLED,
    );
  });
});
