import { Link, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { CashRegister } from "@/lib/types";
import { Card, CardHeader, EmptyState, ErrorBanner, Spinner } from "@/components/ui";
import { formatCurrency, formatDateTime } from "@/lib/format";

export function CashRegisterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: register, loading, error } = useFetch(
    () => api.get<CashRegister>(`/cash-registers/${id}`),
    [id],
  );

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }
  if (error || !register) {
    return <ErrorBanner message={error ?? "Caja no encontrada"} />;
  }

  const diff = Number(register.difference ?? 0);

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <Link to="/cash" className="text-xs text-ink-muted hover:text-accent">
          ← Volver a Caja
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-ink">
          Caja del {formatDateTime(register.openedAt)}
        </h1>
        <p className="text-sm text-ink-muted">
          Abierta por {register.openedBy.fullName}
          {register.closedBy && <> · Cerrada por {register.closedBy.fullName}</>}
        </p>
      </div>

      <Card className="p-5">
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <Money label="Apertura" value={register.openingAmount} />
          <Money label="Esperado" value={register.expectedAmount ?? 0} />
          <Money label="Contado" value={register.closingAmount ?? 0} />
          <Money
            label="Diferencia"
            value={diff}
            tone={diff === 0 ? undefined : diff > 0 ? "success" : "danger"}
          />
        </div>
        {diff !== 0 && (
          <p className="mt-3 text-xs text-ink-muted">
            {diff > 0 ? "Sobró dinero al cerrar respecto a lo esperado." : "Faltó dinero al cerrar respecto a lo esperado."}
          </p>
        )}
      </Card>

      <Card>
        <CardHeader title="Movimientos de este turno" />
        {register.movements && register.movements.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-2">Hora</th>
                <th className="px-4 py-2">Categoría</th>
                <th className="px-4 py-2">Monto</th>
                <th className="px-4 py-2">Usuario</th>
              </tr>
            </thead>
            <tbody>
              {register.movements.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 tabular text-ink-muted">{formatDateTime(m.date)}</td>
                  <td className="px-4 py-2 text-ink">{m.category}</td>
                  <td className={`px-4 py-2 tabular ${m.type === "INCOME" ? "text-success" : "text-danger"}`}>
                    {m.type === "INCOME" ? "+" : "-"}
                    {formatCurrency(m.amount)}
                  </td>
                  <td className="px-4 py-2 text-ink-muted">{m.user.fullName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState title="Sin movimientos registrados en este turno" />
        )}
      </Card>
    </div>
  );
}

function Money({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "success" | "danger";
}) {
  const toneClass = tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-ink";
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-ink-muted">{label}</p>
      <p className={`font-mono tabular ${toneClass}`}>{formatCurrency(value)}</p>
    </div>
  );
}
