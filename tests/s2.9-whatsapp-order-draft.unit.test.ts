import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { SelectionType } from "@prisma/client";

import {
  advanceWhatsAppOrderDraft,
  createWhatsAppOrderDraft,
  getWhatsAppDraftItems,
  isWhatsAppDraftAddItem,
  isWhatsAppDraftConfirmation,
  parseWhatsAppOrderDraft,
  type WhatsAppCatalogProduct,
} from "../lib/whatsapp/order-draft";

const catalog: WhatsAppCatalogProduct[] = [
  {
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
  },
];

describe("S2.9 - rascunho de pedido no WhatsApp", () => {
  test("monta produto, quantidade e grupos de opções em sequência", () => {
    const started = createWhatsAppOrderDraft(catalog);
    const product = advanceWhatsAppOrderDraft(started.draft, "1", catalog);
    const quantity = advanceWhatsAppOrderDraft(product.draft, "2", catalog);
    const mixture = advanceWhatsAppOrderDraft(quantity.draft, "2", catalog);
    const side = advanceWhatsAppOrderDraft(mixture.draft, "1, 2", catalog);

    assert.equal(side.draft.stage, "CART");
    assert.deepEqual(getWhatsAppDraftItems(side.draft)[0], {
      productId: "product-a",
      productName: "Marmitex do Dia",
      quantity: 2,
      optionIds: ["option-b", "option-c", "option-d"],
      optionNames: ["Frango assado", "Farofa", "Purê"],
    });
    assert.match(side.reply, /2x Marmitex do Dia/);
  });

  test("rejeita quantidade e seleção acima do limite", () => {
    const product = advanceWhatsAppOrderDraft(
      createWhatsAppOrderDraft(catalog).draft,
      "Marmitex",
      catalog,
    );
    assert.match(
      advanceWhatsAppOrderDraft(product.draft, "0", catalog).reply,
      /quantidade válida/,
    );

    const quantity = advanceWhatsAppOrderDraft(product.draft, "1", catalog);
    assert.match(
      advanceWhatsAppOrderDraft(quantity.draft, "1, 2", catalog).reply,
      /Seleção inválida/,
    );
  });

  test("aceita nenhum em grupo opcional e recupera JSON válido", () => {
    const product = advanceWhatsAppOrderDraft(
      createWhatsAppOrderDraft(catalog).draft,
      "1",
      catalog,
    );
    const quantity = advanceWhatsAppOrderDraft(product.draft, "1", catalog);
    const mixture = advanceWhatsAppOrderDraft(quantity.draft, "1", catalog);
    const completed = advanceWhatsAppOrderDraft(
      mixture.draft,
      "nenhum",
      catalog,
    );

    assert.equal(completed.draft.stage, "CART");
    assert.equal(parseWhatsAppOrderDraft(completed.draft), completed.draft);
    assert.equal(parseWhatsAppOrderDraft({ invalid: true }), null);
  });

  test("reconhece confirmação explícita sem aceitar texto ambíguo", () => {
    assert.equal(isWhatsAppDraftConfirmation("Confirmar"), true);
    assert.equal(isWhatsAppDraftConfirmation("sim"), true);
    assert.equal(isWhatsAppDraftConfirmation("talvez"), false);
  });

  test("preserva o primeiro item ao adicionar um segundo produto", () => {
    const product = advanceWhatsAppOrderDraft(
      createWhatsAppOrderDraft(catalog).draft,
      "1",
      catalog,
    );
    const quantity = advanceWhatsAppOrderDraft(product.draft, "1", catalog);
    const mixture = advanceWhatsAppOrderDraft(quantity.draft, "1", catalog);
    const cart = advanceWhatsAppOrderDraft(mixture.draft, "nenhum", catalog);
    const adding = advanceWhatsAppOrderDraft(cart.draft, "adicionar", catalog);

    assert.equal(adding.draft.stage, "SELECT_PRODUCT");
    assert.equal(getWhatsAppDraftItems(adding.draft).length, 1);
    assert.equal(isWhatsAppDraftAddItem("outro item"), true);

    const secondProduct = advanceWhatsAppOrderDraft(adding.draft, "1", catalog);
    const secondQuantity = advanceWhatsAppOrderDraft(
      secondProduct.draft,
      "2",
      catalog,
    );
    const secondMixture = advanceWhatsAppOrderDraft(
      secondQuantity.draft,
      "2",
      catalog,
    );
    const completed = advanceWhatsAppOrderDraft(
      secondMixture.draft,
      "nenhum",
      catalog,
    );

    assert.equal(getWhatsAppDraftItems(completed.draft).length, 2);
    assert.deepEqual(
      getWhatsAppDraftItems(completed.draft).map((item) => item.quantity),
      [1, 2],
    );
  });

  test("mantém compatibilidade com rascunho versão 1", () => {
    const legacy = parseWhatsAppOrderDraft({
      version: 1,
      stage: "CONFIRM",
      item: {
        productId: "product-a",
        productName: "Marmitex do Dia",
        quantity: 1,
        optionIds: ["option-a"],
        optionNames: ["Lombo"],
      },
    });

    assert.ok(legacy);
    assert.equal(getWhatsAppDraftItems(legacy).length, 1);
  });
});
