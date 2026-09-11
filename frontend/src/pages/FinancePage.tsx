import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { Card, CardHeader, ErrorBanner, Select, Spinner } from "@/components/ui";
import { formatCurrency } from "@/lib/format";

type DailyEntry = { date: string; income: number; expenses: number; net: number };
type FinanceSummary = {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  incomeBreakdown: { payments: number; sales: number; otherIncome: number };
  expenseBreakdown: { cashExpenses: number; purchases: number };
};
type FinanceDaily = { daily: DailyEntry[]; summary: FinanceSummary };

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function dayLabel(dateStr: string): string {
  // Se formatea a partir del texto directo (YYYY-MM-DD), sin pasar por
  // Date + zona horaria — el mismo tipo de corrimiento que ya causó el
  // error de "Jul" en vez de "Ago" en el Panel. Un mes/día no es un
  // instante real, es una etiqueta; se lee tal cual, sin conversión.
  const day = Number(dateStr.slice(8, 10));
  return String(day);
}

export function FinancePage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data, loading, error } = useFetch<FinanceDaily>(
    () => api.get<FinanceDaily>("/finance/daily", { year, month }),
    [year, month],
  );

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-ink">Finanzas</h1>
          <p className="text-sm text-ink-muted">Ingresos y egresos diarios — cómo va el negocio este mes</p>
        </div>
        <div className="flex gap-2">
          <Select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-40">
            {MONTH_NAMES.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </Select>
          <Select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-28">
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}
      {error && <ErrorBanner message={error} />}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Kpi label="Ingresos del mes" value={formatCurrency(data.summary.totalIncome)} tone="success" />
            <Kpi label="Egresos del mes" value={formatCurrency(data.summary.totalExpenses)} tone="danger" />
            <Kpi
              label="Resultado neto"
              value={formatCurrency(data.summary.netProfit)}
              tone={data.summary.netProfit >= 0 ? "success" : "danger"}
            />
          </div>

          <Card>
            <CardHeader title="Ingresos y egresos por día" subtitle={`${MONTH_NAMES[month - 1]} ${year}`} />
            <div className="h-72 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tickFormatter={dayLabel} stroke="var(--text-muted)" fontSize={12} />
                  <YAxis
                    stroke="var(--text-muted)"
                    fontSize={12}
                    tickFormatter={(v) => formatCurrency(v)}
                    width={80}
                  />
                  <Tooltip
                    labelFormatter={(v) => `Día ${dayLabel(String(v))}`}
                    formatter={(v: number) => formatCurrency(v)}
                    contentStyle={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
                  />
                  <Legend />
                  <Bar dataKey="income" name="Ingresos" fill="var(--success)" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="expenses" name="Egresos" fill="var(--danger)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="De dónde vienen los ingresos" />
              <dl className="space-y-3 p-4 text-sm">
                <BreakdownRow label="Pagos de reparaciones" value={data.summary.incomeBreakdown.payments} />
                <BreakdownRow label="Ventas de mostrador" value={data.summary.incomeBreakdown.sales} />
                <BreakdownRow label="Otros ingresos (Caja)" value={data.summary.incomeBreakdown.otherIncome} />
              </dl>
            </Card>
            <Card>
              <CardHeader title="A dónde van los egresos" />
              <dl className="space-y-3 p-4 text-sm">
                <BreakdownRow label="Gastos registrados en Caja" value={data.summary.expenseBreakdown.cashExpenses} />
                <BreakdownRow label="Compras a proveedores" value={data.summary.expenseBreakdown.purchases} />
              </dl>
            </Card>
          </div>

          <p className="text-xs text-ink-muted">
            Las compras a proveedores se cuentan como egreso en la fecha de la compra, sin importar si
            ya se pagaron por completo — es una simplificación deliberada (no hay una fecha de "pago
            real" registrada por separado de la compra misma).
          </p>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: "success" | "danger" }) {
  const toneClass = tone === "success" ? "text-success" : "text-danger";
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-ink-muted">{label}</p>
      <p className={`mt-1 font-mono text-xl tabular ${toneClass}`}>{value}</p>
    </Card>
  );
}

function BreakdownRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-mono tabular text-ink">{formatCurrency(value)}</dd>
    </div>
  );
}
