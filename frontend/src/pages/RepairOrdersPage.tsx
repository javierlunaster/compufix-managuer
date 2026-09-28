import { useSearchParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { Paginated, RepairOrderListItem, RepairStatus } from "@/lib/types";
import { REPAIR_STATUSES, REPAIR_STATUS_LABELS } from "@/lib/types";
import { StatusPill } from "@/components/StatusPill";
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Input,
  Pagination,
  Select,
  Spinner,
} from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";

const PAGE_SIZE = 20;

export function RepairOrdersPage() {
  const [params, setParams] = useSearchParams();
  const search = params.get("search") ?? "";
  const status = (params.get("status") as RepairStatus | null) ?? "";
  const pendingBalance = params.get("pendingBalance") === "true";
  const page = Number(params.get("page") ?? "1") || 1;

  const { data: result, loading, error } = useFetch(
    () =>
      api.get<Paginated<RepairOrderListItem>>("/repair-orders", {
        search,
        status: status || undefined,
        pendingBalance: pendingBalance || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    [search, status, pendingBalance, page],
  );
  const orders = result?.data;

  // Cualquier cambio de filtro vuelve a la página 1 — si no, se puede
  // quedar en una página que ya no existe para el nuevo filtro (ej. estar
  // en la página 5 y luego buscar algo que solo tiene 2 páginas).
  function updateFilter(update: (next: Record<string, string>) => void) {
    setParams((p) => {
      const next = Object.fromEntries(p);
      update(next);
      delete next.page;
      return next;
    });
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Reparaciones</h1>
          <p className="text-sm text-ink-muted">Escribe un código, cliente o serial para buscar</p>
        </div>
        <Link to="/repair-orders/new">
          <Button variant="primary">+ Recibir equipo</Button>
        </Link>
      </div>

      <div className="mb-4 flex gap-3">
        <Input
          value={search}
          onChange={(e) =>
            updateFilter((next) => {
              next.search = e.target.value;
            })
          }
          placeholder="C11061, nombre del cliente, serial…"
          className="max-w-sm"
        />
        <Select
          value={status}
          onChange={(e) =>
            updateFilter((next) => {
              if (e.target.value) next.status = e.target.value;
              else delete next.status;
            })
          }
          className="max-w-xs"
        >
          <option value="">Todos los estados</option>
          {REPAIR_STATUSES.map((s) => (
            <option key={s} value={s}>
              {REPAIR_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <input
            type="checkbox"
            checked={pendingBalance}
            onChange={(e) =>
              updateFilter((next) => {
                if (e.target.checked) next.pendingBalance = "true";
                else delete next.pendingBalance;
              })
            }
          />
          Solo con saldo pendiente
        </label>
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
        {!loading && !error && orders?.length === 0 && (
          <EmptyState title="Sin resultados" description="Ninguna orden coincide con la búsqueda" />
        )}
        {!loading && orders && orders.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-2">Código</th>
                <th className="px-4 py-2">Cliente</th>
                <th className="px-4 py-2">Equipo</th>
                <th className="px-4 py-2">Ingreso</th>
                <th className="px-4 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-border last:border-0 hover:bg-surface-raised">
                  <td className="px-4 py-3">
                    <Link to={`/repair-orders/${o.id}`} className="font-mono tabular text-accent">
                      {o.orderCode}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink">{o.customer.fullName}</td>
                  <td className="px-4 py-3 text-ink-muted">
                    {o.device.model ?? "—"}
                  </td>
                  <td className="px-4 py-3 tabular text-ink-muted">{formatDate(o.entryDate)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill status={o.status} />
                      <BalancePill totalValue={o.totalValue} paidAmount={o.paidAmount} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && result && (
          <Pagination
            page={result.page}
            pageSize={result.pageSize}
            total={result.total}
            onPageChange={(p) =>
              setParams((prev) => ({ ...Object.fromEntries(prev), page: String(p) }))
            }
          />
        )}
      </Card>
    </div>
  );
}

/**
 * Aviso rápido de saldo pendiente junto al estado — antes había que entrar
 * a cada orden para saber si ya estaba paga. Solo se muestra cuando hay
 * saldo real (evita ruido en las que ya están saldadas o entregadas).
 */
function BalancePill({ totalValue, paidAmount }: { totalValue: string; paidAmount: string }) {
  const balance = Number(totalValue) - Number(paidAmount);
  if (balance <= 0) return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-danger/40 bg-danger/10 px-2.5 py-1 font-mono text-xs text-danger">
      Saldo {formatCurrency(balance)}
    </span>
  );
}
