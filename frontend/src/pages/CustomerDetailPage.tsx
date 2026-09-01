import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { Brand, Customer, DeviceTypeCatalog } from "@/lib/types";
import { DeviceModelDatalist, DEVICE_MODELS_DATALIST_ID } from "@/components/DeviceModelDatalist";
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

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: customer, loading, error, reload } = useFetch(
    () => api.get<Customer>(`/customers/${id}`),
    [id],
  );
  const [editing, setEditing] = useState(false);
  const [addingDevice, setAddingDevice] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleToggleStatus() {
    if (!customer) return;
    const action = customer.status === "ACTIVE" ? "deactivate" : "reactivate";
    const confirmMsg =
      customer.status === "ACTIVE"
        ? "¿Desactivar este cliente? Seguirá visible en el historial, pero no aparecerá en nuevas búsquedas."
        : "¿Reactivar este cliente?";
    if (!confirm(confirmMsg)) return;

    setBusy(true);
    setActionError(null);
    try {
      await api.patch(`/customers/${customer.id}/${action}`);
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "No se pudo completar la acción");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }
  if (error || !customer) {
    return <ErrorBanner message={error ?? "Cliente no encontrado"} />;
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">
            {customer.fullName}
            {customer.status === "INACTIVE" && (
              <span className="ml-2 text-xs uppercase text-danger">Inactivo</span>
            )}
          </h1>
          <p className="text-sm text-ink-muted">
            {customer.phone ?? "Sin teléfono"} {customer.email ? `· ${customer.email}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setEditing((e) => !e)}>
            {editing ? "Cancelar" : "Editar"}
          </Button>
          <Button
            variant={customer.status === "ACTIVE" ? "danger" : "secondary"}
            onClick={handleToggleStatus}
            disabled={busy}
          >
            {customer.status === "ACTIVE" ? "Desactivar" : "Reactivar"}
          </Button>
        </div>
      </div>

      {actionError && <ErrorBanner message={actionError} />}

      {editing ? (
        <EditCustomerForm
          customer={customer}
          onSaved={() => {
            setEditing(false);
            reload();
          }}
        />
      ) : (
        <Card>
          <CardHeader title="Datos de contacto" />
          <dl className="grid grid-cols-2 gap-4 p-4 text-sm">
            <Detail label="Documento" value={customer.documentId} />
            <Detail label="WhatsApp" value={customer.whatsapp} />
            <Detail label="Correo" value={customer.email} />
            <Detail label="Ciudad" value={customer.city} />
            <Detail label="Dirección" value={customer.address} />
          </dl>
        </Card>
      )}

      <Card>
        <CardHeader title="Equipos" subtitle="Historial de equipos registrados a este cliente" />
        {customer.devices && customer.devices.length > 0 ? (
          <ul className="divide-y divide-border">
            {customer.devices.map((d) => (
              <li key={d.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <Link to={`/devices/${d.id}`} className="text-ink hover:text-accent">
                    {d.brand?.name} {d.model} — {d.deviceType?.name}
                  </Link>
                  {d.serialNumber && (
                    <p className="font-mono text-xs text-ink-muted">Serial: {d.serialNumber}</p>
                  )}
                </div>
                <Link
                  to={`/repair-orders/new?customerId=${customer.id}&deviceId=${d.id}`}
                  className="text-xs text-accent hover:underline"
                >
                  Nueva reparación →
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Sin equipos registrados aún" />
        )}
        <div className="border-t border-border p-4">
          {addingDevice ? (
            <NewDeviceForm
              customerId={customer.id}
              onCreated={() => {
                setAddingDevice(false);
                reload();
              }}
              onCancel={() => setAddingDevice(false)}
            />
          ) : (
            <Button variant="secondary" onClick={() => setAddingDevice(true)}>
              + Nuevo equipo
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="text-ink">{value ?? "—"}</dd>
    </div>
  );
}

function EditCustomerForm({ customer, onSaved }: { customer: Customer; onSaved: () => void }) {
  const [fullName, setFullName] = useState(customer.fullName);
  const [phone, setPhone] = useState(customer.phone ?? "");
  const [whatsapp, setWhatsapp] = useState(customer.whatsapp ?? "");
  const [documentId, setDocumentId] = useState(customer.documentId ?? "");
  const [email, setEmail] = useState(customer.email ?? "");
  const [city, setCity] = useState(customer.city ?? "");
  const [address, setAddress] = useState(customer.address ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.patch(`/customers/${customer.id}`, {
        fullName,
        phone: phone || undefined,
        whatsapp: whatsapp || undefined,
        documentId: documentId || undefined,
        email: email || undefined,
        city: city || undefined,
        address: address || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar los cambios");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Editar datos de contacto" />
      <form onSubmit={handleSubmit} className="space-y-3 p-4">
        {error && <ErrorBanner message={error} />}

        <Field label="Nombre completo / razón social">
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Teléfono">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="WhatsApp">
            <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Documento">
            <Input value={documentId} onChange={(e) => setDocumentId(e.target.value)} />
          </Field>
          <Field label="Correo">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ciudad">
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </Field>
          <Field label="Dirección">
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </Field>
        </div>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </Button>
      </form>
    </Card>
  );
}

/**
 * Registrar un equipo sin crear una reparación al mismo tiempo — útil
 * cuando un cliente quiere dejar un segundo equipo en su ficha antes de
 * traerlo, o simplemente para tener el historial completo de sus equipos
 * sin que cada uno tenga que empezar con una orden.
 */
function NewDeviceForm({
  customerId,
  onCreated,
  onCancel,
}: {
  customerId: number;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const { data: brands } = useFetch(() => api.get<Brand[]>("/catalogs/brands"), []);
  const { data: deviceTypes } = useFetch(
    () => api.get<DeviceTypeCatalog[]>("/catalogs/device-types"),
    [],
  );

  const [deviceTypeId, setDeviceTypeId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!deviceTypeId) {
      setError("Selecciona el tipo de equipo");
      return;
    }
    setSaving(true);
    try {
      await api.post("/devices", {
        customerId,
        deviceTypeId: Number(deviceTypeId),
        brandId: brandId ? Number(brandId) : undefined,
        model: model || undefined,
        serialNumber: serialNumber || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo registrar el equipo");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <ErrorBanner message={error} />}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo de equipo">
          <Select value={deviceTypeId} onChange={(e) => setDeviceTypeId(e.target.value)}>
            <option value="">Selecciona…</option>
            {deviceTypes?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Marca (opcional)">
          <Select value={brandId} onChange={(e) => setBrandId(e.target.value)}>
            <option value="">Sin marca</option>
            {brands?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Modelo (opcional)">
          <Input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            list={DEVICE_MODELS_DATALIST_ID}
          />
          <DeviceModelDatalist brandId={brandId} deviceTypeId={deviceTypeId} />
        </Field>
        <Field label="Número de serie (opcional)">
          <Input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
        </Field>
      </div>
      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Guardando…" : "Registrar equipo"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
