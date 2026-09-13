import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { OrderNotificationEvent } from "@prisma/client";

import { buildOrderNotificationMessage } from "../lib/notifications/messages";
import { notificationRetryDelay } from "../lib/notifications/provider";

describe("S2.5 - processador de notificações", () => {
  test("compõe mensagens operacionais sem dados internos", () => {
    assert.equal(
      buildOrderNotificationMessage(OrderNotificationEvent.ORDER_READY, { code: "HF-123", customerName: "Ana" }),
      "Olá, Ana! O pedido HF-123 está pronto!",
    );
  });

  test("aplica backoff exponencial limitado a uma hora", () => {
    assert.equal(notificationRetryDelay(1), 30_000);
    assert.equal(notificationRetryDelay(2), 60_000);
    assert.equal(notificationRetryDelay(20), 3_600_000);
  });
});
