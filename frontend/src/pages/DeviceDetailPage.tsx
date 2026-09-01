import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { Brand, Device, DeviceTypeCatalog } from "@/lib/types";
import { REPAIR_STATUS_LABELS } from "@/lib/types";
import { StatusPill } from "@/components/StatusPill";
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
import { formatDate } from "@/lib/format";

export function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: device, loading, error, reload } = useFetch(
    () => api.get<Device>(`/devices/${id}`),
    [id],
  );
  const [editing, setEditing] = useState(false);

  async function handleDeactivate() {
    if (!device) return;
    if (!confirm("¿Desactivar este equipo? Ya no aparecerá para nuevas recepciones.")) return;
    try {
      await api.patch(`/devices/${device.id}/deactivate`);
      navigate(`/customers/${device.customerId}`);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo desactivar");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }
  if (error || !device) {
    return <ErrorBanner message={error ?? "Equipo no encontrado"} />;
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-ink-muted">
            {device.customer && (
              <Link to={`/customers/${device.customer.id}`} className="text-accent hover:underline">
                {device.customer.fullName}
              </Link>
            )}
          </p>
          <h1 className="text-xl font-semibold text-ink">
            {device.brand?.name} {device.model}
          </h1>
          {device.status === "INACTIVE" && (
            <span className="text-xs uppercase text-danger">Inactivo</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setEditing((e) => !e)}>
            {editing ? "Cancelar" : "Editar"}
          </Button>
          {device.status !== "INACTIVE" && (
            <Button variant="danger" onClick={handleDeactivate}>
              Desactivar
            </Button>
          )}
        </div>
      </div>

      {editing ? (
        <EditDeviceForm
          device={device}
          onSaved={() => {
            setEditing(false);
            reload();
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <Card>
          <CardHeader title="Ficha técnica" />
          <dl className="grid grid-cols-2 gap-4 p-4 text-sm">
            <Detail label="Tipo" value={device.deviceType?.name} />
            <Detail label="Número de serie" value={device.serialNumber} />
            <Detail label="Placa" value={device.boardModel} />
            <Detail label="Procesador" value={device.cpu} />
            <Detail label="RAM" value={device.ram} />
            <Detail label="Disco" value={device.disk} />
            <Detail label="Sistema operativo" value={device.operatingSystem} />
          </dl>
        </Card>
      )}

      <Card>
        <CardHeader
          title="Historial de reparaciones"
          subtitle="Todas las veces que este equipo ha pasado por el taller, sin importar quién lo trajo"
        />
        {device.repairOrders && device.repairOrders.length > 0 ? (
          <ul className="divide-y divide-border">
            {device.repairOrders.map((o) => (
              <li key={o.id}>
                <Link
                  to={`/repair-orders/${o.id}`}
                  className="flex items-center justify-between px-4 py-3 text-sm hover:bg-surface-raised"
                >
                  <span className="font-mono text-accent">{o.orderCode}</span>
                  <span className="text-ink-muted">{formatDate(o.entryDate)}</span>
                  <StatusPill status={o.status} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Sin reparaciones registradas todavía para este equipo" />
        )}
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="text-ink">{value || "—"}</dd>
    </div>
  );
}

function EditDeviceForm({
  device,
  onSaved,
  onCancel,
}: {
  device: Device;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { data: brands } = useFetch(() => api.get<Brand[]>("/catalogs/brands"), []);
  const { data: deviceTypes } = useFetch(
    () => api.get<DeviceTypeCatalog[]>("/catalogs/device-types"),
    [],
  );

  const [deviceTypeId, setDeviceTypeId] = useState(String(device.deviceTypeId));
  const [brandId, setBrandId] = useState(device.brandId ? String(device.brandId) : "");
  const [model, setModel] = useState(device.model ?? "");
  const [serialNumber, setSerialNumber] = useState(device.serialNumber ?? "");
  const [cpu, setCpu] = useState(device.cpu ?? "");
  const [ram, setRam] = useState(device.ram ?? "");
  const [disk, setDisk] = useState(device.disk ?? "");
  const [operatingSystem, setOperatingSystem] = useState(device.operatingSystem ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.patch(`/devices/${device.id}`, {
        deviceTypeId: Number(deviceTypeId),
        brandId: brandId ? Number(brandId) : undefined,
        model: model || undefined,
        serialNumber: serialNumber || undefined,
        cpu: cpu || undefined,
        ram: ram || undefined,
        disk: disk || undefined,
        operatingSystem: operatingSystem || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Editar ficha técnica" />
      <form onSubmit={handleSubmit} className="space-y-3 p-4">
        {error && <ErrorBanner message={error} />}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo">
            <Select value={deviceTypeId} onChange={(e) => setDeviceTypeId(e.target.value)}>
              {deviceTypes?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Marca">
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
          <Field label="Modelo">
            <Input value={model} onChange={(e) => setModel(e.target.value)} list={DEVICE_MODELS_DATALIST_ID} />
            <DeviceModelDatalist brandId={brandId} deviceTypeId={deviceTypeId} />
          </Field>
          <Field label="Número de serie">
            <Input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Procesador">
            <Input value={cpu} onChange={(e) => setCpu(e.target.value)} />
          </Field>
          <Field label="RAM">
            <Input value={ram} onChange={(e) => setRam(e.target.value)} />
          </Field>
          <Field label="Disco">
            <Input value={disk} onChange={(e) => setDisk(e.target.value)} />
          </Field>
        </div>
        <Field label="Sistema operativo">
          <Input value={operatingSystem} onChange={(e) => setOperatingSystem(e.target.value)} />
        </Field>
        <div className="flex gap-2">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
