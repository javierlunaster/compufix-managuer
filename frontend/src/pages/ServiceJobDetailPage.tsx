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

  const canManageTechnicianPayment = user?.role === "Administrador" || user?.role === "Gerente";

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
              className={`tabular text-lg ${job.technicianPaymentStatus === "PAID" ? "text-success" : "text-warning"}`}
            >
              {formatCurrency(job.amountToPayTechnician)}{" "}
              <span className="text-xs font-normal">
                ({PAYMENT_STATUS_LABELS[job.technicianPaymentStatus] ?? job.technicianPaymentStatus})
              </span>
            </p>
          </div>
        </div>
      </Card>

      <ClientPaymentCard job={job} onChanged={reload} />
      <TechnicianPaymentCard
        job={job}
        canManage={canManageTechnicianPayment}
        onChanged={reload}
      />

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

/**
 * Registrar que el cliente pagó la cuenta de cobro — se envía antes y se
 * cobra después, no es como una venta que se asume cobrada de una vez
 * (ver ServiceJobsService.markClientPaid). Abierto a cualquier personal,
 * igual que registrar un abono normal.
 */
function ClientPaymentCard({
  job,
  onChanged,
}: {
  job: ServiceJobDetail;
  onChanged: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMarkPaid() {
    if (!confirm(`¿Confirmar que ${job.customer.fullName} pagó ${formatCurrency(job.chargedAmount)}?`)) {
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await api.post(`/service-jobs/${job.id}/mark-client-paid`);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo registrar el pago");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Pago del cliente"
        subtitle={`${formatCurrency(job.chargedAmount)} — ${PAYMENT_STATUS_LABELS[job.clientPaymentStatus] ?? job.clientPaymentStatus}`}
      />
      <div className="p-4">
        {error && (
          <div className="mb-2">
            <ErrorBanner message={error} />
          </div>
        )}
        {job.clientPaymentStatus === "PAID" ? (
          <p className="text-sm text-success">El cliente ya pagó esta cuenta de cobro.</p>
        ) : (
          <Button variant="primary" onClick={handleMarkPaid} disabled={saving}>
            {saving ? "Registrando…" : "Marcar como pagado por el cliente"}
          </Button>
        )}
      </div>
    </Card>
  );
}

/**
 * Pagarle al técnico su comisión — restringido a Administrador/Gerente
 * (dinero real saliendo de caja) y bloqueado hasta que el cliente haya
 * pagado (ver ServiceJobsService.markTechnicianPaid): no tiene sentido
 * sacar de caja un dinero que el taller todavía no ha recibido.
 */
function TechnicianPaymentCard({
  job,
  canManage,
  onChanged,
}: {
  job: ServiceJobDetail;
  canManage: boolean;
  onChanged: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMarkPaid() {
    if (
      !confirm(
        `¿Confirmar que se le pagó ${formatCurrency(job.amountToPayTechnician)} a ${job.technician.fullName}?`,
      )
    ) {
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await api.post(`/service-jobs/${job.id}/mark-technician-paid`);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo registrar el pago");
    } finally {
      setSaving(false);
    }
  }

  if (job.technicianPaymentStatus === "PAID") {
    return (
      <Card>
        <CardHeader title="Pago al técnico" />
        <p className="p-4 text-sm text-success">
          Ya se le pagó a {job.technician.fullName} su comisión de{" "}
          {formatCurrency(job.amountToPayTechnician)}.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Pago al técnico"
        subtitle={`${formatCurrency(job.amountToPayTechnician)} para ${job.technician.fullName}`}
      />
      <div className="p-4">
        {error && (
          <div className="mb-2">
            <ErrorBanner message={error} />
          </div>
        )}
        {job.clientPaymentStatus !== "PAID" ? (
          <p className="text-sm text-ink-muted">
            El cliente todavía no ha pagado esta cuenta de cobro — regístralo primero para poder
            pagarle al técnico.
          </p>
        ) : canManage ? (
          <Button variant="primary" onClick={handleMarkPaid} disabled={saving}>
            {saving ? "Registrando…" : "Marcar como pagado al técnico"}
          </Button>
        ) : (
          <p className="text-sm text-ink-muted">
            Falta pagarle al técnico su parte — solo un Administrador o Gerente puede
            registrarlo.
          </p>
        )}
      </div>
    </Card>
  );
}
