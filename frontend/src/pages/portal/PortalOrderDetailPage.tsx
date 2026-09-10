import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { portalApi, PortalApiError, resolvePhotoUrl } from "@/lib/portalApi";
import type { PortalOrderDetail, PortalQuotation, QuotationStatus } from "@/lib/types";
import { WARRANTY_STATUS_LABELS, PAYMENT_METHOD_LABELS, QUOTATION_STATUS_LABELS } from "@/lib/types";
import { StatusPill } from "@/components/StatusPill";
import { Card, CardHeader, ErrorBanner, Spinner, Button } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";

// Colores propios (no reutiliza StatusPill: ese componente está tipado
// específicamente para RepairStatus, no para QuotationStatus).
const QUOTATION_STATUS_CLASSES: Record<QuotationStatus, string> = {
  DRAFT: "text-ink-muted",
  SENT: "text-warning",
  PENDING: "text-warning",
  APPROVED: "text-success",
  REJECTED: "text-danger",
  EXPIRED: "text-danger",
  CONVERTED: "text-info",
};

function QuotationCard({
  quotation,
  onResponded,
}: {
  quotation: PortalQuotation;
  onResponded: (updated: PortalQuotation) => void;
}) {
  const [submitting, setSubmitting] = useState<"approve" | "reject" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const canRespond = quotation.status === "SENT" || quotation.status === "PENDING";

  async function respond(decision: "approve" | "reject") {
    setSubmitting(decision);
    setActionError(null);
    try {
      const result = await portalApi.patch<{ id: number; status: QuotationStatus }>(
        `/customer-portal/quotations/${quotation.id}/${decision}`,
      );
      onResponded({ ...quotation, status: result.status });
    } catch (err) {
      setActionError(
        err instanceof PortalApiError ? err.message : "No se pudo registrar tu respuesta",
      );
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="space-y-3 px-4 py-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-sm text-ink">{quotation.quotationNumber}</p>
          <p className="text-xs text-ink-muted">{formatDate(quotation.date)}</p>
        </div>
        <span
          className={`font-mono text-xs uppercase tracking-wide ${QUOTATION_STATUS_CLASSES[quotation.status]}`}
        >
          {QUOTATION_STATUS_LABELS[quotation.status]}
        </span>
      </div>

      <ul className="divide-y divide-border rounded border border-border">
        {quotation.items.map((item) => (
          <li key={item.id} className="flex items-center justify-between px-3 py-2 text-sm">
            <span className="text-ink">
              {item.description}
              {item.quantity > 1 ? ` ×${item.quantity}` : ""}
            </span>
            <span className="tabular text-ink-muted">{formatCurrency(item.subtotal)}</span>
          </li>
        ))}
      </ul>

      <div className="flex justify-end">
        <p className="font-mono text-lg tabular text-ink">{formatCurrency(quotation.total)}</p>
      </div>

      {quotation.validUntil && (
        <p className="text-xs text-ink-muted">Válida hasta {formatDate(quotation.validUntil)}</p>
      )}
      {quotation.notes && <p className="text-sm text-ink-muted">{quotation.notes}</p>}

      {actionError && <ErrorBanner message={actionError} />}

      {canRespond && (
        <div className="flex gap-2 pt-1">
          <Button
            variant="primary"
            disabled={submitting !== null}
            onClick={() => respond("approve")}
          >
            {submitting === "approve" ? "Aprobando…" : "Aceptar cotización"}
          </Button>
          <Button
            variant="danger"
            disabled={submitting !== null}
            onClick={() => respond("reject")}
          >
            {submitting === "reject" ? "Rechazando…" : "Rechazar"}
          </Button>
        </div>
      )}
    </div>
  );
}

export function PortalOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<PortalOrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    portalApi
      .get<PortalOrderDetail>(`/customer-portal/my-orders/${id}`)
      .then(setOrder)
      .catch((err) =>
        setError(err instanceof PortalApiError ? err.message : "No se pudo cargar esta reparación"),
      );
  }, [id]);

  if (error) {
    return (
      <div className="space-y-4">
        <ErrorBanner message={error} />
        <Link to="/portal/orders" className="text-sm text-accent hover:underline">
          ← Volver a mis reparaciones
        </Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }

  const balance = Number(order.totalValue) - Number(order.paidAmount);

  return (
    <div className="space-y-4">
      <Link to="/portal/orders" className="text-xs text-ink-muted hover:text-accent">
        ← Volver a mis reparaciones
      </Link>

      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-2xl font-semibold tracking-wider text-ink">{order.orderCode}</p>
            <p className="mt-1 text-sm text-ink-muted">
              {order.device.brand?.name} {order.device.model} · {order.device.deviceType?.name}
            </p>
          </div>
          <StatusPill status={order.status} />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4 border-t border-border pt-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-muted">Total</p>
            <p className="font-mono tabular text-ink">{formatCurrency(order.totalValue)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-muted">Abonado</p>
            <p className="font-mono tabular text-ink">{formatCurrency(order.paidAmount)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-muted">Saldo</p>
            <p className="font-mono tabular text-accent">{formatCurrency(balance)}</p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Detalle" />
        <dl className="grid grid-cols-2 gap-4 p-4 text-sm">
          <div className="col-span-2">
            <dt className="text-xs uppercase tracking-wide text-ink-muted">Falla reportada</dt>
            <dd className="text-ink">{order.reportedIssue}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink-muted">Ingreso</dt>
            <dd className="text-ink">{formatDate(order.entryDate)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink-muted">Entrega</dt>
            <dd className="text-ink">{order.deliveryDate ? formatDate(order.deliveryDate) : "—"}</dd>
          </div>
        </dl>
      </Card>

      {order.quotations.length > 0 && (
        <Card>
          <CardHeader title="Cotización" />
          <div className="divide-y divide-border">
            {order.quotations.map((q) => (
              <QuotationCard
                key={q.id}
                quotation={q}
                onResponded={(updated) =>
                  setOrder((prev) =>
                    prev
                      ? {
                          ...prev,
                          quotations: prev.quotations.map((existing) =>
                            existing.id === updated.id ? updated : existing,
                          ),
                        }
                      : prev,
                  )
                }
              />
            ))}
          </div>
        </Card>
      )}

      {order.photos.length > 0 && (
        <Card>
          <CardHeader title="Fotos del equipo" />
          <div className="flex flex-wrap gap-2 p-4">
            {order.photos.map((p) => (
              <a key={p.id} href={resolvePhotoUrl(p.fileUrl)} target="_blank" rel="noreferrer">
                <img
                  src={resolvePhotoUrl(p.fileUrl)}
                  alt="Evidencia del equipo"
                  className="h-20 w-20 rounded border border-border object-cover"
                />
              </a>
            ))}
          </div>
        </Card>
      )}

      {order.payments.length > 0 && (
        <Card>
          <CardHeader title="Pagos registrados" />
          <ul className="divide-y divide-border">
            {order.payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-ink-muted">{formatDate(p.date)}</span>
                <span className="text-ink-muted">{PAYMENT_METHOD_LABELS[p.method] ?? p.method}</span>
                <span className="tabular text-ink">{formatCurrency(p.amount)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {order.warranties.length > 0 && (
        <Card>
          <CardHeader title="Garantía" />
          <ul className="divide-y divide-border">
            {order.warranties.map((w) => (
              <li key={w.id} className="px-4 py-3 text-sm">
                <p className="text-ink">{w.coverageDescription}</p>
                <p className="text-xs text-ink-muted">
                  Vence {formatDate(w.warrantyEndDate)} · {WARRANTY_STATUS_LABELS[w.status]}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
