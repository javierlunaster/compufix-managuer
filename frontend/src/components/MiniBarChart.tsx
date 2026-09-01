/**
 * Gráfico de barras minimalista hecho a mano (CSS puro, sin librería de
 * gráficos) — misma decisión que ya se tomó para el resto del frontend
 * (sin React Query, sin librería de componentes): mantener el bundle
 * liviano mientras se valida el flujo completo. Si el Dashboard crece
 * mucho más allá de esto, migrar a una librería como recharts es el
 * siguiente paso natural.
 */
export function MiniBarChart({
  data,
  formatValue = (v) => String(v),
}: {
  data: { label: string; value: number }[];
  formatValue?: (value: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  if (data.length === 0) {
    return <p className="p-4 text-sm text-ink-muted">Sin datos todavía</p>;
  }

  return (
    <div className="flex items-end gap-2 px-4 pb-2 pt-6" style={{ height: 160 }}>
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
          <span className="font-mono text-[10px] tabular text-ink-muted">{formatValue(d.value)}</span>
          <div
            className="w-full rounded-t bg-accent/70"
            style={{ height: `${Math.max((d.value / max) * 100, 2)}px` }}
          />
          <span className="w-full truncate text-center text-[10px] text-ink-muted" title={d.label}>
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}
