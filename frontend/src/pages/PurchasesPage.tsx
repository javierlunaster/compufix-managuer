import { useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { Product, Purchase, Supplier } from "@/lib/types";
import { PAYMENT_STATUS_LABELS } from "@/lib/types";
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
import { formatCurrency, formatDate } from "@/lib/format";

type DraftItem = {
  key: string;
  productId: number;
  description: string;
  quantity: number;
  unitCost: number;
};

export function PurchasesPage() {
  const { data: purchases, loading, error, reload } = useFetch(
    () => api.get<Purchase[]>("/purchases"),
    [],
  );
  const { data: suppliers } = useFetch(() => api.get<Supplier[]>("/suppliers"), []);

  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [tax, setTax] = useState("0");
  const [shipping, setShipping] = useState("0");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function addItem(product: Product) {
    setItems((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        productId: product.id,
        description: product.description,
        quantity: 1,
        unitCost: Number(product.cost),
      },
    ]);
  }

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  const subtotal = items.reduce((sum, i) => sum + i.unitCost * i.quantity, 0);
  const total = subtotal + Number(tax || 0) + Number(shipping || 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!supplierId) {
      setFormError("Selecciona un proveedor");
      return;
    }
    if (items.length === 0) {
      setFormError("Agrega al menos un producto");
      return;
    }
    setSaving(true);
    try {
      await api.post("/purchases", {
        supplierId: Number(supplierId),
        invoiceNumber: invoiceNumber || undefined,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitCost: i.unitCost })),
        tax: Number(tax) || undefined,
        shipping: Number(shipping) || undefined,
      });
      setItems([]);
      setInvoiceNumber("");
      reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "No se pudo registrar la compra");
    } finally {
      setSaving(false);
    }
  }

  async function updatePaymentStatus(purchaseId: number, paymentStatus: string) {
    try {
      await api.patch(`/purchases/${purchaseId}/payment-status`, { paymentStatus });
      reload();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo actualizar el estado de pago");
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Compras</h1>
          <p className="text-sm text-ink-muted">Registrar compras a proveedores — actualiza el inventario automáticamente</p>
        </div>
        <Link to="/suppliers" className="text-sm text-accent hover:underline">
          Gestionar proveedores →
        </Link>
      </div>

      <Card>
        <CardHeader title="Nueva compra" />
        <form onSubmit={handleSubmit} className="space-y-3 p-4">
          {formError && <ErrorBanner message={formError} />}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Proveedor">
              <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">Selecciona…</option>
                {suppliers?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="N.° de factura (opcional)">
              <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
            </Field>
          </div>

          <Field label="Agregar producto">
            <ProductSearch onSelect={addItem} />
          </Field>

          {items.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
                  <th className="py-1 pr-2">Producto</th>
                  <th className="py-1 pr-2 w-20">Cant.</th>
                  <th className="py-1 pr-2 w-32">Costo unit.</th>
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
                        value={item.unitCost}
                        onChange={(e) => updateItem(item.key, { unitCost: Number(e.target.value) })}
                      />
                    </td>
                    <td className="py-2 pr-2 tabular text-ink">{formatCurrency(item.unitCost * item.quantity)}</td>
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

          <div className="grid grid-cols-2 gap-3">
            <Field label="Impuesto">
              <Input type="number" min={0} value={tax} onChange={(e) => setTax(e.target.value)} />
            </Field>
            <Field label="Envío">
              <Input type="number" min={0} value={shipping} onChange={(e) => setShipping(e.target.value)} />
            </Field>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm text-ink-muted">Total</span>
            <span className="font-mono text-xl tabular text-accent">{formatCurrency(total)}</span>
          </div>

          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Registrando…" : "Registrar compra"}
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Compras recientes" />
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
        {!loading && purchases?.length === 0 && <EmptyState title="Sin compras registradas todavía" />}
        {!loading && purchases && purchases.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Proveedor</th>
                <th className="px-4 py-2">Total</th>
                <th className="px-4 py-2">Estado de pago</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 tabular">
                    <Link to={`/purchases/${p.id}`} className="text-accent hover:underline">
                      {formatDate(p.date)}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <Link to={`/suppliers/${p.supplier.id}`} className="text-accent hover:underline">
                      {p.supplier.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 tabular text-ink">{formatCurrency(p.total)}</td>
                  <td className="px-4 py-2">
                    <Select
                      value={p.paymentStatus}
                      onChange={(e) => updatePaymentStatus(p.id, e.target.value)}
                      className="text-xs"
                    >
                      {Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
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
