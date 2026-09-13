import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, test } from "node:test";

import { parseMetaWebhookMessages, verifyMetaWebhookSignature } from "../lib/whatsapp/webhook";

describe("S2.6 - webhook WhatsApp", () => {
  test("valida a assinatura do corpo bruto", () => {
    const body = '{"object":"whatsapp_business_account"}';
    const signature = `sha256=${createHmac("sha256", "secret").update(body).digest("hex")}`;
    assert.equal(verifyMetaWebhookSignature(body, signature, "secret"), true);
    assert.equal(verifyMetaWebhookSignature(`${body} `, signature, "secret"), false);
  });

  test("extrai mensagens de texto e preserva o ID externo", () => {
    const messages = parseMetaWebhookMessages({ entry: [{ changes: [{ value: {
      metadata: { phone_number_id: "phone-1" },
      messages: [{ id: "wamid.1", from: "5512999998877", type: "text", timestamp: "1789260000", text: { body: "Quero um marmitex" } }],
    } }] }] });
    assert.equal(messages.length, 1);
    assert.equal(messages[0]?.externalMessageId, "wamid.1");
    assert.equal(messages[0]?.type, "TEXT");
    assert.equal(messages[0]?.text, "Quero um marmitex");
  });
});
