import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { portalApi, PortalApiError } from "@/lib/portalApi";
import type { PortalQuotationDetail } from "@/lib/types";
import { QUOTATION_STATUS_LABELS } from "@/lib/types";
import { Button, Card, CardHeader, ErrorBanner, Spinner } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";

const APPROVABLE_STATUSES = ["SENT", "PENDING"];

export function PortalQuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [quotation, setQuotation] = useState<PortalQuotationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmingReject, setConfirmingReject] = useState(false);

  function load() {
    portalApi
      .get<PortalQuotationDetail>(`/customer-portal/my-quotations/${id}`)
      .then(setQuotation)
      .catch((err) =>
        setError(err instanceof PortalApiError ? err.message : "No se pudo cargar esta cotización"),
      );
  }

  useEffect(load, [id]);

  async function handleApprove() {
    setActionError(null);
    setBusy(true);
    try {
      await portalApi.post(`/customer-portal/my-quotations/${id}/approve`);
      load();
    } catch (err) {
      setActionError(err instanceof PortalApiError ? err.message : "No se pudo aprobar la cotización");
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    setActionError(null);
    setBusy(true);
    try {
      await portalApi.post(`/customer-portal/my-quotations/${id}/reject`);
      setConfirmingReject(false);
      load();
    } catch (err) {
      setActionError(err instanceof PortalApiError ? err.message : "No se pudo rechazar la cotización");
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="space-y-4">
        <ErrorBanner message={error} />
        <Link to="/portal/quotations" className="text-sm text-accent hover:underline">
          ← Volver a mis cotizaciones
        </Link>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }

  const canRespond = APPROVABLE_STATUSES.includes(quotation.status);

  return (
    <div className="space-y-4">
      <Link to="/portal/quotations" className="text-xs text-ink-muted hover:text-accent">
        ← Volver a mis cotizaciones
      </Link>

      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-2xl font-semibold tracking-wider text-ink">
              {quotation.quotationNumber}
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              {formatDate(quotation.date)}
              {quotation.sourceOrder && (
                <>
                  {" · "}
                  <Link to={`/portal/orders/${quotation.sourceOrder.id}`} className="text-accent hover:underline">
                    {quotation.sourceOrder.orderCode}
                  </Link>
                </>
              )}
            </p>
          </div>
          <span className="font-mono text-xs uppercase text-ink-muted">
            {QUOTATION_STATUS_LABELS[quotation.status]}
          </span>
        </div>

        {quotation.validUntil && (
          <p className="mt-2 text-xs text-warning">Válida hasta el {formatDate(quotation.validUntil)}</p>
        )}
      </Card>

      <Card>
        <CardHeader title="Detalle" />
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-2">Descripción</th>
              <th className="px-4 py-2">Cant.</th>
              <th className="px-4 py-2">Precio unit.</th>
              <th className="px-4 py-2">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {quotation.items.map((item) => (
              <tr key={item.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2 text-ink">{item.description}</td>
                <td className="px-4 py-2 tabular text-ink-muted">{item.quantity}</td>
                <td className="px-4 py-2 tabular text-ink-muted">{formatCurrency(item.unitPrice)}</td>
                <td className="px-4 py-2 tabular text-ink">{formatCurrency(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="grid grid-cols-2 gap-4 border-t border-border p-4 text-sm sm:grid-cols-4">
          <Money label="Subtotal" value={quotation.subtotal} />
          <Money label="Descuento" value={quotation.discount} />
          <Money label="Impuesto + envío" value={String(Number(quotation.tax) + Number(quotation.shipping))} />
          <Money label="Total" value={quotation.total} emphasize />
        </div>
      </Card>

      {actionError && <ErrorBanner message={actionError} />}

      {canRespond && (
        <Card>
          <CardHeader
            title="¿Qué decides?"
            subtitle="Al aprobar, el taller queda notificado y sigue con la reparación"
          />
          {confirmingReject ? (
            <div className="space-y-3 p-4">
              <p className="text-sm text-ink">¿Seguro que quieres rechazar esta cotización?</p>
              <div className="flex gap-2">
                <Button variant="danger" onClick={handleReject} disabled={busy}>
                  {busy ? "Enviando…" : "Sí, rechazar"}
                </Button>
                <Button variant="ghost" onClick={() => setConfirmingReject(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3 p-4">
              <Button variant="primary" onClick={handleApprove} disabled={busy}>
                {busy ? "Enviando…" : "Aprobar cotización"}
              </Button>
              <Button variant="secondary" onClick={() => setConfirmingReject(true)} disabled={busy}>
                Rechazar
              </Button>
            </div>
          )}
        </Card>
      )}
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
