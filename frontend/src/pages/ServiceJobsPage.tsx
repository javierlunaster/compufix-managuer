import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { ServiceJobListItem } from "@/lib/types";
import { PAYMENT_STATUS_LABELS } from "@/lib/types";
import { Button, Card, EmptyState, ErrorBanner, Spinner } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import { ServiceJobForm } from "@/components/ServiceJobForm";

/**
 * "Servicios externos": trabajos que un técnico presta en sitio, en un
 * cliente, cubriendo uno o varios equipos en una sola visita — la "cuenta
 * de cobro" en papel que ya usaba el taller (ver ServiceJobsService en el
 * backend). El pago se reparte entre el taller y el técnico según un %
 * que se fija en cada trabajo, no una regla fija del negocio.
 */
export function ServiceJobsPage() {
  const [showForm, setShowForm] = useState(false);
  const {
    data: jobs,
    loading,
    error,
    reload,
  } = useFetch(() => api.get<ServiceJobListItem[]>("/service-jobs"), []);

  return (
    <div className="max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Servicios externos</h1>
          <p className="text-sm text-ink-muted">
            Trabajos en sitio asignados a un técnico, con cuenta de cobro
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancelar" : "+ Nuevo servicio externo"}
        </Button>
      </div>

      {showForm && (
        <div className="mb-4">
          <ServiceJobForm
            onSaved={() => {
              setShowForm(false);
              reload();
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      <Card>
        {loading && (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        )}
        {error && (
          <div className="p-4">
            <ErrorBanner message={error} />
          </div>
        )}
        {!loading && !error && jobs?.length === 0 && (
          <EmptyState title="Sin servicios externos registrados" />
        )}
        {!loading && jobs && jobs.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-2">Cuenta de cobro</th>
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Cliente</th>
                <th className="px-4 py-2">Técnico</th>
                <th className="px-4 py-2">Total</th>
                <th className="px-4 py-2">Pago del cliente</th>
                <th className="px-4 py-2">Pago al técnico</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} className="border-b border-border last:border-0 hover:bg-surface-raised">
                  <td className="px-4 py-3">
                    <Link to={`/service-jobs/${j.id}`} className="font-mono text-xs text-accent">
                      N° {String(j.accountNumber).padStart(4, "0")}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{formatDate(j.date)}</td>
                  <td className="px-4 py-3 text-ink">{j.customer.fullName}</td>
                  <td className="px-4 py-3 text-ink">{j.technician.fullName}</td>
                  <td className="px-4 py-3 tabular text-ink">{formatCurrency(j.chargedAmount)}</td>
                  <td className="px-4 py-3">
                    <span className={j.clientPaymentStatus === "PAID" ? "text-success" : "text-warning"}>
                      {PAYMENT_STATUS_LABELS[j.clientPaymentStatus] ?? j.clientPaymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={j.technicianPaymentStatus === "PAID" ? "text-success" : "text-warning"}
                    >
                      {PAYMENT_STATUS_LABELS[j.technicianPaymentStatus] ?? j.technicianPaymentStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
