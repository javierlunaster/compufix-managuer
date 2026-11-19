import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { Customer, Paginated, PaymentMethod, PendingSale, Product, Sale } from "@/lib/types";
import { PAYMENT_METHOD_LABELS } from "@/lib/types";
import { ProductSearch } from "@/components/ProductSearch";
import { DownloadPdfButton } from "@/components/DownloadPdfButton";
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
  const {
    data: pendingSales,
    loading: pendingLoading,
    reload: reloadPending,
  } = useFetch(() => api.get<PendingSale[]>("/sales/pending"), []);

  function reloadAll() {
    reload();
    reloadPending();
  }

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [amountPaidInput, setAmountPaidInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error2, setError2] = useState<string | null>(null);

  async function searchCustomers(term: string) {
    setCustomerSearch(term);
    if (term.trim().length < 2) {
      setCustomerResults([]);
      return;
    }
    const result = await api.get<Paginated<Customer>>("/customers", { search: term });
    setCustomerResults(result.data);
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
  // Campo vacío = se paga todo (el caso normal, venta de mostrador de
  // contado) — solo si el cajero escribe un monto menor queda saldo
  // pendiente. Nunca negativo ni mayor al total.
  const amountPaid = amountPaidInput.trim() === "" ? total : Math.min(Math.max(Number(amountPaidInput), 0), total);
  const pendingBalance = total - amountPaid;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError2(null);
    if (items.length === 0) {
      setError2("Agrega al menos un producto");
      return;
    }
    if (pendingBalance > 0 && !customer) {
      setError2("Una venta con saldo pendiente requiere un cliente registrado, para poder cobrarle el resto después");
      return;
    }
    setSaving(true);
    try {
      await api.post("/sales", {
        customerId: customer?.id,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
        paymentMethod,
        amountPaid,
      });
      setItems([]);
      setCustomer(null);
      setAmountPaidInput("");
      reloadAll();
    } catch (err) {
      setError2(err instanceof ApiError ? err.message : "No se pudo registrar la venta");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel(saleId: number) {
    try {
      await api.post(`/sales/${saleId}/cancel`);
      reloadAll();
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

          <div className="flex flex-wrap items-end justify-between gap-4 border-t border-border pt-3">
            <Field label="Método de pago">
              <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Monto pagado ahora (vacío = todo)">
              <Input
                type="number"
                min={0}
                max={total}
                placeholder={String(total)}
                value={amountPaidInput}
                onChange={(e) => setAmountPaidInput(e.target.value)}
              />
            </Field>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-ink-muted">Total</p>
              <p className="font-mono text-xl tabular text-accent">{formatCurrency(total)}</p>
            </div>
          </div>

          {pendingBalance > 0 && (
            <p className="text-xs text-warning">
              Quedará un saldo pendiente de {formatCurrency(pendingBalance)}
              {customer ? ` a cargo de ${customer.fullName}` : " — necesitas elegir un cliente"}.
            </p>
          )}

          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Registrando…" : "Registrar venta"}
          </Button>
        </form>
      </Card>

      <PendingSalesCard sales={pendingSales} loading={pendingLoading} onChanged={reloadAll} />

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
                <th className="px-4 py-2">Saldo</th>
                <th className="px-4 py-2">Método</th>
                <th className="px-4 py-2">Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => {
                const balance = Number(s.total) - Number(s.paidAmount);
                return (
                  <tr key={s.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 tabular text-ink-muted">{formatDateTime(s.date)}</td>
                    <td className="px-4 py-2 text-ink">{s.customer?.fullName ?? "Mostrador"}</td>
                    <td className="px-4 py-2 tabular text-ink">{formatCurrency(s.total)}</td>
                    <td className="px-4 py-2 tabular">
                      {s.status === "ACTIVE" && balance > 0 ? (
                        <span className="text-warning">{formatCurrency(balance)}</span>
                      ) : (
                        <span className="text-ink-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-ink-muted">{PAYMENT_METHOD_LABELS[s.paymentMethod]}</td>
                    <td className="px-4 py-2">
                      <span className={s.status === "ACTIVE" ? "text-success" : "text-danger"}>
                        {s.status === "ACTIVE" ? "Activa" : "Cancelada"}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        <DownloadPdfButton
                          path={`/sales/${s.id}/document`}
                          filename={`recibo-venta-${s.invoiceNumber ?? s.id}.pdf`}
                          label="Recibo"
                        />
                        {s.status === "ACTIVE" && (
                          <button onClick={() => handleCancel(s.id)} className="text-xs text-danger hover:underline">
                            Cancelar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

/**
 * Seguimiento de ventas con saldo pendiente (lo que pidió el taller:
 * poder ver de un vistazo quién debe y cuánto, y cobrarle sin tener que
 * ir a buscar la venta en el listado de abajo). Usa GET /sales/pending,
 * que ya trae el balance calculado y solo incluye ventas activas con
 * algo pendiente — nunca aparece vacío-engañoso mezclado con ventas ya
 * pagadas.
 */
function PendingSalesCard({
  sales,
  loading,
  onChanged,
}: {
  sales: PendingSale[] | null;
  loading: boolean;
  onChanged: () => void;
}) {
  const [abonandoId, setAbonandoId] = useState<number | null>(null);
  const totalPending = (sales ?? []).reduce((sum, s) => sum + Number(s.balance), 0);

  return (
    <Card>
      <CardHeader
        title="Ventas con saldo pendiente"
        subtitle={
          sales && sales.length > 0
            ? `${sales.length} venta${sales.length === 1 ? "" : "s"} · ${formatCurrency(totalPending)} por cobrar`
            : undefined
        }
      />
      {loading && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}
      {!loading && (!sales || sales.length === 0) && (
        <EmptyState title="Ninguna venta tiene saldo pendiente" />
      )}
      {!loading && sales && sales.length > 0 && (
        <ul className="divide-y divide-border">
          {sales.map((s) =>
            abonandoId === s.id ? (
              <li key={s.id} className="px-4 py-3">
                <AbonoForm
                  sale={s}
                  onCancel={() => setAbonandoId(null)}
                  onSaved={() => {
                    setAbonandoId(null);
                    onChanged();
                  }}
                />
              </li>
            ) : (
              <li key={s.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="text-ink">
                    {s.customer.fullName} <span className="text-ink-muted">· {s.customer.phone}</span>
                  </p>
                  <p className="text-xs text-ink-muted">
                    Venta {s.invoiceNumber ?? `#${s.id}`} · {formatDateTime(s.date)} · Total{" "}
                    {formatCurrency(s.total)} · Abonado {formatCurrency(s.paidAmount)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono tabular text-warning">{formatCurrency(s.balance)}</span>
                  <DownloadPdfButton
                    path={`/sales/${s.id}/document`}
                    filename={`recibo-venta-${s.invoiceNumber ?? s.id}.pdf`}
                    label="Recibo"
                  />
                  <Button type="button" variant="primary" onClick={() => setAbonandoId(s.id)}>
                    Abonar
                  </Button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </Card>
  );
}

function AbonoForm({
  sale,
  onCancel,
  onSaved,
}: {
  sale: PendingSale;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState(String(sale.balance));
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post("/payments", {
        customerId: sale.customer.id,
        saleId: sale.id,
        amount: Number(amount),
        method,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo registrar el abono");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      {error && <ErrorBanner message={error} />}
      <p className="text-sm text-ink">
        {sale.customer.fullName} debe {formatCurrency(sale.balance)}
      </p>
      <Field label="Monto">
        <Input
          type="number"
          min={1}
          max={Number(sale.balance)}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </Field>
      <Field label="Método">
        <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
          {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit" variant="primary" disabled={saving}>
        {saving ? "Guardando…" : "Registrar abono"}
      </Button>
      <Button type="button" variant="ghost" onClick={onCancel}>
        Cancelar
      </Button>
    </form>
  );
}
