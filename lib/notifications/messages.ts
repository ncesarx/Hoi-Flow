import { OrderNotificationEvent, type Prisma } from "@prisma/client";

type NotificationPayload = {
  code?: unknown;
  customerName?: unknown;
  total?: unknown;
};

function payloadValue(payload: Prisma.JsonValue): NotificationPayload {
  return payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload as NotificationPayload
    : {};
}

export function buildOrderNotificationMessage(
  event: OrderNotificationEvent,
  payload: Prisma.JsonValue,
) {
  const values = payloadValue(payload);
  const code = typeof values.code === "string" ? values.code : "seu pedido";
  const greeting = typeof values.customerName === "string" && values.customerName
    ? `Olá, ${values.customerName}! `
    : "Olá! ";

  switch (event) {
    case OrderNotificationEvent.ORDER_CONFIRMED:
      return `${greeting}O pedido ${code} foi confirmado e enviado para a cozinha.`;
    case OrderNotificationEvent.ORDER_PREPARING:
      return `${greeting}O pedido ${code} já está em preparo.`;
    case OrderNotificationEvent.ORDER_READY:
      return `${greeting}O pedido ${code} está pronto!`;
    case OrderNotificationEvent.ORDER_COMPLETED:
      return `${greeting}O pedido ${code} foi concluído. Obrigado pela preferência!`;
    case OrderNotificationEvent.ORDER_CANCELLED:
      return `${greeting}O pedido ${code} foi cancelado. Entre em contato conosco se precisar de ajuda.`;
  }
}
