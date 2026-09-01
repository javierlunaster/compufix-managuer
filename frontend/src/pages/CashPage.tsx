import { useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { CashRegister } from "@/lib/types";
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
  Select,
  Spinner,
} from "@/components/ui";
import { formatCurrency, formatDateTime } from "@/lib/format";

export function CashPage() {
  const { data: current, loading, error, reload } = useFetch(
    () => api.get<CashRegister | null>("/cash-registers/current"),
    [],
  );

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold text-ink">Caja</h1>

      {loading && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}
      {error && <ErrorBanner message={error} />}

      {!loading && !error && (current ? (
        <OpenRegisterView register={current} onChanged={reload} />
      ) : (
        <OpenRegisterForm onOpened={reload} />
      ))}

      <CashHistorySection />
    </div>
  );
}

function CashHistorySection() {
  const { data: registers, loading, error } = useFetch(
    () => api.get<CashRegister[]>("/cash-registers"),
    [],
  );

  // El historial ya viene ordenado del más reciente al más antiguo, y la
  // caja abierta actual (si existe) también aparece en esta lista — se
  // omite aquí para no duplicar lo que ya se ve arriba en detalle.
  const closedRegisters = (registers ?? []).filter((r) => r.status === "CLOSED");

  return (
    <Card>
      <CardHeader title="Historial de cajas" subtitle="Arqueos de días anteriores" />
      {loading && (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      )}
      {error && (
        <div className="p-4">
          <ErrorBanner message={error} />
        </div>
      )}
      {!loading && !error && closedRegisters.length === 0 && (
        <EmptyState title="Sin cajas cerradas todavía" />
      )}
      {!loading && closedRegisters.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-2">Apertura</th>
              <th className="px-4 py-2">Cierre</th>
              <th className="px-4 py-2">Esperado</th>
              <th className="px-4 py-2">Contado</th>
              <th className="px-4 py-2">Diferencia</th>
            </tr>
          </thead>
          <tbody>
            {closedRegisters.map((r) => {
              const diff = Number(r.difference ?? 0);
              return (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-raised">
                  <td className="px-4 py-3">
                    <Link to={`/cash/${r.id}`} className="tabular text-accent">
                      {formatDateTime(r.openedAt)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 tabular text-ink-muted">
                    {r.closedAt ? formatDateTime(r.closedAt) : "—"}
                  </td>
                  <td className="px-4 py-3 tabular text-ink-muted">{formatCurrency(r.expectedAmount ?? 0)}</td>
                  <td className="px-4 py-3 tabular text-ink">{formatCurrency(r.closingAmount ?? 0)}</td>
                  <td className={`px-4 py-3 tabular ${diff === 0 ? "text-ink-muted" : diff > 0 ? "text-success" : "text-danger"}`}>
                    {formatCurrency(diff)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function OpenRegisterForm({ onOpened }: { onOpened: () => void }) {
  const [openingAmount, setOpeningAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post("/cash-registers/open", { openingAmount: Number(openingAmount) });
      onOpened();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo abrir la caja");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="No hay una caja abierta" subtitle="Abre la caja del día para empezar a registrar movimientos" />
      <form onSubmit={handleSubmit} className="flex items-end gap-3 p-4">
        {error && <ErrorBanner message={error} />}
        <Field label="Monto de apertura">
          <Input
            type="number"
            min={0}
            value={openingAmount}
            onChange={(e) => setOpeningAmount(e.target.value)}
            required
          />
        </Field>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Abriendo…" : "Abrir caja"}
        </Button>
      </form>
    </Card>
  );
}

function OpenRegisterView({ register, onChanged }: { register: CashRegister; onChanged: () => void }) {
  const income = (register.movements ?? [])
    .filter((m) => m.type === "INCOME")
    .reduce((sum, m) => sum + Number(m.amount), 0);
  const expense = (register.movements ?? [])
    .filter((m) => m.type === "EXPENSE")
    .reduce((sum, m) => sum + Number(m.amount), 0);
  const expected = Number(register.openingAmount) + income - expense;

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-muted">Caja abierta</p>
            <p className="text-sm text-ink-muted">
              Desde {formatDateTime(register.openedAt)} · {register.openedBy.fullName}
            </p>
          </div>
          <span className="rounded-full border border-success/30 bg-success/10 px-3 py-1 font-mono text-xs uppercase text-success">
            Abierta
          </span>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-4 border-t border-border pt-4 text-sm">
          <Money label="Apertura" value={register.openingAmount} />
          <Money label="Ingresos" value={income} />
          <Money label="Egresos" value={expense} />
          <Money label="Esperado" value={expected} emphasize />
        </div>
      </Card>

      <AddMovementForm onAdded={onChanged} />

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
          <EmptyState title="Sin movimientos todavía" />
        )}
      </Card>

      <CloseRegisterForm registerId={register.id} expected={expected} onClosed={onChanged} />
    </div>
  );
}

function Money({ label, value, emphasize }: { label: string; value: string | number; emphasize?: boolean }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-ink-muted">{label}</p>
      <p className={`font-mono tabular ${emphasize ? "text-lg text-accent" : "text-ink"}`}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}

function AddMovementForm({ onAdded }: { onAdded: () => void }) {
  const [type, setType] = useState("EXPENSE");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post("/cash-registers/movements", {
        type,
        category,
        amount: Number(amount),
        description: description || undefined,
      });
      setCategory("");
      setAmount("");
      setDescription("");
      onAdded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo registrar el movimiento");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Registrar movimiento" subtitle="Gastos, envíos, u otros ingresos/egresos" />
      <form onSubmit={handleSubmit} className="space-y-3 p-4">
        {error && <ErrorBanner message={error} />}
        <div className="grid grid-cols-4 gap-3">
          <Field label="Tipo">
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="EXPENSE">Egreso</option>
              <option value="INCOME">Ingreso</option>
            </Select>
          </Field>
          <Field label="Categoría">
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Envíos, Gastos…"
              required
            />
          </Field>
          <Field label="Monto">
            <Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </Field>
          <Field label="Descripción (opcional)">
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </div>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Registrando…" : "Registrar"}
        </Button>
      </form>
    </Card>
  );
}

function CloseRegisterForm({
  registerId,
  expected,
  onClosed,
}: {
  registerId: number;
  expected: number;
  onClosed: () => void;
}) {
  const [closingAmount, setClosingAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ difference: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const closed = await api.post<{ difference: string }>(`/cash-registers/${registerId}/close`, {
        closingAmount: Number(closingAmount),
      });
      setResult(closed);
      onClosed();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cerrar la caja");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Cerrar caja" subtitle={`Esperado según el sistema: ${formatCurrency(expected)}`} />
      <form onSubmit={handleSubmit} className="flex items-end gap-3 p-4">
        {error && <ErrorBanner message={error} />}
        <Field label="Monto contado físicamente">
          <Input
            type="number"
            min={0}
            value={closingAmount}
            onChange={(e) => setClosingAmount(e.target.value)}
            required
          />
        </Field>
        <Button type="submit" variant="danger" disabled={saving}>
          {saving ? "Cerrando…" : "Cerrar caja"}
        </Button>
      </form>
      {result && (
        <p className="px-4 pb-4 text-sm text-ink-muted">
          Diferencia: <span className="tabular text-ink">{formatCurrency(result.difference)}</span>{" "}
          {Number(result.difference) === 0
            ? "(cuadró exacto)"
            : Number(result.difference) > 0
              ? "(sobró)"
              : "(faltó)"}
        </p>
      )}
    </Card>
  );
}
