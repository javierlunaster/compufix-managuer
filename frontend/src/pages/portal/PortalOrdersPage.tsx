import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { portalApi, PortalApiError } from "@/lib/portalApi";
import type { PortalOrderSummary } from "@/lib/types";
import { REPAIR_STATUS_LABELS } from "@/lib/types";
import { Card, EmptyState, ErrorBanner, Spinner } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";

export function PortalOrdersPage() {
  const [orders, setOrders] = useState<PortalOrderSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    portalApi
      .get<PortalOrderSummary[]>("/customer-portal/my-orders")
      .then(setOrders)
      .catch((err) => setError(err instanceof PortalApiError ? err.message : "No se pudo cargar tu información"));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-ink">Tus reparaciones</h1>
        <p className="text-sm text-ink-muted">Todo lo que has traído al taller</p>
      </div>

      {error && <ErrorBanner message={error} />}

      {!orders && !error && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}

      {orders && orders.length === 0 && (
        <Card>
          <EmptyState title="Todavía no tienes reparaciones registradas" />
        </Card>
      )}

      {orders && orders.length > 0 && (
        <Card>
          <ul className="divide-y divide-border">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  to={`/portal/orders/${o.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-surface-raised"
                >
                  <div>
                    <p className="font-mono text-accent">{o.orderCode}</p>
                    <p className="text-sm text-ink-muted">
                      {o.device.brand?.name} {o.device.model} · {formatDate(o.entryDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-ink">{REPAIR_STATUS_LABELS[o.status]}</p>
                    <p className="text-xs text-ink-muted">{formatCurrency(o.totalValue)}</p>
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
