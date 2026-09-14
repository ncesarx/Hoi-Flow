import { WhatsAppIntent } from "@prisma/client";

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function classifyWhatsAppIntent(text: string) {
  const value = normalize(text);
  if (/^(oi|ola|bom dia|boa tarde|boa noite|iniciar|comecar)\b/.test(value)) return WhatsAppIntent.START;
  if (/\b(cardapio|menu|opcoes|produtos)\b/.test(value)) return WhatsAppIntent.MENU;
  if (/\b(status|acompanhar|onde esta|meu pedido)\b/.test(value)) return WhatsAppIntent.STATUS;
  if (/\b(cancelar|cancela|desistir)\b/.test(value)) return WhatsAppIntent.CANCEL;
  if (/\b(ajuda|atendente|humano|falar com)\b/.test(value)) return WhatsAppIntent.HELP;
  if (/\b(quero|pedido|pedir|marmitex|lanche|bebida)\b/.test(value)) return WhatsAppIntent.ORDER;
  return WhatsAppIntent.UNKNOWN;
}
