import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { RepairOrderDetail, RepairStatus, Product, PartsCostSummary, RepairLogEntry, Diagnostic, RepairPartEntry, DiagnosticMeasurement } from "@/lib/types";
import { REPAIR_STATUSES, REPAIR_STATUS_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/types";
import { StatusPill } from "@/components/StatusPill";
import { ProductSearch } from "@/components/ProductSearch";
import { PhotoGallery } from "@/components/PhotoGallery";
import { DownloadPdfButton } from "@/components/DownloadPdfButton";
import { MeasurementPointSelect } from "@/components/MeasurementPointSelect";
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
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";

const TABS = [
  "Información",
  "Diagnóstico",
  "Bitácora",
  "Repuestos",
  "Cotizaciones",
  "Garantía",
  "Pagos",
  "Historial",
] as const;
type Tab = (typeof TABS)[number];

export function RepairOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("Información");
  const { data: order, loading, error, reload } = useFetch(
    () => api.get<RepairOrderDetail>(`/repair-orders/${id}`),
    [id],
  );

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }
  if (error || !order) {
    return <ErrorBanner message={error ?? "Orden no encontrada"} />;
  }

  return (
    <div className="max-w-4xl space-y-4">
      <OrderHeader order={order} onChanged={reload} />

      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm transition-colors ${
              tab === t
                ? "border-b-2 border-accent text-accent"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Información" && <InfoTab order={order} onChanged={reload} />}
      {tab === "Diagnóstico" && <DiagnosticsTab order={order} onChanged={reload} />}
      {tab === "Bitácora" && <LogsTab order={order} onChanged={reload} />}
      {tab === "Repuestos" && <PartsTab order={order} onChanged={reload} />}
      {tab === "Cotizaciones" && <QuotationsTab order={order} />}
      {tab === "Garantía" && <WarrantyTab order={order} onChanged={reload} />}
      {tab === "Pagos" && <PaymentsTab order={order} onChanged={reload} />}
      {tab === "Historial" && <HistoryTab order={order} />}
    </div>
  );
}

// --- Encabezado: el elemento de firma (ver DESIGN.md) --------------------

