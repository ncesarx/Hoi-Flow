import { hasPermission, Permissions } from "@/lib/auth/rbac";
import {
  listKitchenOrdersForTenant,
  listOrderCatalogForTenant,
} from "@/lib/data/orders";
import { requireTenantPermission } from "@/lib/tenant/authorized-context";

import { OrdersWorkspace } from "./orders-workspace";

export default async function OrdersPage() {
  const context = await requireTenantPermission(Permissions.ORDER_READ);
  const [orders, products] = await Promise.all([
    listKitchenOrdersForTenant(context.tenantId),
    listOrderCatalogForTenant(context.tenantId),
  ]);
  const canWrite = hasPermission(context.role, Permissions.ORDER_WRITE);

  return (
    <div className="hf-page hf-kds-page">
      <section className="hf-page-heading">
        <div>
          <span className="hf-eyebrow">Operação em tempo real</span>
          <h1>Pedidos da cozinha</h1>
          <p>
            Acompanhe o preparo de {context.tenant.name} e avance cada pedido
            conforme ele percorre a cozinha.
          </p>
        </div>

        <span className="hf-live-chip">
          <i /> Atualização automática
        </span>
      </section>

      <OrdersWorkspace
        canWrite={canWrite}
        initialOrders={orders.map((order) => ({
          id: order.id,
          code: order.code,
          status: order.status,
          channel: order.channel,
          customerName: order.customerName,
          notes: order.notes,
          total: order.total.toFixed(2),
          createdAt: order.createdAt.toISOString(),
          items: order.items.map((item) => ({
            id: item.id,
            productName: item.productName,
            quantity: item.quantity,
            notes: item.notes,
            options: item.options.map((option) => ({
              id: option.id,
              optionName: option.optionName,
            })),
          })),
        }))}
        products={products.map((product) => ({
          id: product.id,
          name: product.name,
          description: product.description,
          categoryName: product.category?.name ?? "Sem categoria",
          basePrice: product.basePrice!.toFixed(2),
          groups: product.optionGroups.map(({ optionGroup }) => ({
            id: optionGroup.id,
            name: optionGroup.name,
            selectionType: optionGroup.selectionType,
            required: optionGroup.required,
            minSelections: optionGroup.minSelections,
            maxSelections: optionGroup.maxSelections,
            options: optionGroup.options.map((option) => ({
              id: option.id,
              name: option.name,
              priceDelta: option.priceDelta.toFixed(2),
            })),
          })),
        }))}
      />
    </div>
  );
}
