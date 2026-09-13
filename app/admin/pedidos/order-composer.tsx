"use client";

import { useMemo, useState } from "react";

export type OrderProduct = {
  id: string;
  name: string;
  description: string | null;
  categoryName: string;
  basePrice: string;
  groups: Array<{
    id: string;
    name: string;
    selectionType: "SINGLE" | "MULTIPLE";
    required: boolean;
    minSelections: number;
    maxSelections: number;
    options: Array<{ id: string; name: string; priceDelta: string }>;
  }>;
};

type CartItem = {
  key: string;
  product: OrderProduct;
  quantity: number;
  optionIds: string[];
  notes: string;
};

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function OrderComposer({ products, onCreated }: { products: OrderProduct[]; onCreated: () => void }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const total = useMemo(() => items.reduce((sum, item) => {
    const additions = item.product.groups.flatMap((group) => group.options)
      .filter((option) => item.optionIds.includes(option.id))
      .reduce((value, option) => value + Number(option.priceDelta), 0);
    return sum + (Number(item.product.basePrice) + additions) * item.quantity;
  }, 0), [items]);

  function updateItem(key: string, change: (item: CartItem) => CartItem) {
    setItems((current) => current.map((item) => item.key === key ? change(item) : item));
  }

  function toggleOption(item: CartItem, group: OrderProduct["groups"][number], optionId: string) {
    updateItem(item.key, (current) => {
      const groupIds = group.options.map((option) => option.id);
      if (group.selectionType === "SINGLE") {
        return { ...current, optionIds: [...current.optionIds.filter((id) => !groupIds.includes(id)), optionId] };
      }
      const selected = current.optionIds.includes(optionId);
      if (!selected && current.optionIds.filter((id) => groupIds.includes(id)).length >= group.maxSelections) return current;
      return { ...current, optionIds: selected ? current.optionIds.filter((id) => id !== optionId) : [...current.optionIds, optionId] };
    });
  }

  async function submit() {
    setMessage(null);
    if (items.length === 0) return setMessage("Adicione pelo menos um produto.");
    setSaving(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          notes,
          items: items.map((item) => ({ productId: item.product.id, quantity: item.quantity, optionIds: item.optionIds, notes: item.notes })),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Não foi possível criar o pedido.");
      onCreated();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível criar o pedido.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="hf-order-composer">
      <section className="hf-order-products">
        <header><h2>Cardápio</h2><span>{products.length} produtos disponíveis</span></header>
        <div>
          {products.map((product) => (
            <article key={product.id}>
              <small>{product.categoryName}</small><strong>{product.name}</strong>
              {product.description && <p>{product.description}</p>}
              <footer><b>{money(Number(product.basePrice))}</b><button type="button" onClick={() => setItems((current) => [...current, { key: crypto.randomUUID(), product, quantity: 1, optionIds: [], notes: "" }])}>Adicionar</button></footer>
            </article>
          ))}
        </div>
      </section>

      <section className="hf-order-cart">
        <header><h2>Pedido</h2><strong>{money(total)}</strong></header>
        <label>Cliente<input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Nome do cliente (opcional)" /></label>
        {items.length === 0 && <div className="hf-cart-empty">Selecione os produtos no cardápio.</div>}
        {items.map((item) => (
          <article key={item.key} className="hf-cart-item">
            <header><strong>{item.product.name}</strong><button type="button" onClick={() => setItems((current) => current.filter(({ key }) => key !== item.key))}>Remover</button></header>
            <div className="hf-quantity"><button type="button" onClick={() => updateItem(item.key, (current) => ({ ...current, quantity: Math.max(1, current.quantity - 1) }))}>−</button><span>{item.quantity}</span><button type="button" onClick={() => updateItem(item.key, (current) => ({ ...current, quantity: current.quantity + 1 }))}>+</button></div>
            {item.product.groups.map((group) => (
              <fieldset key={group.id}><legend>{group.name} {group.required && <em>obrigatório</em>}</legend>
                {group.options.map((option) => <label key={option.id}><input type={group.selectionType === "SINGLE" ? "radio" : "checkbox"} name={`${item.key}-${group.id}`} checked={item.optionIds.includes(option.id)} onChange={() => toggleOption(item, group, option.id)} /> <span>{option.name}</span>{Number(option.priceDelta) !== 0 && <small>+ {money(Number(option.priceDelta))}</small>}</label>)}
              </fieldset>
            ))}
            <input value={item.notes} onChange={(event) => updateItem(item.key, (current) => ({ ...current, notes: event.target.value }))} placeholder="Observação deste item" />
          </article>
        ))}
        <label>Observações gerais<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} /></label>
        {message && <p className="hf-kds-message" role="status">{message}</p>}
        <button className="hf-confirm-order" type="button" disabled={saving || items.length === 0} onClick={submit}>{saving ? "Confirmando…" : `Confirmar pedido · ${money(total)}`}</button>
      </section>
    </div>
  );
}