function OrderHeader({ order, onChanged }: { order: RepairOrderDetail; onChanged: () => void }) {
  const [changingStatus, setChangingStatus] = useState(false);
  const [assigningTechnician, setAssigningTechnician] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [technicianError, setTechnicianError] = useState<string | null>(null);

  const { data: technicians } = useFetch(
    () => api.get<{ id: number; fullName: string }[]>("/catalogs/technicians"),
    [],
  );

  async function handleStatusChange(newStatus: RepairStatus) {
    setError(null);
    setChangingStatus(true);
    try {
      await api.patch(`/repair-orders/${order.id}/status`, { newStatus });
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cambiar el estado");
    } finally {
      setChangingStatus(false);
    }
  }

  async function handleAssignTechnician(technicianId: string) {
    if (!technicianId) return;
    setTechnicianError(null);
    setAssigningTechnician(true);
    try {
      await api.patch(`/repair-orders/${order.id}/assign-technician`, {
        technicianId: Number(technicianId),
      });
      onChanged();
    } catch (err) {
      setTechnicianError(err instanceof ApiError ? err.message : "No se pudo asignar el técnico");
    } finally {
      setAssigningTechnician(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono tabular text-3xl font-semibold tracking-wider text-ink">
            {order.orderCode}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {order.customer.fullName} · {order.device.brand?.name} {order.device.model}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <StatusPill status={order.status} />
          <Select
            value=""
            disabled={changingStatus}
            onChange={(e) => handleStatusChange(e.target.value as RepairStatus)}
            className="w-56 text-xs"
          >
            <option value="">Cambiar estado…</option>
            {REPAIR_STATUSES.map((s) => (
              <option key={s} value={s} disabled={s === order.status}>
                {REPAIR_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>

          <Select
            value=""
            disabled={assigningTechnician}
            onChange={(e) => handleAssignTechnician(e.target.value)}
            className="w-56 text-xs"
          >
            <option value="">
              {order.technician ? `Técnico: ${order.technician.fullName}` : "Asignar técnico…"}
            </option>
            {technicians?.map((t) => (
              <option key={t.id} value={t.id} disabled={t.id === order.technician?.id}>
                {t.fullName}
              </option>
            ))}
          </Select>
          {technicianError && <p className="text-xs text-danger">{technicianError}</p>}
        </div>
      </div>

      {error && (
        <div className="mt-3">
          <ErrorBanner message={error} />
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-4 border-t border-border pt-4 text-sm">
        <Money label="Total" value={order.totalValue} />
        <Money label="Abonado" value={order.paidAmount} />
        <Money label="Saldo" value={order.balance} emphasize />
      </div>
    </Card>
  );
}

function Money({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-ink-muted">{label}</p>
      <p className={`font-mono tabular ${emphasize ? "text-lg text-accent" : "text-ink"}`}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}

// --- Pestaña: Información --------------------------------------------------

function InfoTab({ order, onChanged }: { order: RepairOrderDetail; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <EditOrderInfoForm
        order={order}
        onSaved={() => {
          setEditing(false);
          onChanged();
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="secondary" onClick={() => setEditing(true)}>
          Editar información
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Falla y recepción" />
          <dl className="space-y-3 p-4 text-sm">
            <Detail label="Falla reportada" value={order.reportedIssue} />
            <Detail label="Motivo de ingreso" value={order.entryReason} />
            <Detail label="Estado físico" value={order.physicalCondition} />
            <Detail label="Fecha de ingreso" value={formatDateTime(order.entryDate)} />
            <Detail
              label="Fecha de entrega"
              value={order.deliveryDate ? formatDateTime(order.deliveryDate) : undefined}
            />
            <Detail label="Técnico asignado" value={order.technician?.fullName} />
          </dl>
        </Card>
        <Card>
          <CardHeader title="Equipo y accesorios" />
          <dl className="space-y-3 p-4 text-sm">
            <Detail label="Tipo" value={order.device.deviceType?.name} />
            <Detail label="Serial" value={order.device.serialNumber} />
            <Detail
              label="Accesorios recibidos"
              value={
                [
                  order.chargerReceived && "Cargador",
                  order.batteryReceived && "Batería",
                  order.keyboardReceived && "Teclado",
                  order.mouseReceived && "Mouse",
                ]
                  .filter(Boolean)
                  .join(", ") || "Ninguno"
              }
            />
            <Detail label="Notas de accesorios" value={order.accessoriesNotes} />
            <Detail label="Notas" value={order.notes} />
          </dl>
        </Card>
      </div>

      <DevicePasswordCard orderId={order.id} onChanged={onChanged} />

      <Card>
        <CardHeader
          title="Fotos del equipo"
          subtitle="Evidencia del estado físico al recibirlo — protege al taller y al cliente ante cualquier reclamo"
        />
        <div className="p-4">
          <PhotoGallery
            photos={order.photos}
            uploadUrl={`/repair-orders/${order.id}/photos`}
            onChanged={onChanged}
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Documentos" subtitle="Listos para enviar al cliente" />
        <div className="flex flex-wrap gap-3 p-4">
          <DownloadPdfButton
            path={`/repair-orders/${order.id}/documents/technical-report`}
            filename={`informe-tecnico-${order.orderCode}.pdf`}
            label="Informe técnico"
          />
          <DownloadPdfButton
            path={`/repair-orders/${order.id}/documents/intake-receipt`}
            filename={`comprobante-ingreso-${order.orderCode}.pdf`}
            label="Comprobante de ingreso"
          />
          <DownloadPdfButton
            path={`/repair-orders/${order.id}/documents/delivery-receipt`}
            filename={`comprobante-entrega-${order.orderCode}.pdf`}
            label="Comprobante de entrega"
          />
        </div>
      </Card>
    </div>
  );
}

/**
 * Contraseña del equipo: se guarda cifrada (Fase 4) y solo se descifra al
 * pedirla explícitamente — nunca se trae junto con el resto del detalle de
 * la orden. Restringido en el backend a Administrador/Gerente/Técnico; si
 * el usuario actual no tiene ese rol, el botón simplemente muestra el
 * error de permiso en vez de romper el resto de la pantalla.
 */
/**
 * Deliberadamente NO incluye totalValue ni paidAmount, aunque el backend
 * (UpdateRepairOrderDto) sí los acepta: paidAmount se incrementa solo al
 * registrar un pago (payments.service.ts), y totalValue se fija solo al
 * aprobar una cotización — editarlos aquí a mano desincronizaría el saldo
 * de la historia real de pagos/cotizaciones. Tampoco incluye el estado
 * (tiene su propio flujo con historial) ni el técnico asignado (su propio
 * desplegable en el encabezado).
 */
function EditOrderInfoForm({
  order,
  onSaved,
  onCancel,
}: {
  order: RepairOrderDetail;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [reportedIssue, setReportedIssue] = useState(order.reportedIssue);
  const [entryReason, setEntryReason] = useState(order.entryReason ?? "");
  const [physicalCondition, setPhysicalCondition] = useState(order.physicalCondition ?? "");
  const [notes, setNotes] = useState(order.notes ?? "");
  const [accessoriesNotes, setAccessoriesNotes] = useState(order.accessoriesNotes ?? "");
  const [chargerReceived, setChargerReceived] = useState(order.chargerReceived);
  const [batteryReceived, setBatteryReceived] = useState(order.batteryReceived);
  const [keyboardReceived, setKeyboardReceived] = useState(order.keyboardReceived);
  const [mouseReceived, setMouseReceived] = useState(order.mouseReceived);
  const [deliveryDate, setDeliveryDate] = useState(
    order.deliveryDate ? order.deliveryDate.slice(0, 10) : "",
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.patch(`/repair-orders/${order.id}`, {
        reportedIssue,
        entryReason: entryReason || undefined,
        physicalCondition: physicalCondition || undefined,
        notes: notes || undefined,
        accessoriesNotes: accessoriesNotes || undefined,
        chargerReceived,
        batteryReceived,
        keyboardReceived,
        mouseReceived,
        deliveryDate: deliveryDate || undefined,
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
      <CardHeader title="Editar información de la orden" />
      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        {error && <ErrorBanner message={error} />}

        <Field label="Falla reportada">
          <Input value={reportedIssue} onChange={(e) => setReportedIssue(e.target.value)} required />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Motivo de ingreso">
            <Input value={entryReason} onChange={(e) => setEntryReason(e.target.value)} />
          </Field>
          <Field label="Estado físico">
            <Input value={physicalCondition} onChange={(e) => setPhysicalCondition(e.target.value)} />
          </Field>
        </div>

        <Field label="Fecha de entrega (opcional)">
          <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
        </Field>

        <fieldset className="space-y-2">
          <legend className="text-xs uppercase tracking-wide text-ink-muted">Accesorios recibidos</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={chargerReceived} onChange={(e) => setChargerReceived(e.target.checked)} />
              Cargador
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={batteryReceived} onChange={(e) => setBatteryReceived(e.target.checked)} />
              Batería
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={keyboardReceived} onChange={(e) => setKeyboardReceived(e.target.checked)} />
              Teclado
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={mouseReceived} onChange={(e) => setMouseReceived(e.target.checked)} />
              Mouse
            </label>
          </div>
        </fieldset>

        <Field label="Notas de accesorios">
          <Input value={accessoriesNotes} onChange={(e) => setAccessoriesNotes(e.target.value)} />
        </Field>

        <Field label="Notas generales">
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
    </Card>
  );
}

function DevicePasswordCard({ orderId, onChanged }: { orderId: number; onChanged: () => void }) {
  const [password, setPassword] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReveal() {
    setError(null);
    setBusy(true);
    try {
      const result = await api.get<{ password: string | null }>(
        `/repair-orders/${orderId}/device-password`,
      );
      setPassword(result.password ?? "(no se registró ninguna contraseña para este ingreso)");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo consultar la contraseña");
    } finally {
      setBusy(false);
    }
  }

  async function handlePurge() {
    if (!confirm("¿Eliminar la contraseña guardada? No se puede deshacer.")) return;
    setError(null);
    setBusy(true);
    try {
      await api.delete(`/repair-orders/${orderId}/device-password`);
      setPassword(null);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar la contraseña");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Contraseña del equipo"
        subtitle="Dato sensible — cifrado en la base de datos, visible solo bajo pedido"
      />
      <div className="space-y-3 p-4">
        {error && <ErrorBanner message={error} />}
        {password && (
          <p className="rounded border border-warning/30 bg-warning/10 px-3 py-2 font-mono text-sm text-ink">
            {password}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={handleReveal} disabled={busy}>
            {busy ? "Consultando…" : "Mostrar contraseña"}
          </Button>
          <Button type="button" variant="danger" onClick={handlePurge} disabled={busy}>
            Eliminar (tras la entrega)
          </Button>
        </div>
      </div>
    </Card>
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

// --- Pestaña: Diagnóstico (tabla de mediciones tipo instrumento) ---------

function DiagnosticsTab({ order, onChanged }: { order: RepairOrderDetail; onChanged: () => void }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancelar" : "+ Nuevo diagnóstico"}
        </Button>
      </div>

      {showForm && (
        <NewDiagnosticForm
          orderId={order.id}
          onCreated={() => {
            setShowForm(false);
            onChanged();
          }}
        />
      )}

      {order.diagnostics.length === 0 ? (
        <Card>
          <EmptyState
            title="Sin diagnósticos registrados"
            description="Usa “+ Nuevo diagnóstico” para documentar la primera revisión de este equipo"
          />
        </Card>
      ) : (
        order.diagnostics.map((d) => (
          <DiagnosticCard key={d.id} orderId={order.id} diagnostic={d} onChanged={onChanged} />
        ))
      )}
    </div>
  );
}

function DiagnosticCard({
  orderId,
  diagnostic: d,
  onChanged,
}: {
  orderId: number;
  diagnostic: Diagnostic;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <Card>
      <CardHeader
        title={d.boardReference ?? "Diagnóstico"}
        subtitle={`${formatDateTime(d.createdAt)} · ${d.technician?.fullName ?? ""}`}
        action={
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            className="text-xs text-ink-muted hover:text-accent"
          >
            {editing ? "Cancelar" : "Editar"}
          </button>
        }
      />
      <div className="space-y-3 p-4 text-sm">
        {editing ? (
          <EditDiagnosticForm
            diagnostic={d}
            onSaved={() => {
              setEditing(false);
              onChanged();
            }}
          />
        ) : (
          <>
            {d.initialSymptom && <Detail label="Síntoma inicial" value={d.initialSymptom} />}
            {d.componentSuspected && <Detail label="Componente sospechoso" value={d.componentSuspected} />}
            {d.componentReplaced && <Detail label="Componente reemplazado" value={d.componentReplaced} />}
            {d.result && <Detail label="Resultado" value={d.result} />}
          </>
        )}

        {d.measurements.length > 0 && (
          <table className="w-full border-collapse font-mono text-xs tabular">
            <thead>
              <tr className="border-b border-border text-left uppercase tracking-wide text-ink-muted">
                <th className="py-1 pr-3">Punto</th>
                <th className="py-1 pr-3">Esperado</th>
                <th className="py-1 pr-3">Medido</th>
                <th className="py-1 pr-3">Unidad</th>
                <th className="py-1 pr-3">Estado</th>
                <th className="py-1" />
              </tr>
            </thead>
            <tbody>
              {d.measurements.map((m) => (
                <MeasurementRow key={m.id} measurement={m} onChanged={onChanged} />
              ))}
            </tbody>
          </table>
        )}

        <div className="flex flex-wrap items-start gap-3">
          <AddMeasurementForm diagnosticId={d.id} onAdded={onChanged} />
          <BulkMeasurementForm diagnosticId={d.id} onAdded={onChanged} />
        </div>

        <div className="border-t border-border pt-3">
          <p className="mb-2 text-xs uppercase tracking-wide text-ink-muted">
            Fotos del trabajo y estado final — visibles para el cliente
          </p>
          <PhotoGallery
            photos={d.photos}
            uploadUrl={`/repair-orders/${orderId}/diagnostics/${d.id}/photos`}
            onChanged={onChanged}
            compact
          />
        </div>
      </div>
    </Card>
  );
}

function EditDiagnosticForm({ diagnostic: d, onSaved }: { diagnostic: Diagnostic; onSaved: () => void }) {
  const [boardReference, setBoardReference] = useState(d.boardReference ?? "");
  const [initialSymptom, setInitialSymptom] = useState(d.initialSymptom ?? "");
  const [componentSuspected, setComponentSuspected] = useState(d.componentSuspected ?? "");
  const [componentReplaced, setComponentReplaced] = useState(d.componentReplaced ?? "");
  const [result, setResult] = useState(d.result ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.patch(`/diagnostics/${d.id}`, {
        boardReference: boardReference || undefined,
        initialSymptom: initialSymptom || undefined,
        componentSuspected: componentSuspected || undefined,
        componentReplaced: componentReplaced || undefined,
        result: result || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el cambio");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <ErrorBanner message={error} />}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Referencia de placa">
          <Input value={boardReference} onChange={(e) => setBoardReference(e.target.value)} />
        </Field>
        <Field label="Componente sospechoso">
          <Input value={componentSuspected} onChange={(e) => setComponentSuspected(e.target.value)} />
        </Field>
      </div>
      <Field label="Síntoma inicial">
        <Input value={initialSymptom} onChange={(e) => setInitialSymptom(e.target.value)} />
      </Field>
      <Field label="Componente reemplazado">
        <Input value={componentReplaced} onChange={(e) => setComponentReplaced(e.target.value)} />
      </Field>
      <Field label="Resultado">
        <Input value={result} onChange={(e) => setResult(e.target.value)} />
      </Field>
      <Button type="submit" variant="primary" disabled={saving}>
        {saving ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}

function NewDiagnosticForm({ orderId, onCreated }: { orderId: number; onCreated: () => void }) {
  const [boardReference, setBoardReference] = useState("");
  const [initialSymptom, setInitialSymptom] = useState("");
  const [componentSuspected, setComponentSuspected] = useState("");
  const [result, setResult] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post(`/repair-orders/${orderId}/diagnostics`, {
        boardReference: boardReference || undefined,
        initialSymptom: initialSymptom || undefined,
        componentSuspected: componentSuspected || undefined,
        result: result || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el diagnóstico");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Nuevo diagnóstico" />
      <form onSubmit={handleSubmit} className="space-y-3 p-4">
        {error && <ErrorBanner message={error} />}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Referencia de placa (opcional)">
            <Input value={boardReference} onChange={(e) => setBoardReference(e.target.value)} />
          </Field>
          <Field label="Componente sospechoso (opcional)">
            <Input value={componentSuspected} onChange={(e) => setComponentSuspected(e.target.value)} />
          </Field>
        </div>
        <Field label="Síntoma inicial">
          <Input value={initialSymptom} onChange={(e) => setInitialSymptom(e.target.value)} />
        </Field>
        <Field label="Resultado (se puede completar después)">
          <Input value={result} onChange={(e) => setResult(e.target.value)} />
        </Field>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Guardando…" : "Crear diagnóstico"}
        </Button>
      </form>
    </Card>
  );
}

/**
 * Cada medición se puede corregir o quitar de forma individual — un
 * typo en un valor medido no debería obligar a borrar y rehacer el
 * diagnóstico completo.
 */
function MeasurementRow({
  measurement: m,
  onChanged,
}: {
  measurement: DiagnosticMeasurement;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [pointName, setPointName] = useState(m.pointName);
  const [expectedValue, setExpectedValue] = useState(m.expectedValue ?? "");
  const [measuredValue, setMeasuredValue] = useState(m.measuredValue ?? "");
  const [unit, setUnit] = useState(m.unit ?? "");
  const [status, setStatus] = useState(m.status ?? "OK");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      await api.patch(`/measurements/${m.id}`, {
        pointName,
        expectedValue: expectedValue || undefined,
        measuredValue: measuredValue || undefined,
        unit: unit || undefined,
        status: status || undefined,
      });
      setEditing(false);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`¿Quitar la medición "${m.pointName}"?`)) return;
    setSaving(true);
    setError(null);
    try {
      await api.delete(`/measurements/${m.id}`);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo quitar");
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <tr className="border-b border-border/50 last:border-0">
        <td className="py-1.5 pr-3">
          <Input value={pointName} onChange={(e) => setPointName(e.target.value)} className="!py-1 text-xs" />
        </td>
        <td className="py-1.5 pr-3">
          <Input value={expectedValue} onChange={(e) => setExpectedValue(e.target.value)} className="!py-1 text-xs" />
        </td>
        <td className="py-1.5 pr-3">
          <Input value={measuredValue} onChange={(e) => setMeasuredValue(e.target.value)} className="!py-1 text-xs" />
        </td>
        <td className="py-1.5 pr-3">
          <Input value={unit} onChange={(e) => setUnit(e.target.value)} className="!py-1 text-xs" />
        </td>
        <td className="py-1.5 pr-3">
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="!py-1 text-xs">
            <option value="OK">OK</option>
            <option value="FUERA DE RANGO">Fuera de rango</option>
            <option value="N/A">N/A</option>
          </Select>
        </td>
        <td className="py-1.5 whitespace-nowrap">
          <button onClick={handleSave} disabled={saving} className="mr-2 text-accent hover:underline">
            {saving ? "…" : "Guardar"}
          </button>
          <button onClick={() => setEditing(false)} className="text-ink-muted hover:underline">
            Cancelar
          </button>
          {error && <p className="text-danger">{error}</p>}
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-border/50 last:border-0">
      <td className="py-1.5 pr-3 text-ink">{m.pointName}</td>
      <td className="py-1.5 pr-3 text-ink-muted">{m.expectedValue ?? "—"}</td>
      <td className="py-1.5 pr-3 text-ink">{m.measuredValue ?? "—"}</td>
      <td className="py-1.5 pr-3 text-ink-muted">{m.unit ?? ""}</td>
      <td className={`py-1.5 pr-3 ${m.status?.toUpperCase() === "OK" ? "text-success" : "text-warning"}`}>
        {m.status ?? "—"}
      </td>
      <td className="py-1.5 whitespace-nowrap">
        <button onClick={() => setEditing(true)} className="mr-2 text-ink-muted hover:text-accent">
          Editar
        </button>
        <button onClick={handleDelete} disabled={saving} className="text-danger hover:underline">
          Quitar
        </button>
      </td>
    </tr>
  );
}

function AddMeasurementForm({ diagnosticId, onAdded }: { diagnosticId: number; onAdded: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [pointName, setPointName] = useState("");
  const [expectedValue, setExpectedValue] = useState("");
  const [measuredValue, setMeasuredValue] = useState("");
  const [unit, setUnit] = useState("");
  const [status, setStatus] = useState("OK");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post(`/diagnostics/${diagnosticId}/measurements`, {
        pointName,
        expectedValue: expectedValue || undefined,
        measuredValue: measuredValue || undefined,
        unit: unit || undefined,
        status: status || undefined,
      });
      setPointName("");
      setExpectedValue("");
      setMeasuredValue("");
      setUnit("");
      setShowForm(false);
      onAdded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo agregar la medición");
    } finally {
      setSaving(false);
    }
  }

  if (!showForm) {
    return (
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="text-xs text-accent hover:underline"
      >
        + Agregar medición
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded border border-border bg-bg p-3">
      {error && <ErrorBanner message={error} />}
      <MeasurementPointSelect
        onSelect={(point) => {
          setPointName(point.pointName);
          setExpectedValue(point.expectedValue);
          setUnit(point.unit ?? "");
        }}
      />
      <div className="grid grid-cols-5 gap-2">
        <Input placeholder="Punto (ACDET…)" value={pointName} onChange={(e) => setPointName(e.target.value)} required />
        <Input placeholder="Esperado" value={expectedValue} onChange={(e) => setExpectedValue(e.target.value)} />
        <Input placeholder="Medido" value={measuredValue} onChange={(e) => setMeasuredValue(e.target.value)} />
        <Input placeholder="Unidad (V, A…)" value={unit} onChange={(e) => setUnit(e.target.value)} />
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="OK">OK</option>
          <option value="FUERA DE RANGO">Fuera de rango</option>
          <option value="N/A">N/A</option>
        </Select>
      </div>
      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Guardando…" : "Agregar"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

type BulkRow = {
  key: string;
  pointName: string;
  expectedValue: string;
  measuredValue: string;
  unit: string;
  status: string;
};

function emptyBulkRow(): BulkRow {
  return {
    key: crypto.randomUUID(),
    pointName: "",
    expectedValue: "",
    measuredValue: "",
    unit: "",
    status: "OK",
  };
}

/**
 * Carga masiva de mediciones (sección 8 del brief): pensada para cuando el
 * técnico ya tiene la tabla completa de una placa conocida (transcrita de
 * una hoja de referencia, por ejemplo) y no tiene sentido registrarla fila
 * por fila con el formulario individual de al lado.
 */
function BulkMeasurementForm({ diagnosticId, onAdded }: { diagnosticId: number; onAdded: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [rows, setRows] = useState<BulkRow[]>([emptyBulkRow(), emptyBulkRow()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateRow(key: string, patch: Partial<BulkRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, emptyBulkRow()]);
  }

  function addRowFromCatalog(point: { pointName: string; expectedValue: string; unit?: string }) {
    setRows((prev) => [
      ...prev,
      { ...emptyBulkRow(), pointName: point.pointName, expectedValue: point.expectedValue, unit: point.unit ?? "" },
    ]);
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const validRows = rows.filter((r) => r.pointName.trim());
    if (validRows.length === 0) {
      setError("Completa el nombre del punto en al menos una fila");
      return;
    }

    setSaving(true);
    try {
      await api.post(`/diagnostics/${diagnosticId}/measurements/bulk`, {
        measurements: validRows.map((r) => ({
          pointName: r.pointName,
          expectedValue: r.expectedValue || undefined,
          measuredValue: r.measuredValue || undefined,
          unit: r.unit || undefined,
          status: r.status || undefined,
        })),
      });
      setRows([emptyBulkRow(), emptyBulkRow()]);
      setShowForm(false);
      onAdded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cargar la tabla");
    } finally {
      setSaving(false);
    }
  }

  if (!showForm) {
    return (
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="text-xs text-accent hover:underline"
      >
        + Cargar tabla completa
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-2 rounded border border-border bg-bg p-3">
      {error && <ErrorBanner message={error} />}
      <p className="text-xs text-ink-muted">
        Para transcribir de una sola vez la tabla de una placa conocida — las filas sin nombre de
        punto se ignoran al guardar.
      </p>
      <MeasurementPointSelect onSelect={addRowFromCatalog} />
      {rows.map((row) => (
        <div key={row.key} className="grid grid-cols-6 gap-2">
          <Input
            placeholder="Punto (ACDET…)"
            value={row.pointName}
            onChange={(e) => updateRow(row.key, { pointName: e.target.value })}
          />
          <Input
            placeholder="Esperado"
            value={row.expectedValue}
            onChange={(e) => updateRow(row.key, { expectedValue: e.target.value })}
          />
          <Input
            placeholder="Medido"
            value={row.measuredValue}
            onChange={(e) => updateRow(row.key, { measuredValue: e.target.value })}
          />
          <Input
            placeholder="Unidad"
            value={row.unit}
            onChange={(e) => updateRow(row.key, { unit: e.target.value })}
          />
          <Select value={row.status} onChange={(e) => updateRow(row.key, { status: e.target.value })}>
            <option value="OK">OK</option>
            <option value="FUERA DE RANGO">Fuera de rango</option>
            <option value="N/A">N/A</option>
          </Select>
          <button
            type="button"
            onClick={() => removeRow(row.key)}
            className="text-xs text-danger hover:underline"
          >
            Quitar
          </button>
        </div>
      ))}

      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={addRow}>
          + Agregar fila
        </Button>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Guardando…" : `Guardar ${rows.filter((r) => r.pointName.trim()).length} mediciones`}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

// --- Pestaña: Bitácora -----------------------------------------------------

function LogsTab({ order, onChanged }: { order: RepairOrderDetail; onChanged: () => void }) {
  const [procedure, setProcedure] = useState("");
  const [result, setResult] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post(`/repair-orders/${order.id}/logs`, {
        procedure: procedure || undefined,
        result: result || undefined,
      });
      setProcedure("");
      setResult("");
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo agregar la entrada");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Agregar entrada" />
        <form onSubmit={handleAdd} className="space-y-3 p-4">
          {error && <ErrorBanner message={error} />}
          <Field label="Procedimiento">
            <Input value={procedure} onChange={(e) => setProcedure(e.target.value)} />
          </Field>
          <Field label="Resultado">
            <Input value={result} onChange={(e) => setResult(e.target.value)} />
          </Field>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Guardando…" : "Agregar a la bitácora"}
          </Button>
        </form>
      </Card>

      <Card>
        {order.logs.length === 0 ? (
          <EmptyState title="Sin entradas de bitácora" />
        ) : (
          <ul className="divide-y divide-border">
            {order.logs.map((l) => (
              <LogEntryRow key={l.id} log={l} orderId={order.id} onChanged={onChanged} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function LogEntryRow({
  log,
  orderId,
  onChanged,
}: {
  log: RepairLogEntry;
  orderId: number;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className="p-4">
        <EditLogForm
          log={log}
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
    <li className="space-y-2 p-4 text-sm">
      <div className="flex items-start justify-between">
        <p className="text-xs text-ink-muted">
          {formatDateTime(log.date)} · {log.technician.fullName}
        </p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs text-ink-muted hover:text-accent"
        >
          Editar
        </button>
      </div>
      {log.procedure && <p className="mt-1 text-ink">{log.procedure}</p>}
      {log.result && <p className="text-ink-muted">→ {log.result}</p>}
      <PhotoGallery
        photos={log.photos}
        uploadUrl={`/repair-orders/${orderId}/logs/${log.id}/photos`}
        onChanged={onChanged}
        compact
      />
    </li>
  );
}

function EditLogForm({
  log,
  onSaved,
  onCancel,
}: {
  log: RepairLogEntry;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [procedure, setProcedure] = useState(log.procedure ?? "");
  const [result, setResult] = useState(log.result ?? "");
  const [notes, setNotes] = useState(log.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.patch(`/repair-logs/${log.id}`, {
        procedure: procedure || undefined,
        result: result || undefined,
        notes: notes || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el cambio");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <ErrorBanner message={error} />}
      <Field label="Procedimiento">
        <Input value={procedure} onChange={(e) => setProcedure(e.target.value)} />
      </Field>
      <Field label="Resultado">
        <Input value={result} onChange={(e) => setResult(e.target.value)} />
      </Field>
      <Field label="Notas">
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

// --- Pestaña: Repuestos ----------------------------------------------------

function PartsTab({ order, onChanged }: { order: RepairOrderDetail; onChanged: () => void }) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProduct) {
      setError("Busca y selecciona un producto primero");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await api.post(`/repair-orders/${order.id}/parts`, {
        productId: selectedProduct.id,
        quantity: Number(quantity),
      });
      setSelectedProduct(null);
      setQuantity("1");
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo agregar el repuesto");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Usar repuesto" subtitle="Descuenta stock automáticamente" />
        <form onSubmit={handleAdd} className="space-y-3 p-4">
          {error && <ErrorBanner message={error} />}

          {selectedProduct ? (
            <div className="flex items-center justify-between rounded border border-accent/30 bg-accent/5 px-3 py-2 text-sm">
              <div>
                <span className="font-mono text-xs text-ink-muted">{selectedProduct.sku}</span>{" "}
                <span className="text-ink">{selectedProduct.description}</span>
                <span className="ml-2 text-xs text-ink-muted">
                  (stock disponible: {selectedProduct.stock})
                </span>
              </div>
              <button
                type="button"
                className="text-xs text-ink-muted hover:text-accent"
                onClick={() => setSelectedProduct(null)}
              >
                Cambiar
              </button>
            </div>
          ) : (
            <ProductSearch onSelect={setSelectedProduct} />
          )}

          <div className="flex items-end gap-3">
            <Field label="Cantidad">
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </Field>
            <Button type="submit" variant="primary" disabled={saving || !selectedProduct}>
              {saving ? "Agregando…" : "Agregar"}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        {order.partsUsed.length === 0 ? (
          <EmptyState title="Sin repuestos usados en esta orden" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-2">Producto</th>
                <th className="px-4 py-2">Cant.</th>
                <th className="px-4 py-2">Precio</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {order.partsUsed.map((p) => (
                <PartRow key={p.id} orderId={order.id} part={p} onChanged={onChanged} />
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {order.partsUsed.length > 0 && <CostSummaryCard orderId={order.id} refreshKey={order.partsUsed.length} />}
    </div>
  );
}

/**
 * Quitar un repuesto usado devuelve la cantidad al inventario (el backend
 * lo hace dentro de la misma transacción) — por eso pide confirmación
 * explícita en vez de un botón directo: no es solo "borrar una fila", es
 * revertir un movimiento de stock ya contabilizado.
 */
function PartRow({
  orderId,
  part,
  onChanged,
}: {
  orderId: number;
  part: RepairPartEntry;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRemove() {
    const confirmed = confirm(
      `¿Quitar "${part.product.description}" de esta orden? La cantidad (${part.quantity}) vuelve al inventario.`,
    );
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    try {
      await api.delete(`/repair-orders/${orderId}/parts/${part.id}`);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo quitar el repuesto");
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-4 py-2 text-ink">
        {part.product.description}
        {error && <p className="text-xs text-danger">{error}</p>}
      </td>
      <td className="px-4 py-2 tabular text-ink-muted">{part.quantity}</td>
      <td className="px-4 py-2 tabular text-ink">{formatCurrency(part.unitPrice)}</td>
      <td className="px-4 py-2">
        <button
          onClick={handleRemove}
          disabled={busy}
          className="text-xs text-danger hover:underline disabled:opacity-50"
        >
          Quitar
        </button>
      </td>
    </tr>
  );
}

/**
 * Costo de repuestos, ingreso por repuestos y ganancia de la orden (Fase
 * 6). Importante: esta ganancia solo considera repuestos, NO mano de obra
 * — el modelo de datos todavía no tiene una tarifa de servicio desglosada
 * por orden, así que mostrarlo como "la ganancia total de la reparación"
 * sería engañoso. Se etiqueta explícitamente como "de repuestos" para que
 * no se confunda con la ganancia real del trabajo completo.
 */
function CostSummaryCard({ orderId, refreshKey }: { orderId: number; refreshKey: number }) {
  const { data: summary, loading, error } = useFetch(
    () => api.get<PartsCostSummary>(`/repair-orders/${orderId}/parts/cost-summary`),
    [orderId, refreshKey],
  );

  if (loading || error || !summary) return null;

  return (
    <Card>
      <CardHeader
        title="Costo y ganancia de repuestos"
        subtitle="Solo repuestos — no incluye mano de obra, que todavía no se desglosa por orden"
      />
      <div className="grid grid-cols-2 gap-4 p-4 text-sm sm:grid-cols-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-muted">Costo</p>
          <p className="font-mono tabular text-ink">{formatCurrency(summary.partsCost)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-muted">Cobrado por repuestos</p>
          <p className="font-mono tabular text-ink">{formatCurrency(summary.partsRevenue)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-muted">Ganancia de la orden</p>
          <p className={`font-mono tabular ${summary.profit >= 0 ? "text-success" : "text-danger"}`}>
            {formatCurrency(summary.profit)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-muted">Margen</p>
          <p className={`font-mono tabular ${summary.marginPct >= 0 ? "text-success" : "text-danger"}`}>
            {summary.marginPct.toFixed(1)}%
          </p>
        </div>
      </div>
    </Card>
  );
}

// --- Pestaña: Garantía --------------------------------------------------

function WarrantyTab({ order, onChanged }: { order: RepairOrderDetail; onChanged: () => void }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4">
      {order.warranties.length === 0 ? (
        <Card>
          <EmptyState
            title="Sin garantía generada todavía"
            description="Se genera al entregar el equipo — indica cuántos meses de cobertura aplican"
          />
          <div className="border-t border-border p-4">
            {showForm ? (
              <NewWarrantyForm
                orderId={order.id}
                onCreated={() => {
                  setShowForm(false);
                  onChanged();
                }}
                onCancel={() => setShowForm(false)}
              />
            ) : (
              <Button variant="primary" onClick={() => setShowForm(true)}>
                + Generar garantía
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <Card>
          <CardHeader title="Garantías de esta orden" />
          <ul className="divide-y divide-border">
            {order.warranties.map((w) => (
              <li key={w.id}>
                <Link
                  to={`/warranties/${w.id}`}
                  className="flex items-center justify-between px-4 py-3 text-sm hover:bg-surface-raised"
                >
                  <span className="text-ink">{w.coverageDescription}</span>
                  <span className="text-ink-muted">Vence {formatDate(w.warrantyEndDate)}</span>
                  <span
                    className={
                      w.status === "ACTIVE"
                        ? "text-success"
                        : w.status === "CLAIMED"
                          ? "text-info"
                          : "text-danger"
                    }
                  >
                    {w.status === "ACTIVE" ? "Vigente" : w.status === "CLAIMED" ? "Reclamada" : "Vencida"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function NewWarrantyForm({
  orderId,
  onCreated,
  onCancel,
}: {
  orderId: number;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [warrantyMonths, setWarrantyMonths] = useState("3");
  const [coverageDescription, setCoverageDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post(`/repair-orders/${orderId}/warranties`, {
        warrantyMonths: Number(warrantyMonths),
        coverageDescription,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo generar la garantía");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <ErrorBanner message={error} />}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Meses de cobertura">
          <Input
            type="number"
            min={1}
            value={warrantyMonths}
            onChange={(e) => setWarrantyMonths(e.target.value)}
            required
          />
        </Field>
        <Field label="Descripción de cobertura">
          <Input
            value={coverageDescription}
            onChange={(e) => setCoverageDescription(e.target.value)}
            placeholder="Ej. Cambio de pantalla y mano de obra"
            required
          />
        </Field>
      </div>
      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Generando…" : "Generar garantía"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

// --- Pestaña: Cotizaciones ---------------------------------------------

function QuotationsTab({ order }: { order: RepairOrderDetail }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link to={`/quotations/new?customerId=${order.customer.id}&sourceOrderId=${order.id}`}>
          <Button variant="primary">+ Nueva cotización</Button>
        </Link>
      </div>

      {order.quotations.length === 0 ? (
        <Card>
          <EmptyState title="Sin cotizaciones asociadas" />
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {order.quotations.map((q) => (
              <li key={q.id}>
                <Link
                  to={`/quotations/${q.id}`}
                  className="flex items-center justify-between px-4 py-3 text-sm hover:bg-surface-raised"
                >
                  <span className="font-mono text-accent">{q.quotationNumber}</span>
                  <span className="text-ink-muted">{q.status}</span>
                  <span className="tabular text-ink">{formatCurrency(q.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

// --- Pestaña: Pagos ----------------------------------------------------

function PaymentsTab({ order, onChanged }: { order: RepairOrderDetail; onChanged: () => void }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post("/payments", {
        customerId: order.customer.id,
        repairOrderId: order.id,
        amount: Number(amount),
        method,
      });
      setAmount("");
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo registrar el abono");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Registrar abono" />
        <form onSubmit={handleAdd} className="flex items-end gap-3 p-4">
          {error && <ErrorBanner message={error} />}
          <Field label="Monto">
            <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </Field>
          <Field label="Método">
            <Select value={method} onChange={(e) => setMethod(e.target.value)}>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Registrando…" : "Registrar"}
          </Button>
        </form>
      </Card>

      <Card>
        {order.payments.length === 0 ? (
          <EmptyState title="Sin pagos registrados" />
        ) : (
          <ul className="divide-y divide-border">
            {order.payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="text-ink">{formatCurrency(p.amount)}</p>
                  <p className="text-xs text-ink-muted">
                    {formatDateTime(p.date)} · {p.method} · {p.user.fullName}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

// --- Pestaña: Historial de estados --------------------------------------

function HistoryTab({ order }: { order: RepairOrderDetail }) {
  return (
    <Card>
      <ul className="divide-y divide-border">
        {order.statusHistory.map((h) => (
          <li key={h.id} className="flex items-center gap-4 px-4 py-3 text-sm">
            <span className="w-28 shrink-0 tabular text-xs text-ink-muted">
              {formatDate(h.changedAt)}
            </span>
            <span className="text-ink">
              {h.previousStatus ? `${REPAIR_STATUS_LABELS[h.previousStatus]} → ` : ""}
              {REPAIR_STATUS_LABELS[h.newStatus]}
            </span>
            <span className="ml-auto text-xs text-ink-muted">{h.user.fullName}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
