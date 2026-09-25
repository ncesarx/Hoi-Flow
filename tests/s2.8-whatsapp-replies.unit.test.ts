import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { OrderStatus, WhatsAppIntent } from "@prisma/client";

import { buildWhatsAppReply } from "../lib/whatsapp/replies";

describe("S2.8 - respostas automáticas do WhatsApp", () => {
  test("apresenta somente os produtos fornecidos pelo tenant", () => {
    const reply = buildWhatsAppReply({
      intent: WhatsAppIntent.MENU,
      tenantName: "Restaurante Xero Verde",
      products: [{ name: "Marmitex", price: "25.90" }],
    });

    assert.match(reply, /Restaurante Xero Verde/);
    assert.match(reply, /Marmitex/);
    assert.match(reply, /R\$\s*25,90/);
  });

  test("informa o último status sem expor dados internos", () => {
    assert.equal(
      buildWhatsAppReply({
        intent: WhatsAppIntent.STATUS,
        tenantName: "Restaurante Xero Verde",
        latestOrder: { code: "HF-123", status: OrderStatus.PREPARING },
      }),
      "Seu pedido *HF-123* está em preparo.",
    );
  });

  test("encaminha pedido de ajuda para atendimento humano", () => {
    assert.match(
      buildWhatsAppReply({ intent: WhatsAppIntent.HELP, tenantName: "Restaurante Xero Verde" }),
      /encaminhei a conversa/,
    );
  });
});
