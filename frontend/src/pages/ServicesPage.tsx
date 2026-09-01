import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { Service } from "@/lib/types";
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
  Spinner,
} from "@/components/ui";
import { formatCurrency } from "@/lib/format";

export function ServicesPage() {
  const [showForm, setShowForm] = useState(false);
  const { data: services, loading, error, reload } = useFetch(
    () => api.get<Service[]>("/services"),
    [],
  );

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Servicios</h1>
          <p className="text-sm text-ink-muted">Catálogo de servicios y su precio, usado en cotizaciones</p>
        </div>
        <Button variant="primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancelar" : "+ Nuevo servicio"}
        </Button>
      </div>

      {showForm && (
        <div className="mb-4">
          <ServiceForm
            onSaved={() => {
              setShowForm(false);
              reload();
            }}
          />
        </div>
      )}

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
        {!loading && !error && services?.length === 0 && (
          <EmptyState title="Sin servicios registrados" description="Crea el primero con “+ Nuevo servicio”" />
        )}
        {!loading && services && services.length > 0 && (
          <ul className="divide-y divide-border">
            {services.map((s) => (
              <ServiceRow key={s.id} service={s} onChanged={reload} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function ServiceRow({ service, onChanged }: { service: Service; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggleStatus() {
    const action = service.status === "INACTIVE" ? "reactivate" : "deactivate";
    if (action === "deactivate") {
      const confirmed = confirm(
        `¿Desactivar "${service.name}"? Dejará de aparecer en el buscador para nuevas cotizaciones.`,
      );
      if (!confirmed) return;
    }
    setError(null);
    setBusy(true);
    try {
      if (action === "deactivate") {
        await api.patch(`/services/${service.id}/deactivate`);
      } else {
        await api.patch(`/services/${service.id}/reactivate`);
      }
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo completar la acción");
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <li className="p-4">
        <ServiceForm
          service={service}
          onSaved={() => {
            setEditing(false);
            onChanged();
          }}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between px-4 py-3 text-sm">
      <div>
        <p className="text-ink">
          {service.name}
          {service.status === "INACTIVE" && (
            <span className="ml-2 text-xs uppercase text-danger">Inactivo</span>
          )}
        </p>
        <p className="text-xs text-ink-muted">
          {service.code ? `${service.code} · ` : ""}
          {formatCurrency(service.basePrice)}
          {service.warrantyMonths ? ` · Garantía ${service.warrantyMonths} meses` : ""}
        </p>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
      <div className="flex gap-3">
        <button onClick={() => setEditing(true)} className="text-xs text-ink-muted hover:text-accent">
          Editar
        </button>
        <button
          onClick={handleToggleStatus}
          disabled={busy}
          className={`text-xs hover:underline ${service.status === "INACTIVE" ? "text-accent" : "text-danger"}`}
        >
          {service.status === "INACTIVE" ? "Reactivar" : "Desactivar"}
        </button>
      </div>
    </li>
  );
}

function ServiceForm({
  service,
  onSaved,
  onCancel,
}: {
  service?: Service;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const [code, setCode] = useState(service?.code ?? "");
  const [name, setName] = useState(service?.name ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [basePrice, setBasePrice] = useState(service?.basePrice ?? "");
  const [estimatedCost, setEstimatedCost] = useState(service?.estimatedCost ?? "");
  const [warrantyMonths, setWarrantyMonths] = useState(
    service?.warrantyMonths ? String(service.warrantyMonths) : "",
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        code: code || undefined,
        name,
        description: description || undefined,
        basePrice: Number(basePrice),
        estimatedCost: estimatedCost ? Number(estimatedCost) : undefined,
        warrantyMonths: warrantyMonths ? Number(warrantyMonths) : undefined,
      };
      if (service) {
        await api.patch(`/services/${service.id}`, payload);
      } else {
        await api.post("/services", payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el servicio");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title={service ? "Editar servicio" : "Nuevo servicio"} />
      <form onSubmit={handleSubmit} className="space-y-3 p-4">
        {error && <ErrorBanner message={error} />}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre del servicio">
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Código de facturación (opcional)">
            <Input value={code} onChange={(e) => setCode(e.target.value)} />
          </Field>
        </div>

        <Field label="Descripción (opcional)">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Precio al cliente">
            <Input
              type="number"
              min={0}
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              required
            />
          </Field>
          <Field label="Costo estimado (opcional)">
            <Input type="number" min={0} value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} />
          </Field>
          <Field label="Garantía (meses, opcional)">
            <Input type="number" min={0} value={warrantyMonths} onChange={(e) => setWarrantyMonths(e.target.value)} />
          </Field>
        </div>

        <div className="flex gap-2">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Guardando…" : service ? "Guardar cambios" : "Crear servicio"}
          </Button>
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancelar
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
