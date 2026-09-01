import { Link, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { Warranty, WarrantyStatus } from "@/lib/types";
import { WARRANTY_STATUS_LABELS } from "@/lib/types";
import { Card, EmptyState, ErrorBanner, Select, Spinner } from "@/components/ui";
import { formatDate } from "@/lib/format";

export function WarrantiesPage() {
  const [params, setParams] = useSearchParams();
  const status = (params.get("status") as WarrantyStatus | null) ?? "";
  const expiringWithinDays = params.get("expiringWithinDays") ?? "";

  const { data: warranties, loading, error } = useFetch(
    () =>
      api.get<Warranty[]>("/warranties", {
        status: status || undefined,
        expiringWithinDays: expiringWithinDays || undefined,
      }),
    [status, expiringWithinDays],
  );

  function updateParam(key: string, value: string) {
    setParams((p) => {
      const next = Object.fromEntries(p);
      if (value) next[key] = value;
      else delete next[key];
      return next;
    });
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-ink">Garantías</h1>
        <p className="text-sm text-ink-muted">
          Se generan desde la pestaña "Garantía" de cada orden, al entregar el equipo
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <Select value={status} onChange={(e) => updateParam("status", e.target.value)} className="max-w-xs">
          <option value="">Todos los estados</option>
          {Object.entries(WARRANTY_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          value={expiringWithinDays}
          onChange={(e) => updateParam("expiringWithinDays", e.target.value)}
          className="max-w-xs"
        >
          <option value="">Cualquier vencimiento</option>
          <option value="7">Vencen en 7 días</option>
          <option value="30">Vencen en 30 días</option>
          <option value="90">Vencen en 90 días</option>
        </Select>
      </div>

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
        {!loading && !error && warranties?.length === 0 && (
          <EmptyState title="Sin garantías registradas" description="Ninguna coincide con el filtro actual" />
        )}
        {!loading && warranties && warranties.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-2">Orden</th>
                <th className="px-4 py-2">Cliente</th>
                <th className="px-4 py-2">Cobertura</th>
                <th className="px-4 py-2">Vence</th>
                <th className="px-4 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {warranties.map((w) => (
                <tr key={w.id} className="border-b border-border last:border-0 hover:bg-surface-raised">
                  <td className="px-4 py-3">
                    <Link to={`/warranties/${w.id}`} className="font-mono text-accent">
                      {w.repairOrder?.orderCode}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink">{w.repairOrder?.customer?.fullName}</td>
                  <td className="px-4 py-3 text-ink-muted">{w.coverageDescription}</td>
                  <td className="px-4 py-3 tabular text-ink-muted">{formatDate(w.warrantyEndDate)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={w.status} />
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

function StatusBadge({ status }: { status: WarrantyStatus }) {
  const tone =
    status === "ACTIVE" ? "text-success" : status === "CLAIMED" ? "text-info" : "text-danger";
  return <span className={`font-mono text-xs uppercase ${tone}`}>{WARRANTY_STATUS_LABELS[status]}</span>;
}
