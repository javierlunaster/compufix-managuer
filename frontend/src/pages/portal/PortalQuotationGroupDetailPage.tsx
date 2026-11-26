import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { portalApi, PortalApiError } from "@/lib/portalApi";
import type { PortalQuotationGroupDetail } from "@/lib/types";
import { QUOTATION_STATUS_LABELS } from "@/lib/types";
import { Button, Card, CardHeader, ErrorBanner, Spinner } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";

const APPROVABLE_STATUSES = ["SENT", "PENDING"];

export function PortalQuotationGroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [group, setGroup] = useState<PortalQuotationGroupDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmingReject, setConfirmingReject] = useState(false);

  function load() {
    portalApi
      .get<PortalQuotationGroupDetail>(`/customer-portal/my-quotation-groups/${id}`)
      .then(setGroup)
      .catch((err) =>
        setError(err instanceof PortalApiError ? err.message : "No se pudo cargar esta cotización"),
      );
  }

  useEffect(load, [id]);

  async function handleApprove() {
    setActionError(null);
    setBusy(true);
    try {
      await portalApi.post(`/customer-portal/my-quotation-groups/${id}/approve`);
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
      await portalApi.post(`/customer-portal/my-quotation-groups/${id}/reject`);
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

  if (!group) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }

  const canRespond = APPROVABLE_STATUSES.includes(group.status) &&
    group.quotations.every((q) => APPROVABLE_STATUSES.includes(q.status));

  return (
    <div className="space-y-4">
      <Link to="/portal/quotations" className="text-xs text-ink-muted hover:text-accent">
        ← Volver a mis cotizaciones
      </Link>

      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-2xl font-semibold tracking-wider text-ink">{group.groupNumber}</p>
            <p className="mt-1 text-sm text-ink-muted">
              {formatDate(group.date)} · {group.quotations.length} equipos
            </p>
          </div>
          <span className="font-mono text-xs uppercase text-ink-muted">
            {QUOTATION_STATUS_LABELS[group.status]}
          </span>
        </div>
        {group.notes && <p className="mt-3 border-t border-border pt-3 text-sm text-ink-muted">{group.notes}</p>}
      </Card>

      {group.quotations.map((q) => (
        <Card key={q.id}>
          <CardHeader
            title={q.quotationNumber}
            subtitle={q.sourceOrder ? `Equipo ${q.sourceOrder.orderCode}` : undefined}
          />
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
              {q.items.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 text-ink">{item.description}</td>
                  <td className="px-4 py-2 tabular text-ink-muted">{item.quantity}</td>
                  <td className="px-4 py-2 tabular text-ink-muted">{formatCurrency(item.unitPrice)}</td>
                  <td className="px-4 py-2 tabular text-ink">{formatCurrency(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-border p-4 text-right text-sm">
            <span className="text-ink-muted">Subtotal {q.quotationNumber}: </span>
            <span className="font-mono tabular text-ink">{formatCurrency(q.total)}</span>
          </div>
        </Card>
      ))}

      <Card className="p-5 text-right">
        <p className="text-xs uppercase tracking-wide text-ink-muted">Total unificado</p>
        <p className="font-mono text-lg tabular text-accent">{formatCurrency(group.total)}</p>
      </Card>

      {actionError && <ErrorBanner message={actionError} />}

      {canRespond && (
        <Card>
          <CardHeader
            title="¿Qué decides?"
            subtitle="Al aprobar, el taller queda notificado y sigue con la reparación de todos los equipos"
          />
          {confirmingReject ? (
            <div className="space-y-3 p-4">
              <p className="text-sm text-ink">¿Seguro que quieres rechazar esta cotización unificada?</p>
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
                {busy ? "Enviando…" : "Aprobar todas"}
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
