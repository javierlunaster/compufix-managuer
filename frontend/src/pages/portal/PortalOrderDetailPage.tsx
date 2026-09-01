import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { portalApi, PortalApiError, API_ORIGIN } from "@/lib/portalApi";
import type { PortalOrderDetail } from "@/lib/types";
import { WARRANTY_STATUS_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/types";
import { StatusPill } from "@/components/StatusPill";
import { Card, CardHeader, ErrorBanner, Spinner } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";

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

      {order.photos.length > 0 && (
        <Card>
          <CardHeader title="Fotos del equipo" />
          <div className="flex flex-wrap gap-2 p-4">
            {order.photos.map((p) => (
              <a key={p.id} href={`${API_ORIGIN}${p.fileUrl}`} target="_blank" rel="noreferrer">
                <img
                  src={`${API_ORIGIN}${p.fileUrl}`}
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
