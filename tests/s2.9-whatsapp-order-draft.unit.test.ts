import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { SelectionType } from "@prisma/client";

import {
  advanceWhatsAppOrderDraft,
  createWhatsAppOrderDraft,
  parseWhatsAppOrderDraft,
  type WhatsAppCatalogProduct,
} from "../lib/whatsapp/order-draft";

const catalog: WhatsAppCatalogProduct[] = [{
  id: "product-a",
  name: "Marmitex do Dia",
  basePrice: "25.90",
  optionGroups: [
    {
      id: "group-a",
      name: "Mistura",
      selectionType: SelectionType.SINGLE,
      minSelections: 1,
      maxSelections: 1,
      required: true,
      options: [
        { id: "option-a", name: "Lombo", priceDelta: "0.00" },
        { id: "option-b", name: "Frango assado", priceDelta: "0.00" },
      ],
    },
    {
      id: "group-b",
      name: "Acompanhamento",
      selectionType: SelectionType.MULTIPLE,
      minSelections: 0,
      maxSelections: 2,
      required: false,
      options: [
        { id: "option-c", name: "Farofa", priceDelta: "0.00" },
        { id: "option-d", name: "Purê", priceDelta: "2.00" },
      ],
    },
  ],
}];

describe("S2.9 - rascunho de pedido no WhatsApp", () => {
  test("monta produto, quantidade e grupos de opções em sequência", () => {
    const started = createWhatsAppOrderDraft(catalog);
    const product = advanceWhatsAppOrderDraft(started.draft, "1", catalog);
    const quantity = advanceWhatsAppOrderDraft(product.draft, "2", catalog);
    const mixture = advanceWhatsAppOrderDraft(quantity.draft, "2", catalog);
    const side = advanceWhatsAppOrderDraft(mixture.draft, "1, 2", catalog);

    assert.equal(side.draft.stage, "CONFIRM");
    assert.deepEqual(side.draft.item, {
      productId: "product-a",
      productName: "Marmitex do Dia",
      quantity: 2,
      optionIds: ["option-b", "option-c", "option-d"],
      optionNames: ["Frango assado", "Farofa", "Purê"],
    });
    assert.match(side.reply, /2x Marmitex do Dia/);
  });

  test("rejeita quantidade e seleção acima do limite", () => {
    const product = advanceWhatsAppOrderDraft(createWhatsAppOrderDraft(catalog).draft, "Marmitex", catalog);
    assert.match(advanceWhatsAppOrderDraft(product.draft, "0", catalog).reply, /quantidade válida/);

    const quantity = advanceWhatsAppOrderDraft(product.draft, "1", catalog);
    assert.match(advanceWhatsAppOrderDraft(quantity.draft, "1, 2", catalog).reply, /Seleção inválida/);
  });

  test("aceita nenhum em grupo opcional e recupera JSON válido", () => {
    const product = advanceWhatsAppOrderDraft(createWhatsAppOrderDraft(catalog).draft, "1", catalog);
    const quantity = advanceWhatsAppOrderDraft(product.draft, "1", catalog);
    const mixture = advanceWhatsAppOrderDraft(quantity.draft, "1", catalog);
    const completed = advanceWhatsAppOrderDraft(mixture.draft, "nenhum", catalog);

    assert.equal(completed.draft.stage, "CONFIRM");
    assert.equal(parseWhatsAppOrderDraft(completed.draft), completed.draft);
    assert.equal(parseWhatsAppOrderDraft({ invalid: true }), null);
  });
});
