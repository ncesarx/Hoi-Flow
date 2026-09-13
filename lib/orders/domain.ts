import { OrderStatus } from "@prisma/client";

const statusTransitions: Record<
  OrderStatus,
  readonly OrderStatus[]
> = {
  [OrderStatus.NEW]: [
    OrderStatus.PREPARING,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PREPARING]: [
    OrderStatus.READY,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.READY]: [
    OrderStatus.COMPLETED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};

export function canTransitionOrderStatus(
  current: OrderStatus,
  next: OrderStatus,
) {
  return statusTransitions[current].includes(next);
}

export function nextKitchenOrderStatus(status: OrderStatus) {
  switch (status) {
    case OrderStatus.NEW:
      return OrderStatus.PREPARING;
    case OrderStatus.PREPARING:
      return OrderStatus.READY;
    case OrderStatus.READY:
      return OrderStatus.COMPLETED;
    default:
      return null;
  }
}

export function orderStatusTimestamps(
  status: OrderStatus,
  now: Date,
) {
  switch (status) {
    case OrderStatus.READY:
      return { readyAt: now };
    case OrderStatus.COMPLETED:
      return { completedAt: now };
    case OrderStatus.CANCELLED:
      return { cancelledAt: now };
    default:
      return {};
  }
}

function amountToCents(value: string) {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) {
    throw new Error("Valor monetário inválido.");
  }

  const cents =
    Number(match[2]) * 100 +
    Number((match[3] ?? "").padEnd(2, "0"));
  return match[1] === "-" ? -cents : cents;
}

function centsToAmount(cents: number) {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  return `${sign}${Math.floor(absolute / 100)}.${String(
    absolute % 100,
  ).padStart(2, "0")}`;
}

export function calculateOrderItemSubtotal(
  basePrice: string,
  optionDeltas: readonly string[],
  quantity: number,
) {
  const unitPriceInCents = optionDeltas.reduce(
    (total, delta) => total + amountToCents(delta),
    amountToCents(basePrice),
  );

  return {
    unitPrice: centsToAmount(unitPriceInCents),
    subtotal: centsToAmount(unitPriceInCents * quantity),
  };
}

export function sumMoney(values: readonly string[]) {
  return centsToAmount(
    values.reduce((total, value) => total + amountToCents(value), 0),
  );
}
