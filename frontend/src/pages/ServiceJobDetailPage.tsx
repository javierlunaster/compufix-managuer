import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useFetch } from "@/lib/useFetch";
import type { ServiceJobDetail } from "@/lib/types";
import { PAYMENT_STATUS_LABELS } from "@/lib/types";
import { Button, Card, CardHeader, ErrorBanner, Spinner } from "@/components/ui";
import { DownloadPdfButton } from "@/components/DownloadPdfButton";
import { formatCurrency, formatDate } from "@/lib/format";

export function ServiceJobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const {
    data: job,
    loading,
    error,
    reload,
  } = useFetch(() => api.get<ServiceJobDetail>(`/service-jobs/${id}`), [id]);

  const [markingPaid, setMarkingPaid] = useState(false);
  const [markError, setMarkError] = useState<string | null>(null);

  const canManagePayment = user?.role === "Administrador" || user?.role === "Gerente";

  async function handleMarkPaid() {
    if (!job) return;
    if (!confirm(`¿Confirmar que se le pagó ${formatCurrency(job.amountToPayTechnician)} a ${job.technician.fullName}?`)) {
      return;
    }
    setMarkError(null);
    setMarkingPaid(true);
    try {
      await api.post(`/service-jobs/${job.id}/mark-technician-paid`);
      reload();
    } catch (err) {
      setMarkError(err instanceof ApiError ? err.message : "No se pudo registrar el pago");
    } finally {
      setMarkingPaid(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }
  if (error || !job) {
    return <ErrorBanner message={error ?? "Servicio externo no encontrado"} />;
  }

  const accountNumber = String(job.accountNumber).padStart(4, "0");

  return (
    <div className="max-w-2xl space-y-4">
      <Link to="/service-jobs" className="text-xs text-ink-muted hover:text-accent">
        ← Volver a Servicios externos
      </Link>

      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-ink-muted">{job.customer.fullName}</p>
            <h1 className="text-xl font-semibold text-ink">Cuenta de cobro N° {accountNumber}</h1>
            <p className="text-sm text-ink-muted">
              {formatDate(job.date)} · Técnico: {job.technician.fullName}
            </p>
          </div>
          <DownloadPdfButton
            path={`/service-jobs/${job.id}/document`}
            filename={`cuenta-cobro-${accountNumber}.pdf`}
            label="Descargar PDF"
          />
        </div>

        <p className="mt-3 text-sm text-ink">{job.description}</p>

        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm">
          <div>
            <p className="text-xs uppercase text-ink-muted">Total cobrado</p>
            <p className="tabular text-lg text-ink">{formatCurrency(job.chargedAmount)}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-ink-muted">Pago al técnico</p>
            <p
              className={`tabular text-lg ${job.paymentStatus === "PAID" ? "text-success" : "text-warning"}`}
            >
              {formatCurrency(job.amountToPayTechnician)}{" "}
              <span className="text-xs font-normal">
                ({PAYMENT_STATUS_LABELS[job.paymentStatus] ?? job.paymentStatus})
              </span>
            </p>
          </div>
        </div>

        {job.paymentStatus !== "PAID" && (
          <div className="mt-4 border-t border-border pt-4">
            {canManagePayment ? (
              <>
                {markError && (
                  <div className="mb-2">
                    <ErrorBanner message={markError} />
                  </div>
                )}
                <Button variant="primary" onClick={handleMarkPaid} disabled={markingPaid}>
                  {markingPaid ? "Registrando…" : "Marcar como pagado al técnico"}
                </Button>
              </>
            ) : (
              <p className="text-sm text-ink-muted">
                Falta pagarle al técnico su parte — solo un Administrador o Gerente puede
                registrarlo.
              </p>
            )}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Equipos atendidos" />
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-2">Marca</th>
              <th className="px-4 py-2">Código de ingreso</th>
              <th className="px-4 py-2">Observación</th>
              <th className="px-4 py-2">Valor</th>
            </tr>
          </thead>
          <tbody>
            {job.items.map((item) => (
              <tr key={item.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-ink">{item.brand}</td>
                <td className="px-4 py-3 text-ink-muted">{item.code ?? "—"}</td>
                <td className="px-4 py-3 text-ink">{item.observation}</td>
                <td className="px-4 py-3 tabular text-ink">{formatCurrency(item.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {job.notes && (
        <Card>
          <CardHeader title="Notas" />
          <p className="p-4 text-sm text-ink">{job.notes}</p>
        </Card>
      )}
    </div>
  );
}
