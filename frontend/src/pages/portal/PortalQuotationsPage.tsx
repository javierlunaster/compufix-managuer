import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { portalApi, PortalApiError } from "@/lib/portalApi";
import type { PortalQuotationGroupSummary, PortalQuotationSummary } from "@/lib/types";
import { QUOTATION_STATUS_LABELS } from "@/lib/types";
import { Card, CardHeader, EmptyState, ErrorBanner, Spinner } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";

export function PortalQuotationsPage() {
  const [quotations, setQuotations] = useState<PortalQuotationSummary[] | null>(null);
  const [groups, setGroups] = useState<PortalQuotationGroupSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      portalApi.get<PortalQuotationSummary[]>("/customer-portal/my-quotations"),
      portalApi.get<PortalQuotationGroupSummary[]>("/customer-portal/my-quotation-groups"),
    ])
      .then(([q, g]) => {
        setQuotations(q);
        setGroups(g);
      })
      .catch((err) => setError(err instanceof PortalApiError ? err.message : "No se pudo cargar tu información"));
  }, []);

  const loaded = quotations !== null && groups !== null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-ink">Tus cotizaciones</h1>
        <p className="text-sm text-ink-muted">Revisa y aprueba las cotizaciones que te ha enviado el taller</p>
      </div>

      {error && <ErrorBanner message={error} />}

      {!loaded && !error && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}

      {loaded && groups && groups.length === 0 && quotations && quotations.length === 0 && (
        <Card>
          <EmptyState title="Todavía no tienes cotizaciones" />
        </Card>
      )}

      {loaded && groups && groups.length > 0 && (
        <Card>
          <CardHeader
            title="Cotizaciones unificadas"
            subtitle="Varios equipos tuyos agrupados en un solo total"
          />
          <ul className="divide-y divide-border">
            {groups.map((g) => (
              <li key={g.id}>
                <Link
                  to={`/portal/quotation-groups/${g.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-surface-raised"
                >
                  <div>
                    <p className="font-mono text-accent">{g.groupNumber}</p>
                    <p className="text-sm text-ink-muted">
                      {formatDate(g.date)} · {g.quotations.length} equipos
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-ink">{QUOTATION_STATUS_LABELS[g.status]}</p>
                    <p className="text-xs tabular text-ink-muted">{formatCurrency(g.total)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {loaded && quotations && quotations.length > 0 && (
        <Card>
          {groups && groups.length > 0 && <CardHeader title="Cotizaciones individuales" />}
          <ul className="divide-y divide-border">
            {quotations.map((q) => (
              <li key={q.id}>
                <Link
                  to={`/portal/quotations/${q.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-surface-raised"
                >
                  <div>
                    <p className="font-mono text-accent">{q.quotationNumber}</p>
                    <p className="text-sm text-ink-muted">
                      {formatDate(q.date)}
                      {q.sourceOrder && ` · ${q.sourceOrder.orderCode}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-ink">{QUOTATION_STATUS_LABELS[q.status]}</p>
                    <p className="text-xs tabular text-ink-muted">{formatCurrency(q.total)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
