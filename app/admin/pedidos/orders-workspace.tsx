"use client";

import { useState } from "react";

import { KitchenBoard, type KitchenOrder } from "./kitchen-board";
import { OrderComposer, type OrderProduct } from "./order-composer";

type OrdersWorkspaceProps = {
  canWrite: boolean;
  initialOrders: KitchenOrder[];
  products: OrderProduct[];
};

export function OrdersWorkspace(props: OrdersWorkspaceProps) {
  const [view, setView] = useState<"kitchen" | "new">("kitchen");
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="hf-orders-workspace">
      <div className="hf-orders-tabs" role="tablist" aria-label="Pedidos">
        <button className={view === "kitchen" ? "is-active" : ""} onClick={() => setView("kitchen")} type="button">
          Cozinha
        </button>
        {props.canWrite && (
          <button className={view === "new" ? "is-active" : ""} onClick={() => setView("new")} type="button">
            Novo pedido
          </button>
        )}
      </div>

      {view === "kitchen" ? (
        <KitchenBoard key={refreshKey} canWrite={props.canWrite} initialOrders={props.initialOrders} />
      ) : (
        <OrderComposer
          products={props.products}
          onCreated={() => {
            setRefreshKey((value) => value + 1);
            setView("kitchen");
          }}
        />
      )}
    </div>
  );
}
