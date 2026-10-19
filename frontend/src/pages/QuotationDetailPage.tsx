import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type {
  Paginated,
  Product,
  QuotationDetail,
  QuotationStatus,
  RepairOrderListItem,
  Service,
} from "@/lib/types";
import { QUOTATION_STATUSES, QUOTATION_STATUS_LABELS, REPAIR_STATUS_LABELS } from "@/lib/types";
import { ProductSearch } from "@/components/ProductSearch";
import { ServiceSearch } from "@/components/ServiceSearch";
import { DownloadPdfButton } from "@/components/DownloadPdfButton";
import {
  Button,
  Card,
  CardHeader,
  ErrorBanner,
  Field,
  Input,
  Select,
  Spinner,
} from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";

export function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    data: quotation,
    loading,
    error,
    reload,
  } = useFetch(() => api.get<QuotationDetail>(`/quotations/${id}`), [id]);

  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [editingTotals, setEditingTotals] = useState(false);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }
  if (error || !quotation) {
    return <ErrorBanner message={error ?? "Cotización no encontrada"} />;
  }

  // Se puede seguir editando mientras el cliente todavía no se ha
  // pronunciado (ver QuotationsService.ensureEditable en el backend) — una
  // vez aprobada, rechazada, vencida o convertida, se bloquea.
  const isEditable =
    quotation.status === "DRAFT" || quotation.status === "SENT" || quotation.status === "PENDING";

  async function handleStatusChange(newStatus: QuotationStatus) {
    if (!newStatus) return;
    setActionError(null);
    setBusy(true);
    try {
      await api.patch(`/quotations/${quotation!.id}/status`, { newStatus });
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "No se pudo cambiar el estado");
    } finally {
      setBusy(false);
    }
  }

  async function handleConvert() {
    setActionError(null);
    setBusy(true);
    try {
      await api.post(`/quotations/${quotation!.id}/convert`);
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "No se pudo convertir la cotización");
    } finally {
      setBusy(false);
    }
  }

  async function addPart(product: Product) {
    setActionError(null);
    try {
      await api.post(`/quotations/${quotation!.id}/items`, {
        type: "PART",
        productId: product.id,
        description: product.description,
        quantity: 1,
        unitPrice: Number(product.salePrice),
      });
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "No se pudo agregar el ítem");
    }
  }

  async function addService(service: Service) {
    setActionError(null);
    try {
      await api.post(`/quotations/${quotation!.id}/items`, {
        type: "SERVICE",
        serviceId: service.id,
        description: service.name,
        quantity: 1,
        unitPrice: Number(service.basePrice),
      });
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "No se pudo agregar el ítem");
    }
  }

  async function handleRemove() {
    setActionError(null);
    setBusy(true);
    try {
      await api.delete(`/quotations/${quotation!.id}`);
      navigate(quotation!.sourceOrder ? `/repair-orders/${quotation!.sourceOrder.id}` : "/quotations");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "No se pudo retirar la cotización");
      setBusy(false);
    }
  }

  async function removeItem(itemId: number) {
    setActionError(null);
    try {
      await api.delete(`/quotations/${quotation!.id}/items/${itemId}`);
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "No se pudo quitar el ítem");
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono tabular text-2xl font-semibold tracking-wider text-ink">
              {quotation.quotationNumber}
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              {quotation.customer.fullName}
              {quotation.sourceOrder && (
                <>
                  {" · "}
                  <Link to={`/repair-orders/${quotation.sourceOrder.id}`} className="text-accent hover:underline">
                    {quotation.sourceOrder.orderCode}
                  </Link>
                </>
              )}
              {" · "}
              {formatDate(quotation.date)}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className="font-mono text-xs uppercase text-ink-muted">
              {QUOTATION_STATUS_LABELS[quotation.status]}
            </span>
            <DownloadPdfButton
              path={`/quotations/${quotation.id}/document`}
              filename={`cotizacion-${quotation.quotationNumber}.pdf`}
              label="Descargar PDF"
            />
            {quotation.status !== "CONVERTED" && (
              <Select
                value=""
                disabled={busy}
                onChange={(e) => handleStatusChange(e.target.value as QuotationStatus)}
                className="w-48 text-xs"
              >
                <option value="">Cambiar estado…</option>
                {QUOTATION_STATUSES.filter((s) => s !== "CONVERTED").map((s) => (
                  <option key={s} value={s} disabled={s === quotation.status}>
                    {QUOTATION_STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
            )}
            {quotation.status === "APPROVED" && quotation.sourceOrder && (
              <Button variant="primary" disabled={busy} onClick={handleConvert}>
                Convertir en reparación
              </Button>
            )}
            {isEditable && (
              <button
                type="button"
                onClick={() => setEditingTotals((e) => !e)}
                className="text-xs text-accent hover:underline"
              >
                {editingTotals ? "Cancelar edición" : "Editar cotización"}
              </button>
            )}
            {quotation.status !== "CONVERTED" &&
              (confirmingRemove ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-ink-muted">¿Retirar esta cotización?</span>
                  <Button variant="danger" disabled={busy} onClick={handleRemove}>
                    {busy ? "Retirando…" : "Sí, retirar"}
                  </Button>
                  <Button variant="ghost" disabled={busy} onClick={() => setConfirmingRemove(false)}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingRemove(true)}
                  className="text-xs text-danger hover:underline"
                >
                  Retirar cotización
                </button>
              ))}
          </div>
        </div>

        {actionError && (
          <div className="mt-3">
            <ErrorBanner message={actionError} />
          </div>
        )}

        {quotation.status === "APPROVED" && !quotation.sourceOrder && (
          <AssignOrderPanel quotation={quotation} onAssigned={reload} />
        )}

        {editingTotals ? (
          <EditQuotationTotalsForm
            quotation={quotation}
            onSaved={() => {
              setEditingTotals(false);
              reload();
            }}
            onCancel={() => setEditingTotals(false)}
          />
        ) : (
          <div className="mt-4 grid grid-cols-4 gap-4 border-t border-border pt-4 text-sm">
            <Money label="Subtotal" value={quotation.subtotal} />
            <Money label="Descuento" value={quotation.discount} />
            <Money label="Impuesto + envío" value={String(Number(quotation.tax) + Number(quotation.shipping))} />
            <Money label="Total" value={quotation.total} emphasize />
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Ítems" />
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-2">Descripción</th>
              <th className="px-4 py-2">Cant.</th>
              <th className="px-4 py-2">Precio unit.</th>
              <th className="px-4 py-2">Subtotal</th>
              {isEditable && <th />}
            </tr>
          </thead>
          <tbody>
            {quotation.items.map((item) => (
              <tr key={item.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2 text-ink">{item.description}</td>
                <td className="px-4 py-2 tabular text-ink-muted">{item.quantity}</td>
                <td className="px-4 py-2 tabular text-ink-muted">{formatCurrency(item.unitPrice)}</td>
                <td className="px-4 py-2 tabular text-ink">{formatCurrency(item.subtotal)}</td>
                {isEditable && (
                  <td className="px-4 py-2">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-xs text-danger hover:underline"
                    >
                      Quitar
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {isEditable && (
          <div className="flex flex-wrap items-end gap-3 border-t border-border p-4">
            <div className="min-w-[16rem] flex-1">
              <ProductSearch onSelect={addPart} placeholder="Agregar repuesto…" />
            </div>
            <div className="max-w-xs flex-1">
              <ServiceSearch onSelect={addService} />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

/**
 * Una cotización "suelta" (no nació del diagnóstico de una orden) no se
 * puede convertir automáticamente (ver QuotationsService.convert) porque no
 * hay a qué equipo asociar los repuestos/servicios. Una vez que el cliente
 * ya la aprobó, esto deja asignarla a una orden de reparación existente del
 * mismo cliente — después de eso, "Convertir en reparación" queda
 * disponible igual que con cualquier otra cotización.
 */
function AssignOrderPanel({
  quotation,
  onAssigned,
}: {
  quotation: QuotationDetail;
  onAssigned: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: orders, loading } = useFetch(
    () =>
      open
        ? api.get<Paginated<RepairOrderListItem>>("/repair-orders", {
            customerId: quotation.customer.id,
            pageSize: 50,
          })
        : Promise.resolve(null),
    [open, quotation.customer.id],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function assign(orderId: number) {
    setError(null);
    setBusy(true);
    try {
      await api.patch(`/quotations/${quotation.id}/assign-order`, { orderId });
      onAssigned();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo asignar la orden");
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="mt-3 rounded border border-warning/30 bg-warning/5 p-3">
        <p className="text-xs text-warning">
          Esta cotización no está asociada a una orden de reparación, así que no se puede convertir
          automáticamente.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-2 text-xs text-accent hover:underline"
        >
          Asignar a una orden de reparación…
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded border border-border bg-surface-raised p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-ink">
          Órdenes de {quotation.customer.fullName}
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={busy}
          className="text-xs text-ink-muted hover:text-ink"
        >
          Cancelar
        </button>
      </div>
      {error && (
        <div className="mt-2">
          <ErrorBanner message={error} />
        </div>
      )}
      {loading && <p className="mt-2 text-xs text-ink-muted">Buscando órdenes…</p>}
      {orders && orders.data.length === 0 && (
        <p className="mt-2 text-xs text-ink-muted">
          Este cliente no tiene órdenes de reparación activas.
        </p>
      )}
      {orders && orders.data.length > 0 && (
        <ul className="mt-2 divide-y divide-border">
          {orders.data.map((o) => (
            <li key={o.id} className="flex items-center justify-between py-2">
              <div className="text-sm">
                <span className="font-mono text-xs text-accent">{o.orderCode}</span>{" "}
                <span className="text-ink-muted">
                  {o.device.model ?? "Equipo"} · {REPAIR_STATUS_LABELS[o.status]}
                </span>
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => assign(o.id)}
              >
                Asignar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Edita descuento/impuesto/envío/vigencia/notas — mientras la cotización
 * siga editable (ver QuotationsService.ensureEditable: DRAFT/SENT/PENDING).
 * Los ítems se recotizan aparte (agregar/quitar en la tabla de arriba);
 * esto es solo los cargos globales de la cotización.
 */
function EditQuotationTotalsForm({
  quotation,
  onSaved,
  onCancel,
}: {
  quotation: QuotationDetail;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [discount, setDiscount] = useState(quotation.discount);
  const [tax, setTax] = useState(quotation.tax);
  const [shipping, setShipping] = useState(quotation.shipping);
  const [validUntil, setValidUntil] = useState(quotation.validUntil?.slice(0, 10) ?? "");
  const [notes, setNotes] = useState(quotation.notes ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.patch(`/quotations/${quotation.id}`, {
        discount: Number(discount) || 0,
        tax: Number(tax) || 0,
        shipping: Number(shipping) || 0,
        validUntil: validUntil || undefined,
        notes: notes || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar los cambios");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 border-t border-border pt-4">
      {error && <ErrorBanner message={error} />}
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
      <div className="grid grid-cols-2 gap-3">
        <Field label="Válida hasta (opcional)">
          <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
        </Field>
        <Field label="Notas (opcional)">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function Money({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-ink-muted">{label}</p>
      <p className={`font-mono tabular ${emphasize ? "text-lg text-accent" : "text-ink"}`}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}
