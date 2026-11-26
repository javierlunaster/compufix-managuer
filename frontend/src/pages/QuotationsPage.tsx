import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
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

// Solo tiene sentido agrupar cotizaciones que todavía están "en juego" —
// una ya convertida/rechazada/vencida es historia cerrada (ver
// QuotationGroupsService en el backend, mismo criterio).
const GROUPABLE_STATUSES: QuotationStatus[] = ["DRAFT", "SENT", "PENDING"];

export function QuotationsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const search = params.get("search") ?? "";
  const status = (params.get("status") as QuotationStatus | null) ?? "";

  const { data: quotations, loading, error } = useFetch(
    () => api.get<QuotationListItem[]>("/quotations", { search, status: status || undefined }),
    [search, status],
  );

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [grouping, setGrouping] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);

  function updateParam(key: string, value: string) {
    setParams((p) => {
      const next = Object.fromEntries(p);
      if (value) next[key] = value;
      else delete next[key];
      return next;
    });
  }

  const selectedItems = (quotations ?? []).filter((q) => selected.has(q.id));
  // El ancla fija de qué cliente son las seleccionadas — una vez hay al
  // menos una marcada, las de otro cliente simplemente no se pueden
  // marcar (ver isGroupable), en vez de dejar seleccionar y fallar recién
  // al enviar.
  const anchorCustomerId = selectedItems[0]?.customer.id ?? null;

  function isGroupable(q: QuotationListItem): boolean {
    return (
      !q.group &&
      GROUPABLE_STATUSES.includes(q.status) &&
      (anchorCustomerId === null || q.customer.id === anchorCustomerId)
    );
  }

  function toggle(q: QuotationListItem) {
    if (!isGroupable(q) && !selected.has(q.id)) return;
    setGroupError(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(q.id)) next.delete(q.id);
      else next.add(q.id);
      return next;
    });
  }

  async function handleCreateGroup() {
    if (selectedItems.length < 2 || !anchorCustomerId) return;
    setGrouping(true);
    setGroupError(null);
    try {
      const group = await api.post<{ id: number }>("/quotation-groups", {
        customerId: anchorCustomerId,
        quotationIds: Array.from(selected),
      });
      navigate(`/quotation-groups/${group.id}`);
    } catch (err) {
      setGroupError(err instanceof ApiError ? err.message : "No se pudo crear la cotización unificada");
    } finally {
      setGrouping(false);
    }
  }

  return (
    <div className="max-w-5xl pb-20">
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
                <th className="w-10 px-4 py-2" />
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
                    <input
                      type="checkbox"
                      checked={selected.has(q.id)}
                      disabled={!isGroupable(q) && !selected.has(q.id)}
                      onChange={() => toggle(q)}
                      title={
                        q.group
                          ? `Ya pertenece al grupo ${q.group.groupNumber}`
                          : !GROUPABLE_STATUSES.includes(q.status)
                            ? "Este estado ya no se puede agrupar"
                            : undefined
                      }
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/quotations/${q.id}`} className="font-mono text-xs text-accent">
                      {q.quotationNumber}
                    </Link>
                    {q.group && (
                      <Link
                        to={`/quotation-groups/${q.group.id}`}
                        className="ml-2 rounded bg-accent/10 px-1.5 py-0.5 font-mono text-[10px] text-accent hover:underline"
                      >
                        {q.group.groupNumber}
                      </Link>
                    )}
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

      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface-raised px-6 py-4 shadow-lg">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
            <div>
              <p className="text-sm text-ink">
                {selected.size} cotización{selected.size === 1 ? "" : "es"} seleccionada
                {selected.size === 1 ? "" : "s"}
                {selectedItems[0] ? ` — ${selectedItems[0].customer.fullName}` : ""}
              </p>
              {groupError && <p className="text-xs text-danger">{groupError}</p>}
              {selected.size === 1 && !groupError && (
                <p className="text-xs text-ink-muted">Selecciona al menos 2 para unificarlas</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => setSelected(new Set())}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                disabled={selected.size < 2 || grouping}
                onClick={handleCreateGroup}
              >
                {grouping ? "Creando…" : "Crear cotización unificada"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
