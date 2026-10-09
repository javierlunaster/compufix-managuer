import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { Customer, Paginated, ServiceJobDetail } from "@/lib/types";
import { Button, Card, CardHeader, ErrorBanner, Field, Input, Select } from "@/components/ui";
import { formatCurrency } from "@/lib/format";

type CustomerLite = Pick<Customer, "id" | "fullName" | "phone">;

type DraftItem = {
  key: string;
  brand: string;
  code: string;
  observation: string;
  value: string;
};

function emptyItem(): DraftItem {
  return { key: crypto.randomUUID(), brand: "", code: "", observation: "", value: "" };
}

function draftItemsFrom(existing?: ServiceJobDetail): DraftItem[] {
  if (!existing || existing.items.length === 0) return [emptyItem()];
  return existing.items.map((i) => ({
    key: crypto.randomUUID(),
    brand: i.brand,
    code: i.code ?? "",
    observation: i.observation,
    value: i.value,
  }));
}

/**
 * Formulario de un servicio externo, usado tanto para crear uno nuevo
 * como para editar uno existente antes de que el cliente lo pague (ver
 * ServiceJobsService.update en el backend — una vez pagado ya no se puede
 * tocar). Cuando `existing` viene presente, el estado se siembra con sus
 * datos y el envío hace PATCH en vez de POST.
 */
export function ServiceJobForm({
  existing,
  onSaved,
  onCancel,
}: {
  existing?: ServiceJobDetail;
  onSaved: (job: ServiceJobDetail) => void;
  onCancel?: () => void;
}) {
  const { data: technicians } = useFetch(
    () => api.get<{ id: number; fullName: string }[]>("/catalogs/technicians"),
    [],
  );

  const [date, setDate] = useState(() =>
    existing ? existing.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
  );
  const [customer, setCustomer] = useState<CustomerLite | null>(existing?.customer ?? null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerLite[]>([]);
  const [technicianId, setTechnicianId] = useState(
    existing ? String(existing.technician.id) : "",
  );
  const [description, setDescription] = useState(existing?.description ?? "");
  const [technicianPercentage, setTechnicianPercentage] = useState(() => {
    if (!existing) return "60";
    const charged = Number(existing.chargedAmount);
    return charged > 0 ? String(Math.round((Number(existing.amountToPayTechnician) / charged) * 100)) : "60";
  });
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [items, setItems] = useState<DraftItem[]>(() => draftItemsFrom(existing));

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function searchCustomers(term: string) {
    setCustomerSearch(term);
    if (term.trim().length < 2) {
      setCustomerResults([]);
      return;
    }
    const result = await api.get<Paginated<Customer>>("/customers", { search: term });
    setCustomerResults(result.data);
  }

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(key: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((i) => i.key !== key) : prev));
  }

  const chargedAmount = items.reduce((sum, i) => sum + (Number(i.value) || 0), 0);
  const pct = Number(technicianPercentage) || 0;
  const technicianAmount = Math.round(chargedAmount * (pct / 100));
  const shopAmount = chargedAmount - technicianAmount;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!customer) {
      setError("Selecciona un cliente primero");
      return;
    }
    if (!technicianId) {
      setError("Selecciona el técnico asignado");
      return;
    }
    const validItems = items.filter((i) => i.brand.trim() && i.observation.trim() && Number(i.value) > 0);
    if (validItems.length === 0) {
      setError("Agrega al menos un equipo con marca, observación y valor");
      return;
    }

    const payload = {
      date,
      customerId: customer.id,
      technicianId: Number(technicianId),
      description,
      technicianPercentage: pct,
      notes: notes || undefined,
      items: validItems.map((i) => ({
        brand: i.brand,
        code: i.code || undefined,
        observation: i.observation,
        value: Number(i.value),
      })),
    };

    setSaving(true);
    try {
      const saved = existing
        ? await api.patch<ServiceJobDetail>(`/service-jobs/${existing.id}`, payload)
        : await api.post<ServiceJobDetail>("/service-jobs", payload);
      onSaved(saved);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : existing
            ? "No se pudo guardar los cambios"
            : "No se pudo crear el servicio externo",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <ErrorBanner message={error} />}

      <Card>
        <CardHeader title="Cliente y técnico" />
        <div className="space-y-3 p-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </Field>
            <Field label="Técnico asignado">
              <Select value={technicianId} onChange={(e) => setTechnicianId(e.target.value)}>
                <option value="">Selecciona…</option>
                {technicians?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Cliente">
            {customer ? (
              <div className="flex items-center justify-between rounded border border-accent/30 bg-accent/5 px-3 py-2">
                <div>
                  <p className="text-ink">{customer.fullName}</p>
                  <p className="text-xs text-ink-muted">{customer.phone}</p>
                </div>
                <button
                  type="button"
                  className="text-xs text-ink-muted hover:text-accent"
                  onClick={() => setCustomer(null)}
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  value={customerSearch}
                  onChange={(e) => searchCustomers(e.target.value)}
                  placeholder="Buscar cliente por nombre o teléfono…"
                />
                {customerResults.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full rounded border border-border bg-surface-raised shadow-lg">
                    {customerResults.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-bg"
                          onClick={() => {
                            setCustomer(c);
                            setCustomerResults([]);
                          }}
                        >
                          {c.fullName} <span className="text-ink-muted">{c.phone}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Field>

          <Field label="Descripción general del trabajo">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. revisión y reparación de equipos"
              required
            />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Equipos atendidos" subtitle="Una fila por equipo — igual que la cuenta de cobro en papel" />
        <div className="space-y-3 p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
                <th className="py-1 pr-2">Marca</th>
                <th className="py-1 pr-2">Código de ingreso</th>
                <th className="py-1 pr-2">Observación</th>
                <th className="py-1 pr-2 w-32">Valor</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.key} className="border-b border-border/50">
                  <td className="py-2 pr-2">
                    <Input
                      value={item.brand}
                      onChange={(e) => updateItem(item.key, { brand: e.target.value })}
                      placeholder="Lenovo"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <Input
                      value={item.code}
                      onChange={(e) => updateItem(item.key, { code: e.target.value })}
                      placeholder="Opcional"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <Input
                      value={item.observation}
                      onChange={(e) => updateItem(item.key, { observation: e.target.value })}
                      placeholder="Cambio de pin de carga, mantenimiento…"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <Input
                      type="number"
                      min={0}
                      value={item.value}
                      onChange={(e) => updateItem(item.key, { value: e.target.value })}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => removeItem(item.key)}
                      className="text-xs text-danger hover:underline"
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Button type="button" variant="secondary" onClick={addItem}>
            + Agregar equipo
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Reparto del pago" subtitle="No aparece en la cuenta de cobro — es contabilidad interna" />
        <div className="space-y-3 p-4">
          <Field label="% para el técnico">
            <Input
              type="number"
              min={0}
              max={100}
              value={technicianPercentage}
              onChange={(e) => setTechnicianPercentage(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-3 gap-4 border-t border-border pt-3 text-sm">
            <div>
              <p className="text-xs uppercase text-ink-muted">Total cobrado</p>
              <p className="tabular text-ink">{formatCurrency(chargedAmount)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-ink-muted">Para el taller</p>
              <p className="tabular text-ink">{formatCurrency(shopAmount)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-ink-muted">Para el técnico</p>
              <p className="tabular text-accent">{formatCurrency(technicianAmount)}</p>
            </div>
          </div>
          <Field label="Notas (opcional)">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Guardando…" : existing ? "Guardar cambios" : "Crear servicio externo"}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
