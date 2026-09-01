import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import type { Customer, QuotationDetail, QuotationItemType, Service } from "@/lib/types";
import { ProductSearch } from "@/components/ProductSearch";
import { ServiceSearch } from "@/components/ServiceSearch";
import {
  Button,
  Card,
  CardHeader,
  ErrorBanner,
  Field,
  Input,
} from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import type { Product } from "@/lib/types";

type DraftItem = {
  key: string;
  type: QuotationItemType;
  productId?: number;
  serviceId?: number;
  description: string;
  quantity: number;
  unitPrice: number;
};

export function NewQuotationPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const presetCustomerId = params.get("customerId");
  const presetOrderId = params.get("sourceOrderId");

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);

  const [items, setItems] = useState<DraftItem[]>([]);
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [shipping, setShipping] = useState("0");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (presetCustomerId) {
      api.get<Customer>(`/customers/${presetCustomerId}`).then(setCustomer).catch(() => {});
    }
  }, [presetCustomerId]);

  async function searchCustomers(term: string) {
    setCustomerSearch(term);
    if (term.trim().length < 2) {
      setCustomerResults([]);
      return;
    }
    setCustomerResults(await api.get<Customer[]>("/customers", { search: term }));
  }

  function addPartItem(product: Product) {
    setItems((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        type: "PART",
        productId: product.id,
        description: product.description,
        quantity: 1,
        unitPrice: Number(product.salePrice),
      },
    ]);
  }

  function addServiceItem(service: Service) {
    setItems((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        type: "SERVICE",
        serviceId: service.id,
        description: service.name,
        quantity: 1,
        unitPrice: Number(service.basePrice),
      },
    ]);
  }

  function addLaborItem() {
    setItems((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        type: "LABOR",
        description: "Mano de obra",
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  }

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const total = subtotal - Number(discount || 0) + Number(tax || 0) + Number(shipping || 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!customer) {
      setError("Selecciona un cliente primero");
      return;
    }
    if (items.length === 0) {
      setError("Agrega al menos un ítem a la cotización");
      return;
    }
    setSaving(true);
    try {
      const quotation = await api.post<QuotationDetail>("/quotations", {
        customerId: customer.id,
        sourceOrderId: presetOrderId ? Number(presetOrderId) : undefined,
        items: items.map((i) => ({
          type: i.type,
          productId: i.productId,
          serviceId: i.serviceId,
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        discount: Number(discount) || undefined,
        tax: Number(tax) || undefined,
        shipping: Number(shipping) || undefined,
      });
      navigate(`/quotations/${quotation.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la cotización");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-xl font-semibold text-ink">Nueva cotización</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorBanner message={error} />}

        <Card>
          <CardHeader title="Cliente" />
          <div className="p-4">
            {customer ? (
              <div className="flex items-center justify-between rounded border border-accent/30 bg-accent/5 px-3 py-2">
                <div>
                  <p className="text-ink">{customer.fullName}</p>
                  <p className="text-xs text-ink-muted">{customer.phone}</p>
                </div>
                {!presetCustomerId && (
                  <button
                    type="button"
                    className="text-xs text-ink-muted hover:text-accent"
                    onClick={() => setCustomer(null)}
                  >
                    Cambiar
                  </button>
                )}
              </div>
            ) : (
              <div className="relative">
                <Input
                  value={customerSearch}
                  onChange={(e) => searchCustomers(e.target.value)}
                  placeholder="Buscar cliente por nombre o teléfono…"
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
          </div>
        </Card>

        <Card>
          <CardHeader title="Ítems" subtitle="Repuestos, servicios y mano de obra" />
          <div className="space-y-3 p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[16rem] flex-1">
                <Field label="Agregar repuesto">
                  <ProductSearch onSelect={addPartItem} placeholder="Buscar repuesto…" />
                </Field>
              </div>
              <Field label="Agregar servicio">
                <ServiceSearch onSelect={addServiceItem} />
              </Field>
              <Button type="button" variant="secondary" onClick={addLaborItem}>
                + Mano de obra
              </Button>
            </div>

            {items.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
                    <th className="py-1 pr-2">Descripción</th>
                    <th className="py-1 pr-2 w-20">Cant.</th>
                    <th className="py-1 pr-2 w-32">Precio unit.</th>
                    <th className="py-1 pr-2 w-32">Subtotal</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.key} className="border-b border-border/50">
                      <td className="py-2 pr-2">
                        {item.type === "LABOR" || item.type === "OTHER" ? (
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(item.key, { description: e.target.value })}
                          />
                        ) : (
                          item.description
                        )}
                      </td>
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
                      <td className="py-2 pr-2 tabular text-ink">
                        {formatCurrency(item.unitPrice * item.quantity)}
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => removeItem(item.key)}
                          className="text-xs text-danger hover:underline"
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Totales" />
          <div className="space-y-3 p-4">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Descuento">
                <Input type="number" min={0} value={discount} onChange={(e) => setDiscount(e.target.value)} />
              </Field>
              <Field label="Impuesto">
                <Input type="number" min={0} value={tax} onChange={(e) => setTax(e.target.value)} />
              </Field>
              <Field label="Envío">
                <Input type="number" min={0} value={shipping} onChange={(e) => setShipping(e.target.value)} />
              </Field>
            </div>
            <div className="flex justify-between border-t border-border pt-3 text-sm">
              <span className="text-ink-muted">Subtotal</span>
              <span className="tabular text-ink">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-lg font-medium">
              <span className="text-ink">Total</span>
              <span className="tabular text-accent">{formatCurrency(total)}</span>
            </div>
          </div>
        </Card>

        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Guardando…" : "Crear cotización"}
        </Button>
      </form>
    </div>
  );
}
