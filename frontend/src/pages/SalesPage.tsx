import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { Customer, PaymentMethod, Product, Sale } from "@/lib/types";
import { PAYMENT_METHOD_LABELS } from "@/lib/types";
import { ProductSearch } from "@/components/ProductSearch";
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
  Select,
  Spinner,
} from "@/components/ui";
import { formatCurrency, formatDateTime } from "@/lib/format";

type DraftItem = {
  key: string;
  productId: number;
  description: string;
  quantity: number;
  unitPrice: number;
};

export function SalesPage() {
  const { data: sales, loading, error, reload } = useFetch(() => api.get<Sale[]>("/sales"), []);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [saving, setSaving] = useState(false);
  const [error2, setError2] = useState<string | null>(null);

  async function searchCustomers(term: string) {
    setCustomerSearch(term);
    if (term.trim().length < 2) {
      setCustomerResults([]);
      return;
    }
    setCustomerResults(await api.get<Customer[]>("/customers", { search: term }));
  }

  function addItem(product: Product) {
    setItems((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        productId: product.id,
        description: product.description,
        quantity: 1,
        unitPrice: Number(product.salePrice),
      },
    ]);
  }

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  const total = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError2(null);
    if (items.length === 0) {
      setError2("Agrega al menos un producto");
      return;
    }
    setSaving(true);
    try {
      await api.post("/sales", {
        customerId: customer?.id,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
        paymentMethod,
      });
      setItems([]);
      setCustomer(null);
      reload();
    } catch (err) {
      setError2(err instanceof ApiError ? err.message : "No se pudo registrar la venta");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel(saleId: number) {
    try {
      await api.post(`/sales/${saleId}/cancel`);
      reload();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo cancelar la venta");
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Ventas</h1>
        <p className="text-sm text-ink-muted">Venta rápida de repuestos y accesorios de mostrador</p>
      </div>

      <Card>
        <CardHeader title="Nueva venta" />
        <form onSubmit={handleSubmit} className="space-y-3 p-4">
          {error2 && <ErrorBanner message={error2} />}

          <Field label="Cliente (opcional — venta de mostrador)">
            {customer ? (
              <div className="flex items-center justify-between rounded border border-accent/30 bg-accent/5 px-3 py-2 text-sm">
                <span className="text-ink">{customer.fullName}</span>
                <button type="button" className="text-xs text-ink-muted hover:text-accent" onClick={() => setCustomer(null)}>
                  Quitar
                </button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  value={customerSearch}
                  onChange={(e) => searchCustomers(e.target.value)}
                  placeholder="Buscar cliente (déjalo vacío para venta anónima)…"
                />
                {customerResults.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full rounded border border-border bg-surface-raised shadow-lg">
                    {customerResults.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-bg"
                          onClick={() => {
                            setCustomer(c);
                            setCustomerResults([]);
                          }}
                        >
                          {c.fullName} <span className="text-ink-muted">{c.phone}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Field>

          <Field label="Agregar producto">
            <ProductSearch onSelect={addItem} />
          </Field>

          {items.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
                  <th className="py-1 pr-2">Producto</th>
                  <th className="py-1 pr-2 w-20">Cant.</th>
                  <th className="py-1 pr-2 w-32">Precio</th>
                  <th className="py-1 pr-2 w-32">Subtotal</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.key} className="border-b border-border/50">
                    <td className="py-2 pr-2 text-ink">{item.description}</td>
                    <td className="py-2 pr-2">
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateItem(item.key, { quantity: Number(e.target.value) })}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        type="number"
                        min={0}
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.key, { unitPrice: Number(e.target.value) })}
                      />
                    </td>
                    <td className="py-2 pr-2 tabular text-ink">{formatCurrency(item.unitPrice * item.quantity)}</td>
                    <td>
                      <button type="button" onClick={() => removeItem(item.key)} className="text-xs text-danger hover:underline">
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="flex items-end justify-between gap-4 border-t border-border pt-3">
            <Field label="Método de pago">
              <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-ink-muted">Total</p>
              <p className="font-mono text-xl tabular text-accent">{formatCurrency(total)}</p>
            </div>
          </div>

          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Registrando…" : "Registrar venta"}
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Ventas recientes" />
        {loading && (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        )}
        {error && (
          <div className="p-4">
            <ErrorBanner message={error} />
          </div>
        )}
        {!loading && sales?.length === 0 && <EmptyState title="Sin ventas registradas todavía" />}
        {!loading && sales && sales.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Cliente</th>
                <th className="px-4 py-2">Total</th>
                <th className="px-4 py-2">Método</th>
                <th className="px-4 py-2">Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 tabular text-ink-muted">{formatDateTime(s.date)}</td>
                  <td className="px-4 py-2 text-ink">{s.customer?.fullName ?? "Mostrador"}</td>
                  <td className="px-4 py-2 tabular text-ink">{formatCurrency(s.total)}</td>
                  <td className="px-4 py-2 text-ink-muted">{PAYMENT_METHOD_LABELS[s.paymentMethod]}</td>
                  <td className="px-4 py-2">
                    <span className={s.status === "ACTIVE" ? "text-success" : "text-danger"}>
                      {s.status === "ACTIVE" ? "Activa" : "Cancelada"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {s.status === "ACTIVE" && (
                      <button onClick={() => handleCancel(s.id)} className="text-xs text-danger hover:underline">
                        Cancelar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
