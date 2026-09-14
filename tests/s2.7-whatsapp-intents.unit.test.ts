import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { WhatsAppIntent } from "@prisma/client";

import { classifyWhatsAppIntent } from "../lib/whatsapp/intents";

describe("S2.7 - intenções do WhatsApp", () => {
  test("classifica comandos essenciais do MVP", () => {
    assert.equal(classifyWhatsAppIntent("Olá, boa noite"), WhatsAppIntent.START);
    assert.equal(classifyWhatsAppIntent("Quero ver o cardápio"), WhatsAppIntent.MENU);
    assert.equal(classifyWhatsAppIntent("Quero um marmitex"), WhatsAppIntent.ORDER);
    assert.equal(classifyWhatsAppIntent("Onde está meu pedido?"), WhatsAppIntent.STATUS);
    assert.equal(classifyWhatsAppIntent("Quero falar com atendente"), WhatsAppIntent.HELP);
    assert.equal(classifyWhatsAppIntent("Cancelar pedido"), WhatsAppIntent.CANCEL);
    assert.equal(classifyWhatsAppIntent("xyz"), WhatsAppIntent.UNKNOWN);
  });
});
