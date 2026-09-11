import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { Brand, Customer, Device, DeviceTypeCatalog, RepairOrderDetail } from "@/lib/types";
import {
  Button,
  Card,
  CardHeader,
  ErrorBanner,
  Field,
  Input,
  Select,
} from "@/components/ui";
import { PhotoGallery } from "@/components/PhotoGallery";
import { DeviceModelDatalist, DEVICE_MODELS_DATALIST_ID } from "@/components/DeviceModelDatalist";

export function NewRepairOrderPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const presetCustomerId = params.get("customerId");
  const presetDeviceId = params.get("deviceId");

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);

  const [deviceMode, setDeviceMode] = useState<"existing" | "new">(
    presetDeviceId ? "existing" : "new",
  );
  const [existingDevices, setExistingDevices] = useState<Device[]>([]);
  const [deviceId, setDeviceId] = useState<string>(presetDeviceId ?? "");

  const [deviceTypeId, setDeviceTypeId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [boardModel, setBoardModel] = useState("");
  const [cpu, setCpu] = useState("");
  const [ram, setRam] = useState("");
  const [disk, setDisk] = useState("");
  const [operatingSystem, setOperatingSystem] = useState("");

  const [reportedIssue, setReportedIssue] = useState("");
  const [entryReason, setEntryReason] = useState("");
  const [physicalCondition, setPhysicalCondition] = useState("");
  const [devicePassword, setDevicePassword] = useState("");
  const [chargerReceived, setChargerReceived] = useState(false);
  const [batteryReceived, setBatteryReceived] = useState(false);
  const [keyboardReceived, setKeyboardReceived] = useState(false);
  const [mouseReceived, setMouseReceived] = useState(false);

  const { data: brands } = useFetch(() => api.get<Brand[]>("/catalogs/brands"), []);
  const { data: deviceTypes } = useFetch(
    () => api.get<DeviceTypeCatalog[]>("/catalogs/device-types"),
    [],
  );

  // Precarga del cliente si viene por query param (ej. desde la ficha del cliente)
  useEffect(() => {
    if (presetCustomerId) {
      api.get<Customer>(`/customers/${presetCustomerId}`).then(setCustomer).catch(() => {});
    }
  }, [presetCustomerId]);

  // Carga los equipos del cliente elegido cuando el modo es "equipo existente"
  useEffect(() => {
    if (customer && deviceMode === "existing") {
      api.get<Device[]>("/devices", { customerId: customer.id }).then(setExistingDevices);
    }
  }, [customer, deviceMode]);

  async function searchCustomers(term: string) {
    setCustomerSearch(term);
    if (term.trim().length < 2) {
      setCustomerResults([]);
      return;
    }
    const results = await api.get<Customer[]>("/customers", { search: term });
    setCustomerResults(results);
  }

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<RepairOrderDetail | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!customer) {
      setError("Selecciona o crea un cliente primero");
      return;
    }
    if (deviceMode === "existing" && !deviceId) {
      setError("Selecciona el equipo del cliente");
      return;
    }
    if (deviceMode === "new" && !deviceTypeId) {
      setError("Indica el tipo de equipo");
      return;
    }

    setSaving(true);
    try {
      const order = await api.post<RepairOrderDetail>("/repair-orders", {
        customerId: customer.id,
        deviceId: deviceMode === "existing" ? Number(deviceId) : undefined,
        newDevice:
          deviceMode === "new"
            ? {
                deviceTypeId: Number(deviceTypeId),
                brandId: brandId ? Number(brandId) : undefined,
                model: model || undefined,
                serialNumber: serialNumber || undefined,
                boardModel: boardModel || undefined,
                cpu: cpu || undefined,
                ram: ram || undefined,
                disk: disk || undefined,
                operatingSystem: operatingSystem || undefined,
              }
            : undefined,
        reportedIssue,
        entryReason: entryReason || undefined,
        physicalCondition: physicalCondition || undefined,
        devicePassword: devicePassword || undefined,
        chargerReceived,
        batteryReceived,
        keyboardReceived,
        mouseReceived,
      });
      // No se navega todavía — primero se ofrece subir las fotos de
      // evidencia del estado del equipo, dentro del mismo flujo de
      // recepción, en vez de dejarlo como un paso aparte que alguien
      // tendría que acordarse de hacer después.
      setCreatedOrder(order);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la orden");
    } finally {
      setSaving(false);
    }
  }

  if (createdOrder) {
    return (
      <div className="max-w-2xl">
        <h1 className="mb-1 text-xl font-semibold text-ink">
          Orden <span className="font-mono text-accent">{createdOrder.orderCode}</span> creada
        </h1>
        <p className="mb-4 text-sm text-ink-muted">
          Toma fotos del estado físico del equipo antes de entregarlo al técnico — sirve como
          evidencia si más adelante hay alguna duda sobre daños previos.
        </p>
        <Card>
          <CardHeader title="Fotos del estado de ingreso" subtitle="Opcional, pero muy recomendado" />
          <div className="p-4">
            <PhotoGallery
              photos={createdOrder.photos}
              uploadUrl={`/repair-orders/${createdOrder.id}/photos`}
              onChanged={async () => {
                const refreshed = await api.get<RepairOrderDetail>(
                  `/repair-orders/${createdOrder.id}`,
                );
                setCreatedOrder(refreshed);
              }}
            />
          </div>
        </Card>
        <div className="mt-4">
          <Button variant="primary" onClick={() => navigate(`/repair-orders/${createdOrder.id}`)}>
            Continuar a la orden →
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-xl font-semibold text-ink">Recepción de equipo</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorBanner message={error} />}

        <Card>
          <CardHeader title="Cliente" />
          <div className="space-y-2 p-4">
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
          </div>
        </Card>

        <Card>
          <CardHeader title="Equipo" />
          <div className="space-y-3 p-4">
            <div className="flex gap-2 text-sm">
              <button
                type="button"
                onClick={() => setDeviceMode("new")}
                className={`rounded px-3 py-1.5 ${deviceMode === "new" ? "bg-accent/15 text-accent" : "text-ink-muted"}`}
              >
                Equipo nuevo
              </button>
              <button
                type="button"
                onClick={() => setDeviceMode("existing")}
                className={`rounded px-3 py-1.5 ${deviceMode === "existing" ? "bg-accent/15 text-accent" : "text-ink-muted"}`}
              >
                Ya registrado
              </button>
            </div>

            {deviceMode === "existing" ? (
              <>
                <Field label="Equipo del cliente">
                  <Select value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
                    <option value="">Selecciona…</option>
                    {existingDevices.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.brand?.name} {d.model} {d.serialNumber ? `(${d.serialNumber})` : ""}
                      </option>
                    ))}
                  </Select>
                </Field>
                {deviceId && (
                  <ExistingDeviceSpecs
                    device={existingDevices.find((d) => d.id === Number(deviceId))}
                    onUpdated={(updated) =>
                      setExistingDevices((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
                    }
                  />
                )}
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Tipo de equipo">
                    <Select value={deviceTypeId} onChange={(e) => setDeviceTypeId(e.target.value)} required>
                      <option value="">Selecciona…</option>
                      {deviceTypes?.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Marca">
                    <Select value={brandId} onChange={(e) => setBrandId(e.target.value)}>
                      <option value="">Selecciona…</option>
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
              </>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Detalles de la recepción" />
          <div className="space-y-3 p-4">
            <Field label="Falla reportada por el cliente">
              <Input
                value={reportedIssue}
                onChange={(e) => setReportedIssue(e.target.value)}
                required
              />
            </Field>
            <Field label="Motivo de ingreso (opcional)">
              <Input value={entryReason} onChange={(e) => setEntryReason(e.target.value)} />
            </Field>
            <Field label="Estado físico del equipo">
              <Input
                value={physicalCondition}
                onChange={(e) => setPhysicalCondition(e.target.value)}
                placeholder="Ej. rayones en la tapa, pantalla sin daños visibles…"
              />
            </Field>
            <Field label="Contraseña proporcionada (se cifra, no se guarda en texto plano)">
              <Input
                type="password"
                value={devicePassword}
                onChange={(e) => setDevicePassword(e.target.value)}
              />
            </Field>

            <div className="grid grid-cols-2 gap-2 pt-2 text-sm">
              <Checkbox label="Cargador" checked={chargerReceived} onChange={setChargerReceived} />
              <Checkbox label="Batería" checked={batteryReceived} onChange={setBatteryReceived} />
              <Checkbox label="Teclado" checked={keyboardReceived} onChange={setKeyboardReceived} />
              <Checkbox label="Mouse" checked={mouseReceived} onChange={setMouseReceived} />
            </div>
          </div>
        </Card>

        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Registrando…" : "Registrar ingreso"}
        </Button>
      </form>
    </div>
  );
}

/**
 * Resumen + edición rápida de las especificaciones de un equipo ya
 * registrado, sin salir del formulario de recepción. Antes, actualizar
 * estos datos exigía terminar de crear la orden, ir a la ficha del
 * cliente, buscar el equipo, entrar a su detalle, y recién ahí editar —
 * el mismo camino largo que se quería evitar también para equipo nuevo.
 * Guarda directo con PATCH /devices/:id (independiente de crear la
 * orden), así que el cambio queda aunque la persona todavía no haya
 * terminado de llenar el resto del formulario.
 */
function ExistingDeviceSpecs({
  device,
  onUpdated,
}: {
  device: Device | undefined;
  onUpdated: (updated: Device) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [boardModel, setBoardModel] = useState(device?.boardModel ?? "");
  const [cpu, setCpu] = useState(device?.cpu ?? "");
  const [ram, setRam] = useState(device?.ram ?? "");
  const [disk, setDisk] = useState(device?.disk ?? "");
  const [operatingSystem, setOperatingSystem] = useState(device?.operatingSystem ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!device) return null;

  const hasSpecs = device.cpu || device.ram || device.disk || device.operatingSystem || device.boardModel;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const updated = await api.patch<Device>(`/devices/${device!.id}`, {
        boardModel: boardModel || undefined,
        cpu: cpu || undefined,
        ram: ram || undefined,
        disk: disk || undefined,
        operatingSystem: operatingSystem || undefined,
      });
      onUpdated(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudieron guardar los detalles");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} className="space-y-3 rounded border border-border bg-bg p-3">
        {error && <ErrorBanner message={error} />}
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
        <div className="flex gap-2">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Guardando…" : "Guardar detalles"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="rounded border border-border bg-bg p-3 text-sm">
      {hasSpecs ? (
        <p className="text-ink-muted">
          {[device.boardModel, device.cpu, device.ram, device.disk, device.operatingSystem]
            .filter(Boolean)
            .join(" · ")}
        </p>
      ) : (
        <p className="text-ink-muted">Este equipo todavía no tiene detalles técnicos guardados.</p>
      )}
      <button type="button" onClick={() => setEditing(true)} className="mt-1 text-xs text-accent hover:underline">
        {hasSpecs ? "Editar detalles técnicos" : "+ Agregar detalles técnicos"}
      </button>
    </div>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-border bg-bg accent-accent"
      />
      {label}
    </label>
  );
}
