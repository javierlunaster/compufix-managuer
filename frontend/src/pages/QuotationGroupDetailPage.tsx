import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { QuotationGroupDetail, QuotationStatus } from "@/lib/types";
import { QUOTATION_STATUS_LABELS } from "@/lib/types";
import { DownloadPdfButton } from "@/components/DownloadPdfButton";
import { Button, Card, CardHeader, EmptyState, ErrorBanner, Spinner } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";

const STATUS_COLOR: Record<QuotationStatus, string> = {
  DRAFT: "text-ink-muted",
  SENT: "text-info",
  PENDING: "text-warning",
  APPROVED: "text-success",
  REJECTED: "text-danger",
  EXPIRED: "text-danger",
  CONVERTED: "text-accent",
};

/**
 * Cotización unificada (ver QuotationGroupsService) — agrupa varias
 * cotizaciones de un mismo cliente bajo un total combinado. El grupo no
 * tiene estado propio: lo que se ve aquí (status/total) ya viene
 * calculado por el backend a partir de sus miembros.
 */
export function QuotationGroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    data: group,
    loading,
    error,
    reload,
  } = useFetch(() => api.get<QuotationGroupDetail>(`/quotation-groups/${id}`), [id]);

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }
  if (error || !group) {
    return <ErrorBanner message={error ?? "Cotización unificada no encontrada"} />;
  }

  const allConverted = group.quotations.every((q) => q.status === "CONVERTED");
  const anyConverted = group.quotations.some((q) => q.status === "CONVERTED");
  // El grupo ya quedó resuelto por completo (todas aprobadas o todas
  // rechazadas) — mostrar "Aprobar/Rechazar todas" de nuevo sería
  // confuso, igual que no tendría sentido en una cotización individual
  // ya aprobada.
  const resolved = group.status === "APPROVED" || group.status === "REJECTED";

  async function handleApprove() {
    setActionError(null);
    setBusy(true);
    try {
      await api.post(`/quotation-groups/${group!.id}/approve`);
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "No se pudo aprobar el grupo");
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    setActionError(null);
    setBusy(true);
    try {
      await api.post(`/quotation-groups/${group!.id}/reject`);
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "No se pudo rechazar el grupo");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono tabular text-2xl font-semibold tracking-wider text-ink">
              {group.groupNumber}
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              {group.customer.fullName} · {formatDate(group.date)} · {group.quotations.length} equipos
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className={`font-mono text-xs uppercase ${STATUS_COLOR[group.status]}`}>
              {QUOTATION_STATUS_LABELS[group.status]}
            </span>
            <DownloadPdfButton
              path={`/quotation-groups/${group.id}/document`}
              filename={`cotizacion-unificada-${group.groupNumber}.pdf`}
              label="Descargar PDF"
            />
            {!allConverted && !anyConverted && !resolved && (
              <div className="flex gap-2">
                <Button variant="primary" disabled={busy} onClick={handleApprove}>
                  Aprobar todas
                </Button>
                <Button variant="danger" disabled={busy} onClick={handleReject}>
                  Rechazar todas
                </Button>
              </div>
            )}
            {anyConverted && !allConverted && (
              <p className="max-w-[16rem] text-right text-xs text-ink-muted">
                Algunas cotizaciones ya se convirtieron en orden — revisa cada una por separado.
              </p>
            )}
          </div>
        </div>

        {actionError && (
          <div className="mt-3">
            <ErrorBanner message={actionError} />
          </div>
        )}

        {group.notes && (
          <p className="mt-3 border-t border-border pt-3 text-sm text-ink-muted">{group.notes}</p>
        )}

        <div className="mt-4 border-t border-border pt-4 text-right">
          <p className="text-xs uppercase tracking-wide text-ink-muted">Total unificado</p>
          <p className="font-mono text-lg tabular text-accent">{formatCurrency(group.total)}</p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Cotizaciones incluidas" />
        {group.quotations.length === 0 ? (
          <EmptyState title="Sin cotizaciones en este grupo" />
        ) : (
          <ul className="divide-y divide-border">
            {group.quotations.map((q) => (
              <li key={q.id}>
                <Link
                  to={`/quotations/${q.id}`}
                  className="flex items-center justify-between px-4 py-3 text-sm hover:bg-surface-raised"
                >
                  <div>
                    <span className="font-mono text-xs text-accent">{q.quotationNumber}</span>
                    {q.sourceOrder && (
                      <span className="ml-2 text-xs text-ink-muted">· {q.sourceOrder.orderCode}</span>
                    )}
                  </div>
                  <span className="tabular text-ink">{formatCurrency(q.total)}</span>
                  <span className={`font-mono text-xs uppercase ${STATUS_COLOR[q.status]}`}>
                    {QUOTATION_STATUS_LABELS[q.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
