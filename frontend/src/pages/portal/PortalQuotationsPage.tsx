import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { portalApi, PortalApiError } from "@/lib/portalApi";
import type { PortalQuotationSummary } from "@/lib/types";
import { QUOTATION_STATUS_LABELS } from "@/lib/types";
import { Card, EmptyState, ErrorBanner, Spinner } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";

export function PortalQuotationsPage() {
  const [quotations, setQuotations] = useState<PortalQuotationSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    portalApi
      .get<PortalQuotationSummary[]>("/customer-portal/my-quotations")
      .then(setQuotations)
      .catch((err) => setError(err instanceof PortalApiError ? err.message : "No se pudo cargar tu información"));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-ink">Tus cotizaciones</h1>
        <p className="text-sm text-ink-muted">Revisa y aprueba las cotizaciones que te ha enviado el taller</p>
      </div>

      {error && <ErrorBanner message={error} />}

      {!quotations && !error && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}

      {quotations && quotations.length === 0 && (
        <Card>
          <EmptyState title="Todavía no tienes cotizaciones" />
        </Card>
      )}

      {quotations && quotations.length > 0 && (
        <Card>
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
