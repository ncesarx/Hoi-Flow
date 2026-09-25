import { OrderStatus, WhatsAppIntent } from "@prisma/client";

export type WhatsAppMenuProduct = {
  name: string;
  price: string | null;
};

export type WhatsAppOrderSummary = {
  code: string;
  status: OrderStatus;
} | null;

const orderStatusLabel: Record<OrderStatus, string> = {
  NEW: "recebido",
  PREPARING: "em preparo",
  READY: "pronto",
  COMPLETED: "concluído",
  CANCELLED: "cancelado",
};

function formatPrice(value: string | null) {
  if (value === null) return "valor sob consulta";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
}

export function buildWhatsAppReply(input: {
  intent: WhatsAppIntent;
  tenantName: string;
  products?: WhatsAppMenuProduct[];
  latestOrder?: WhatsAppOrderSummary;
}) {
  switch (input.intent) {
    case WhatsAppIntent.START:
      return `Olá! Você está falando com ${input.tenantName}. Envie *cardápio* para ver as opções, *pedido* para começar ou *status* para acompanhar seu pedido.`;
    case WhatsAppIntent.MENU: {
      const products = input.products ?? [];
      if (products.length === 0) {
        return `O cardápio de ${input.tenantName} está indisponível no momento. Envie *ajuda* para falar com a equipe.`;
      }
      const lines = products.map((product, index) => `${index + 1}. ${product.name} — ${formatPrice(product.price)}`);
      return `*Cardápio — ${input.tenantName}*\n${lines.join("\n")}\n\nEnvie o nome do item que deseja pedir.`;
    }
    case WhatsAppIntent.ORDER:
      return "Vamos montar seu pedido. Envie o nome do item desejado ou escreva *cardápio* para consultar as opções.";
    case WhatsAppIntent.STATUS:
      return input.latestOrder
        ? `Seu pedido *${input.latestOrder.code}* está ${orderStatusLabel[input.latestOrder.status]}.`
        : "Não encontrei um pedido recente para este número. Envie *ajuda* para falar com a equipe.";
    case WhatsAppIntent.HELP:
      return "Certo, encaminhei a conversa para a equipe. Um atendente continuará por aqui.";
    case WhatsAppIntent.CANCEL:
      return "Para cancelar com segurança, envie o código do pedido ou escreva *ajuda* para falar com a equipe.";
    case WhatsAppIntent.UNKNOWN:
      return "Não consegui entender. Envie *cardápio*, *pedido*, *status* ou *ajuda*.";
  }
}
