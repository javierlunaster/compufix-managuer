import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { Product, QuotationDetail, QuotationStatus, Service } from "@/lib/types";
import { QUOTATION_STATUSES, QUOTATION_STATUS_LABELS } from "@/lib/types";
import { ProductSearch } from "@/components/ProductSearch";
import { ServiceSearch } from "@/components/ServiceSearch";
import { DownloadPdfButton } from "@/components/DownloadPdfButton";
import {
  Button,
  Card,
  CardHeader,
  ErrorBanner,
  Select,
  Spinner,
} from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";

export function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    data: quotation,
    loading,
    error,
    reload,
  } = useFetch(() => api.get<QuotationDetail>(`/quotations/${id}`), [id]);

  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  const isDraft = quotation.status === "DRAFT";

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
          </div>
        </div>

        {actionError && (
          <div className="mt-3">
            <ErrorBanner message={actionError} />
          </div>
        )}

        {quotation.status === "APPROVED" && !quotation.sourceOrder && (
          <p className="mt-3 text-xs text-warning">
            Esta cotización no está asociada a una orden de reparación, así que no se puede convertir
            automáticamente.
          </p>
        )}

        <div className="mt-4 grid grid-cols-4 gap-4 border-t border-border pt-4 text-sm">
          <Money label="Subtotal" value={quotation.subtotal} />
          <Money label="Descuento" value={quotation.discount} />
          <Money label="Impuesto + envío" value={String(Number(quotation.tax) + Number(quotation.shipping))} />
          <Money label="Total" value={quotation.total} emphasize />
        </div>
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
              {isDraft && <th />}
            </tr>
          </thead>
          <tbody>
            {quotation.items.map((item) => (
              <tr key={item.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2 text-ink">{item.description}</td>
                <td className="px-4 py-2 tabular text-ink-muted">{item.quantity}</td>
                <td className="px-4 py-2 tabular text-ink-muted">{formatCurrency(item.unitPrice)}</td>
                <td className="px-4 py-2 tabular text-ink">{formatCurrency(item.subtotal)}</td>
                {isDraft && (
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

        {isDraft && (
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
