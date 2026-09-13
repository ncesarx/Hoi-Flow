"use client";

import { OrderStatus } from "@prisma/client";
import { useCallback, useEffect, useMemo, useState } from "react";

type KitchenOrder = {
  id: string;
  code: string;
  status: OrderStatus;
  channel: string;
  customerName: string | null;
  notes: string | null;
  total: string;
  createdAt: string;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    notes: string | null;
    options: Array<{ id: string; optionName: string }>;
  }>;
};

type KitchenBoardProps = {
  canWrite: boolean;
  initialOrders: KitchenOrder[];
};

const columns = [
  { status: OrderStatus.NEW, title: "Novos", action: "Iniciar preparo" },
  {
    status: OrderStatus.PREPARING,
    title: "Em preparo",
    action: "Marcar pronto",
  },
  { status: OrderStatus.READY, title: "Prontos", action: "Concluir pedido" },
] as const;

const nextStatus: Record<(typeof columns)[number]["status"], OrderStatus> = {
  [OrderStatus.NEW]: OrderStatus.PREPARING,
  [OrderStatus.PREPARING]: OrderStatus.READY,
  [OrderStatus.READY]: OrderStatus.COMPLETED,
};

function normalizeOrder(order: KitchenOrder): KitchenOrder {
  return {
    ...order,
    total: String(order.total),
    createdAt: String(order.createdAt),
  };
}

function elapsedTime(createdAt: string, now: number) {
  const minutes = Math.max(
    0,
    Math.floor((now - new Date(createdAt).getTime()) / 60000),
  );
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}min`;
}

export function KitchenBoard({ canWrite, initialOrders }: KitchenBoardProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/orders", { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      const active = (payload.data as KitchenOrder[])
        .map(normalizeOrder)
        .filter((order) =>
          columns.some((column) => column.status === order.status),
        );
      setOrders(active);
      setMessage(null);
    } catch {
      setMessage("Não foi possível atualizar o painel agora.");
    }
  }, []);

  useEffect(() => {
    const refreshTimer = window.setInterval(refresh, 10000);
    const clockTimer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => {
      window.clearInterval(refreshTimer);
      window.clearInterval(clockTimer);
    };
  }, [refresh]);

  const orderCount = useMemo(() => orders.length, [orders]);

  async function advance(order: KitchenOrder) {
    if (!canWrite || pendingId) return;
    setPendingId(order.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus[order.status as keyof typeof nextStatus],
        }),
      });
      if (!response.ok) throw new Error();
      await refresh();
    } catch {
      setMessage(
        "O status não foi alterado. Atualize o painel e tente novamente.",
      );
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className="hf-kds" aria-label="Painel de pedidos da cozinha">
      <div className="hf-kds-toolbar">
        <strong>
          {orderCount} {orderCount === 1 ? "pedido ativo" : "pedidos ativos"}
        </strong>
        <button type="button" onClick={refresh}>
          Atualizar agora
        </button>
      </div>

      {message && (
        <p className="hf-kds-message" role="status">
          {message}
        </p>
      )}

      <div className="hf-kds-grid">
        {columns.map((column) => {
          const columnOrders = orders.filter(
            (order) => order.status === column.status,
          );
          return (
            <section
              className={`hf-kds-column is-${column.status.toLowerCase()}`}
              key={column.status}
            >
              <header>
                <div>
                  <span /> <h2>{column.title}</h2>
                </div>
                <strong>{columnOrders.length}</strong>
              </header>

              <div className="hf-kds-cards">
                {columnOrders.length === 0 && (
                  <div className="hf-kds-empty">Nenhum pedido nesta etapa.</div>
                )}
                {columnOrders.map((order) => (
                  <article className="hf-order-card" key={order.id}>
                    <div className="hf-order-card-head">
                      <div>
                        <strong>{order.code}</strong>
                        <span>
                          {order.customerName || "Cliente não informado"}
                        </span>
                      </div>
                      <time dateTime={order.createdAt}>
                        {elapsedTime(order.createdAt, now)}
                      </time>
                    </div>

                    <ul>
                      {order.items.map((item) => (
                        <li key={item.id}>
                          <div>
                            <b>{item.quantity}×</b>
                            <strong>{item.productName}</strong>
                          </div>
                          {item.options.length > 0 && (
                            <small>
                              {item.options
                                .map((option) => option.optionName)
                                .join(" · ")}
                            </small>
                          )}
                          {item.notes && <em>{item.notes}</em>}
                        </li>
                      ))}
                    </ul>

                    {order.notes && (
                      <p className="hf-order-note">Observação: {order.notes}</p>
                    )}

                    <footer>
                      <span>
                        {order.channel === "WHATSAPP" ? "WhatsApp" : "Manual"} ·
                        R$ {order.total.replace(".", ",")}
                      </span>
                      <button
                        type="button"
                        disabled={!canWrite || pendingId !== null}
                        onClick={() => advance(order)}
                      >
                        {pendingId === order.id
                          ? "Atualizando…"
                          : column.action}
                      </button>
                    </footer>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
