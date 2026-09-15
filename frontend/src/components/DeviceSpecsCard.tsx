import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { Brand, Device, DeviceTypeCatalog } from "@/lib/types";
import { DeviceModelDatalist, DEVICE_MODELS_DATALIST_ID } from "@/components/DeviceModelDatalist";
import { Button, Card, CardHeader, ErrorBanner, Field, Input, Select } from "@/components/ui";

/**
 * Ficha técnica del equipo, con edición en línea — pensada para el caso
 * real de que al recibir el equipo no se haya alcanzado a anotar el
 * serial, el modelo, o cualquier otro dato técnico, y alguien necesite
 * completarlo o corregirlo después, sin tener que ir hasta la ficha del
 * cliente a buscar el equipo. Se usa tanto aquí (detalle de una orden)
 * como en DeviceDetailPage — un solo lugar para no repetir el formulario.
 */
export function DeviceSpecsCard({
  device,
  onUpdated,
  subtitle,
}: {
  device: Device;
  onUpdated: (updated: Device) => void;
  subtitle?: string;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <Card>
      <CardHeader
        title="Ficha técnica del equipo"
        subtitle={subtitle}
        action={
          <Button variant="secondary" onClick={() => setEditing((e) => !e)}>
            {editing ? "Cancelar" : "Editar"}
          </Button>
        }
      />
      {editing ? (
        <DeviceSpecsForm
          device={device}
          onSaved={(updated) => {
            setEditing(false);
            onUpdated(updated);
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <dl className="grid grid-cols-2 gap-4 p-4 text-sm">
          <Detail label="Tipo" value={device.deviceType?.name} />
          <Detail label="Marca" value={device.brand?.name} />
          <Detail label="Modelo" value={device.model} />
          <Detail label="Número de serie" value={device.serialNumber} />
          <Detail label="Placa" value={device.boardModel} />
          <Detail label="Procesador" value={device.cpu} />
          <Detail label="RAM" value={device.ram} />
          <Detail label="Disco" value={device.disk} />
          <Detail label="Sistema operativo" value={device.operatingSystem} />
          <Detail label="Notas del equipo" value={device.notes} />
        </dl>
      )}
    </Card>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className={value ? "text-ink" : "text-danger"}>{value || "Sin diligenciar"}</dd>
    </div>
  );
}

function DeviceSpecsForm({
  device,
  onSaved,
  onCancel,
}: {
  device: Device;
  onSaved: (updated: Device) => void;
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
  const [boardModel, setBoardModel] = useState(device.boardModel ?? "");
  const [cpu, setCpu] = useState(device.cpu ?? "");
  const [ram, setRam] = useState(device.ram ?? "");
  const [disk, setDisk] = useState(device.disk ?? "");
  const [operatingSystem, setOperatingSystem] = useState(device.operatingSystem ?? "");
  const [notes, setNotes] = useState(device.notes ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const updated = await api.patch<Device>(`/devices/${device.id}`, {
        deviceTypeId: Number(deviceTypeId),
        brandId: brandId ? Number(brandId) : undefined,
        model: model || undefined,
        serialNumber: serialNumber || undefined,
        boardModel: boardModel || undefined,
        cpu: cpu || undefined,
        ram: ram || undefined,
        disk: disk || undefined,
        operatingSystem: operatingSystem || undefined,
        notes: notes || undefined,
      });
      onSaved(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
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
      <div className="grid grid-cols-2 gap-3">
        <Field label="Placa (opcional)">
          <Input value={boardModel} onChange={(e) => setBoardModel(e.target.value)} />
        </Field>
        <Field label="Sistema operativo (opcional)">
          <Input value={operatingSystem} onChange={(e) => setOperatingSystem(e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Procesador (opcional)">
          <Input value={cpu} onChange={(e) => setCpu(e.target.value)} />
        </Field>
        <Field label="RAM (opcional)">
          <Input value={ram} onChange={(e) => setRam(e.target.value)} />
        </Field>
        <Field label="Disco (opcional)">
          <Input value={disk} onChange={(e) => setDisk(e.target.value)} />
        </Field>
      </div>
      <Field label="Notas del equipo (opcional)">
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
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
  );
}
