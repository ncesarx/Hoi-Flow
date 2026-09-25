import type { Prisma, SelectionType } from "@prisma/client";

export type WhatsAppCatalogOption = {
  id: string;
  name: string;
  priceDelta: string;
};

export type WhatsAppCatalogGroup = {
  id: string;
  name: string;
  selectionType: SelectionType;
  minSelections: number;
  maxSelections: number;
  required: boolean;
  options: WhatsAppCatalogOption[];
};

export type WhatsAppCatalogProduct = {
  id: string;
  name: string;
  basePrice: string;
  optionGroups: WhatsAppCatalogGroup[];
};

type DraftItem = {
  productId: string;
  productName: string;
  quantity: number;
  optionIds: string[];
  optionNames: string[];
};

export type WhatsAppOrderDraft = {
  version: 1;
  stage: "SELECT_PRODUCT" | "QUANTITY" | "OPTION_GROUP" | "CONFIRM";
  item?: DraftItem;
  productId?: string;
  optionGroupIndex?: number;
};

export type DraftAdvanceResult = {
  draft: WhatsAppOrderDraft;
  reply: string;
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function money(value: string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
}

function productList(products: WhatsAppCatalogProduct[]) {
  return products.map((product, index) => `${index + 1}. ${product.name} — ${money(product.basePrice)}`).join("\n");
}

function optionPrompt(group: WhatsAppCatalogGroup) {
  const options = group.options.map((option, index) => {
    const delta = Number(option.priceDelta);
    return `${index + 1}. ${option.name}${delta ? ` (+${money(option.priceDelta)})` : ""}`;
  });
  const instruction = group.selectionType === "SINGLE"
    ? "Responda com o número da opção."
    : `Responda com os números separados por vírgula${group.required ? "" : " ou *nenhum*"}.`;
  return `*${group.name}*\n${options.join("\n")}\n${instruction}`;
}

function confirmation(item: DraftItem) {
  const options = item.optionNames.length ? `\nOpções: ${item.optionNames.join(", ")}` : "";
  return `Item montado:\n*${item.quantity}x ${item.productName}*${options}\n\nEnvie *ajuda* para concluir com a equipe ou *cancelar* para desistir.`;
}

export function createWhatsAppOrderDraft(products: WhatsAppCatalogProduct[]): DraftAdvanceResult {
  return {
    draft: { version: 1, stage: "SELECT_PRODUCT" },
    reply: products.length
      ? `Qual item você deseja?\n${productList(products)}\n\nResponda com o número ou nome do produto.`
      : "O cardápio está indisponível no momento. Envie *ajuda* para falar com a equipe.",
  };
}

export function parseWhatsAppOrderDraft(value: Prisma.JsonValue): WhatsAppOrderDraft | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const draft = value as Record<string, unknown>;
  if (draft.version !== 1 || !["SELECT_PRODUCT", "QUANTITY", "OPTION_GROUP", "CONFIRM"].includes(String(draft.stage))) {
    return null;
  }
  return draft as WhatsAppOrderDraft;
}

function selectedProduct(text: string, products: WhatsAppCatalogProduct[]) {
  const value = normalize(text);
  const index = /^\d+$/.test(value) ? Number(value) - 1 : -1;
  if (index >= 0 && index < products.length) return products[index];
  return products.find((product) => {
    const name = normalize(product.name);
    return value === name || value.includes(name) || name.includes(value);
  });
}

function selectedOptionIndexes(text: string, group: WhatsAppCatalogGroup) {
  const value = normalize(text);
  if (value === "nenhum" && !group.required && group.minSelections === 0) return [];
  if (!/^\d+(?:\s*,\s*\d+)*$/.test(value)) return null;
  const indexes = [...new Set(value.split(",").map((entry) => Number(entry.trim()) - 1))];
  if (indexes.some((index) => index < 0 || index >= group.options.length)) return null;
  if (indexes.length < group.minSelections || indexes.length > group.maxSelections) return null;
  if (group.selectionType === "SINGLE" && indexes.length !== 1) return null;
  return indexes;
}

export function advanceWhatsAppOrderDraft(
  draft: WhatsAppOrderDraft,
  text: string,
  products: WhatsAppCatalogProduct[],
): DraftAdvanceResult {
  if (draft.stage === "SELECT_PRODUCT") {
    const product = selectedProduct(text, products);
    if (!product) {
      return { draft, reply: `Não encontrei esse produto. Escolha uma opção:\n${productList(products)}` };
    }
    return {
      draft: { version: 1, stage: "QUANTITY", productId: product.id },
      reply: `Quantas unidades de *${product.name}* você deseja? Responda com um número de 1 a 20.`,
    };
  }

  const product = products.find((entry) => entry.id === (draft.item?.productId ?? draft.productId));
  if (!product) return createWhatsAppOrderDraft(products);

  if (draft.stage === "QUANTITY") {
    const quantity = Number(normalize(text));
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      return { draft, reply: "Informe uma quantidade válida de 1 a 20." };
    }
    const item: DraftItem = {
      productId: product.id,
      productName: product.name,
      quantity,
      optionIds: [],
      optionNames: [],
    };
    const firstGroup = product.optionGroups[0];
    return firstGroup
      ? {
          draft: { version: 1, stage: "OPTION_GROUP", item, optionGroupIndex: 0 },
          reply: optionPrompt(firstGroup),
        }
      : { draft: { version: 1, stage: "CONFIRM", item }, reply: confirmation(item) };
  }

  if (draft.stage === "OPTION_GROUP" && draft.item) {
    const groupIndex = draft.optionGroupIndex ?? 0;
    const group = product.optionGroups[groupIndex];
    if (!group) return { draft: { version: 1, stage: "CONFIRM", item: draft.item }, reply: confirmation(draft.item) };
    const indexes = selectedOptionIndexes(text, group);
    if (indexes === null) {
      return { draft, reply: `Seleção inválida. Escolha entre ${group.minSelections} e ${group.maxSelections} opção(ões).\n${optionPrompt(group)}` };
    }
    const selected = indexes.map((index) => group.options[index]);
    const item = {
      ...draft.item,
      optionIds: [...draft.item.optionIds, ...selected.map((option) => option.id)],
      optionNames: [...draft.item.optionNames, ...selected.map((option) => option.name)],
    };
    const nextGroup = product.optionGroups[groupIndex + 1];
    return nextGroup
      ? {
          draft: { version: 1, stage: "OPTION_GROUP", item, optionGroupIndex: groupIndex + 1 },
          reply: optionPrompt(nextGroup),
        }
      : { draft: { version: 1, stage: "CONFIRM", item }, reply: confirmation(item) };
  }

  return { draft, reply: confirmation(draft.item!) };
}
