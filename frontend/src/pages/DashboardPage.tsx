import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import type {
  BrandCount,
  DashboardSummary,
  IssueCount,
  MonthlyCount,
  MonthlyRevenue,
} from "@/lib/types";
import { Card, CardHeader, ErrorBanner, Spinner } from "@/components/ui";
import { formatCurrency, formatMonthLabel } from "@/lib/format";

type ChartData = {
  summary: DashboardSummary;
  repairsByMonth: MonthlyCount[];
  revenueByMonth: MonthlyRevenue[];
  topBrands: BrandCount[];
  commonIssues: IssueCount[];
};

export function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<ChartData | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [summary, repairsByMonth, revenueByMonth, topBrands, commonIssues] = await Promise.all([
          api.get<DashboardSummary>("/dashboard/summary"),
          api.get<MonthlyCount[]>("/dashboard/charts/repairs-by-month", { months: 6 }),
          api.get<MonthlyRevenue[]>("/dashboard/charts/revenue-by-month", { months: 6 }),
          api.get<BrandCount[]>("/dashboard/charts/top-brands", { limit: 8 }),
          api.get<IssueCount[]>("/dashboard/charts/common-issues", { limit: 8 }),
        ]);
        if (!cancelled) {
          setData({ summary, repairsByMonth, revenueByMonth, topBrands, commonIssues });
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 403) {
          setAccessDenied(true);
        } else {
          setError(err instanceof ApiError ? err.message : "No se pudo cargar el panel");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const firstName = user?.fullName?.split(" ")[0];

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  // El backend restringe /dashboard a Administrador y Gerente (Fase 12) —
  // el resto de roles ve los accesos rápidos en vez de un error feo.
  if (accessDenied) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-xl font-semibold text-ink">Hola, {firstName}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Los indicadores del panel están reservados a Administrador y Gerente. Aquí tienes accesos
          directos a lo que sí puedes usar:
        </p>
        <QuickLinks />
      </div>
    );
  }

  if (error || !data) {
    return <ErrorBanner message={error ?? "No se pudo cargar el panel"} />;
  }

  const { summary } = data;
  const statusEntries = Object.entries(summary.equiposPorEstado).sort((a, b) => b[1] - a[1]);
  const maxStatusCount = Math.max(1, ...statusEntries.map(([, count]) => count));
  const maxTechCount = Math.max(1, ...summary.reparacionesPorTecnico.map((t) => t.count));

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Hola, {firstName}</h1>
        <p className="text-sm text-ink-muted">Así está el taller hoy</p>
      </div>

      {/* Indicadores de un solo número — sección 4 del brief */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi label="Recibidos hoy" value={String(summary.equiposRecibidosHoy)} />
        <Kpi label="Cotizaciones pendientes" value={String(summary.cotizacionesPendientes)} />
        <Kpi
          label="Stock bajo"
          value={String(summary.repuestosStockBajo)}
          tone={summary.repuestosStockBajo > 0 ? "warning" : undefined}
          to="/inventory?lowStockOnly=true"
        />
        <Kpi
          label="Garantías por vencer"
          value={String(summary.garantiasPorVencer)}
          tone={summary.garantiasPorVencer > 0 ? "warning" : undefined}
        />
        <Kpi label="Ventas del día" value={formatCurrency(summary.ventasDelDia)} />
        <Kpi label="Dinero pendiente de clientes" value={formatCurrency(summary.dineroPendienteClientes)} />
        <Kpi label="Ingresos del mes" value={formatCurrency(summary.ingresosDelMes)} tone="success" />
        <Kpi label="Gastos del mes" value={formatCurrency(summary.gastosDelMes)} tone="danger" />
        <Kpi
          label="Ganancia estimada"
          value={formatCurrency(summary.gananciaEstimada)}
          tone={summary.gananciaEstimada >= 0 ? "success" : "danger"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Reparaciones por mes" subtitle="Últimos 6 meses" />
          <div className="h-56 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.repairsByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="month"
                  tickFormatter={formatMonthLabel}
                  stroke="var(--text-muted)"
                  fontSize={12}
                />
                <YAxis stroke="var(--text-muted)" fontSize={12} allowDecimals={false} />
                <Tooltip
                  labelFormatter={(v) => formatMonthLabel(String(v))}
                  contentStyle={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
                />
                <Bar dataKey="count" name="Reparaciones" fill="var(--accent)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Ingresos por mes" subtitle="Pagos + ventas cobradas — últimos 6 meses" />
          <div className="h-56 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="month"
                  tickFormatter={formatMonthLabel}
                  stroke="var(--text-muted)"
                  fontSize={12}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  fontSize={12}
                  tickFormatter={(v) => formatCurrency(v)}
                  width={80}
                />
                <Tooltip
                  labelFormatter={(v) => formatMonthLabel(String(v))}
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
                />
                <Line type="monotone" dataKey="total" name="Ingresos" stroke="var(--success)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Equipos por estado" />
          <ul className="space-y-2 p-4">
            {statusEntries.map(([label, count]) => (
              <li key={label} className="flex items-center gap-3 text-sm">
                <span className="w-40 shrink-0 text-ink-muted">{label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded bg-surface-raised">
                  <div
                    className="h-full rounded bg-accent"
                    style={{ width: `${(count / maxStatusCount) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right tabular text-ink">{count}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Reparaciones en curso por técnico" />
          {summary.reparacionesPorTecnico.length === 0 ? (
            <p className="p-4 text-sm text-ink-muted">Sin órdenes en curso asignadas todavía.</p>
          ) : (
            <ul className="space-y-2 p-4">
              {summary.reparacionesPorTecnico.map((t) => (
                <li key={t.technician} className="flex items-center gap-3 text-sm">
                  <span className="w-40 shrink-0 text-ink-muted">{t.technician}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded bg-surface-raised">
                    <div
                      className="h-full rounded bg-info"
                      style={{ width: `${(t.count / maxTechCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right tabular text-ink">{t.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Marcas más reparadas" />
          <div className="h-56 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topBrands} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" stroke="var(--text-muted)" fontSize={12} allowDecimals={false} />
                <YAxis dataKey="brand" type="category" stroke="var(--text-muted)" fontSize={12} width={90} />
                <Tooltip contentStyle={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }} />
                <Bar dataKey="count" name="Reparaciones" fill="var(--accent)" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Fallas más frecuentes" />
          <div className="h-56 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.commonIssues} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" stroke="var(--text-muted)" fontSize={12} allowDecimals={false} />
                <YAxis dataKey="issue" type="category" stroke="var(--text-muted)" fontSize={12} width={120} />
                <Tooltip contentStyle={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }} />
                <Bar dataKey="count" name="Casos" fill="var(--warning)" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="border-t border-border px-4 py-2 text-xs text-ink-muted">
            Agrupado por texto tal cual se reportó — "no enciende" y "no prende" cuentan aparte (ver
            limitación documentada en el backend, Fase 12).
          </p>
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
  to,
}: {
  label: string;
  value: string;
  tone?: "success" | "warning" | "danger";
  to?: string;
}) {
  const toneClass = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : tone === "danger" ? "text-danger" : "text-ink";
  const content = (
    <Card className={`p-3 ${to ? "transition-colors hover:border-accent/50" : ""}`}>
      <p className="text-xs uppercase tracking-wide text-ink-muted">{label}</p>
      <p className={`mt-1 font-mono text-lg tabular ${toneClass}`}>{value}</p>
    </Card>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

function QuickLinks() {
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <QuickLink to="/repair-orders/new" title="Recibir un equipo" description="Registrar una nueva orden de reparación" />
      <QuickLink to="/repair-orders" title="Buscar una orden" description="Ver o continuar una reparación en curso" />
      <QuickLink to="/customers" title="Clientes" description="Buscar, crear o editar clientes" />
      <QuickLink to="/repair-orders?status=RECEIVED" title="Recién ingresados" description="Equipos que aún no entran a diagnóstico" />
      <QuickLink to="/inventory?lowStockOnly=true" title="Stock bajo" description="Repuestos por debajo del mínimo configurado" />
    </div>
  );
}

function QuickLink({ to, title, description }: { to: string; title: string; description: string }) {
  return (
    <Link to={to}>
      <Card className="p-4 transition-colors hover:border-accent/50">
        <p className="font-medium text-ink">{title}</p>
        <p className="mt-1 text-sm text-ink-muted">{description}</p>
      </Card>
    </Link>
  );
}
