import { Link, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { QuotationListItem, QuotationStatus } from "@/lib/types";
import { QUOTATION_STATUSES, QUOTATION_STATUS_LABELS } from "@/lib/types";
import { Button, Card, EmptyState, ErrorBanner, Input, Select, Spinner } from "@/components/ui";
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

export function QuotationsPage() {
  const [params, setParams] = useSearchParams();
  const search = params.get("search") ?? "";
  const status = (params.get("status") as QuotationStatus | null) ?? "";

  const { data: quotations, loading, error } = useFetch(
    () => api.get<QuotationListItem[]>("/quotations", { search, status: status || undefined }),
    [search, status],
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
    <div className="max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Cotizaciones</h1>
          <p className="text-sm text-ink-muted">Repuestos, servicios y mano de obra antes de aprobar una reparación</p>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/services" className="text-sm text-accent hover:underline">
            Gestionar servicios →
          </Link>
          <Link to="/quotations/new">
            <Button variant="primary">+ Nueva cotización</Button>
          </Link>
        </div>
      </div>

      <div className="mb-4 flex gap-3">
        <Input
          value={search}
          onChange={(e) => updateParam("search", e.target.value)}
          placeholder="Buscar por número o cliente…"
          className="max-w-sm"
        />
        <Select value={status} onChange={(e) => updateParam("status", e.target.value)} className="max-w-xs">
          <option value="">Todos los estados</option>
          {QUOTATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {QUOTATION_STATUS_LABELS[s]}
            </option>
          ))}
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
        {!loading && !error && quotations?.length === 0 && (
          <EmptyState title="Sin cotizaciones" description="Ninguna coincide con la búsqueda" />
        )}
        {!loading && quotations && quotations.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-2">Número</th>
                <th className="px-4 py-2">Cliente</th>
                <th className="px-4 py-2">Orden</th>
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Total</th>
                <th className="px-4 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {quotations.map((q) => (
                <tr key={q.id} className="border-b border-border last:border-0 hover:bg-surface-raised">
                  <td className="px-4 py-3">
                    <Link to={`/quotations/${q.id}`} className="font-mono text-xs text-accent">
                      {q.quotationNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink">{q.customer.fullName}</td>
                  <td className="px-4 py-3 text-ink-muted">
                    {q.sourceOrder ? (
                      <Link to={`/repair-orders/${q.sourceOrder.id}`} className="font-mono hover:text-accent">
                        {q.sourceOrder.orderCode}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 tabular text-ink-muted">{formatDate(q.date)}</td>
                  <td className="px-4 py-3 tabular text-ink">{formatCurrency(q.total)}</td>
                  <td className={`px-4 py-3 font-mono text-xs uppercase ${STATUS_COLOR[q.status]}`}>
                    {QUOTATION_STATUS_LABELS[q.status]}
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
