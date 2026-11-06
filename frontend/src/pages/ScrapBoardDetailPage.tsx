import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type {
  Brand,
  DeviceTypeCatalog,
  ImportComponentsResult,
  ScrapBoardDetail,
  ScrapComponent,
} from "@/lib/types";
import { SCRAP_COMPONENT_STATUS_LABELS } from "@/lib/types";
import { ScrapBoardFiles } from "@/components/ScrapBoardFiles";
import {
  Button,
  Card,
  CardHeader,
  ErrorBanner,
  Field,
  Input,
  Select,
  Spinner,
} from "@/components/ui";
import { formatDate } from "@/lib/format";

export function ScrapBoardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    data: board,
    loading,
    error,
    reload,
  } = useFetch(() => api.get<ScrapBoardDetail>(`/scrap-boards/${id}`), [id]);

  const [editing, setEditing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleToggleStatus() {
    if (!board) return;
    const action = board.status === "ACTIVE" ? "deactivate" : "reactivate";
    const confirmMsg =
      board.status === "ACTIVE"
        ? "¿Desactivar esta placa? Sus componentes dejarán de aparecer en las búsquedas."
        : "¿Reactivar esta placa?";
    if (!confirm(confirmMsg)) return;
    setBusy(true);
    setActionError(null);
    try {
      await api.patch(`/scrap-boards/${board.id}/${action}`);
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "No se pudo completar la acción");
    } finally {
      setBusy(false);
    }
  }

  // Solo se muestra el spinner de página completa en la carga inicial
  // (sin !board, cada reload() — ej. tras importar componentes — volvía
  // a desmontar toda la pantalla y perdía el resumen de la importación
  // que se acababa de mostrar justo antes de que el usuario llegara a
  // leerlo).
  if (loading && !board) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }
  if (error || !board) {
    return <ErrorBanner message={error ?? "Placa no encontrada"} />;
  }

  return (
    <div className="max-w-3xl space-y-4">
      <Link to="/scrap-boards" className="text-xs text-ink-muted hover:text-accent">
        ← Volver a Placas SCRAP
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-sm text-ink-muted">{board.code}</p>
          <h1 className="text-xl font-semibold text-ink">
            {board.model}
            {board.status === "INACTIVE" && (
              <span className="ml-2 text-xs uppercase text-danger">Inactiva</span>
            )}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setEditing((e) => !e)}>
            {editing ? "Cancelar" : "Editar"}
          </Button>
          <Button
            variant={board.status === "ACTIVE" ? "danger" : "secondary"}
            onClick={handleToggleStatus}
            disabled={busy}
          >
            {board.status === "ACTIVE" ? "Desactivar" : "Reactivar"}
          </Button>
        </div>
      </div>

      {actionError && <ErrorBanner message={actionError} />}

      {editing ? (
        <EditScrapBoardForm
          board={board}
          onSaved={() => {
            setEditing(false);
            reload();
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <Card>
          <CardHeader title="Datos de la placa" />
          <dl className="grid grid-cols-2 gap-4 p-4 text-sm">
            <Detail label="Marca" value={board.brand?.name} />
            <Detail label="Tipo de equipo" value={board.deviceType?.name} />
            <Detail label="Ubicación" value={board.location} />
            <Detail label="Registrada" value={formatDate(board.createdAt)} />
            {board.notes && <Detail label="Notas" value={board.notes} />}
          </dl>
        </Card>
      )}

      <ComponentsCard board={board} onChanged={reload} />

      <Card>
        <CardHeader title="Archivos" subtitle="Fotos, esquemáticos y boardview" />
        <div className="p-4">
          <ScrapBoardFiles boardId={board.id} files={board.files} onChanged={reload} />
        </div>
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

function EditScrapBoardForm({
  board,
  onSaved,
  onCancel,
}: {
  board: ScrapBoardDetail;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { data: brands } = useFetch(() => api.get<Brand[]>("/catalogs/brands"), []);
  const { data: deviceTypes } = useFetch(
    () => api.get<DeviceTypeCatalog[]>("/catalogs/device-types"),
    [],
  );

  const [model, setModel] = useState(board.model);
  const [brandId, setBrandId] = useState(board.brand ? String(board.brand.id) : "");
  const [deviceTypeId, setDeviceTypeId] = useState(board.deviceType ? String(board.deviceType.id) : "");
  const [location, setLocation] = useState(board.location ?? "");
  const [notes, setNotes] = useState(board.notes ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.patch(`/scrap-boards/${board.id}`, {
        model,
        brandId: brandId ? Number(brandId) : undefined,
        deviceTypeId: deviceTypeId ? Number(deviceTypeId) : undefined,
        location: location || undefined,
        notes: notes || undefined,
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
      <CardHeader title="Editar placa" />
      <form onSubmit={handleSubmit} className="space-y-3 p-4">
        {error && <ErrorBanner message={error} />}

        <Field label="Modelo de la placa">
          <Input value={model} onChange={(e) => setModel(e.target.value)} required />
        </Field>

        <div className="grid grid-cols-2 gap-3">
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
          <Field label="Tipo de equipo de origen (opcional)">
            <Select value={deviceTypeId} onChange={(e) => setDeviceTypeId(e.target.value)}>
              <option value="">Sin tipo</option>
              {deviceTypes?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Ubicación física (opcional)">
          <Input value={location} onChange={(e) => setLocation(e.target.value)} />
        </Field>

        <Field label="Notas (opcional)">
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

function ComponentsCard({ board, onChanged }: { board: ScrapBoardDetail; onChanged: () => void }) {
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function markUsed(component: ScrapComponent) {
    setError(null);
    setBusyId(component.id);
    try {
      await api.patch(`/scrap-boards/${board.id}/components/${component.id}/mark-used`);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo marcar como usado");
    } finally {
      setBusyId(null);
    }
  }

  async function markAvailable(component: ScrapComponent) {
    setError(null);
    setBusyId(component.id);
    try {
      await api.patch(`/scrap-boards/${board.id}/components/${component.id}/mark-available`);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo marcar como disponible");
    } finally {
      setBusyId(null);
    }
  }

  async function removeComponent(component: ScrapComponent) {
    if (!confirm(`¿Quitar "${component.designator} ${component.reference}" de la placa? Esto borra la fila — úsalo solo si se capturó por error.`)) {
      return;
    }
    setError(null);
    setBusyId(component.id);
    try {
      await api.delete(`/scrap-boards/${board.id}/components/${component.id}`);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo quitar el componente");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Componentes"
        subtitle="IC y componentes electrónicos disponibles en esta placa"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setImporting((i) => !i)}>
              {importing ? "Cancelar" : "Importar CSV"}
            </Button>
            <Button variant="secondary" onClick={() => setAdding((a) => !a)}>
              {adding ? "Cancelar" : "+ Agregar componente"}
            </Button>
          </div>
        }
      />
      {error && (
        <div className="p-4 pb-0">
          <ErrorBanner message={error} />
        </div>
      )}
      {importing && (
        <div className="border-b border-border p-4">
          <ImportComponentsForm
            boardId={board.id}
            onImported={() => {
              onChanged();
            }}
          />
        </div>
      )}
      {adding && (
        <div className="border-b border-border p-4">
          <NewComponentForm
            boardId={board.id}
            onAdded={() => {
              setAdding(false);
              onChanged();
            }}
          />
        </div>
      )}
      {board.components.length === 0 ? (
        <p className="p-4 text-sm text-ink-muted">Sin componentes registrados todavía.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-2">Designador</th>
              <th className="px-4 py-2">Referencia</th>
              <th className="px-4 py-2">Descripción</th>
              <th className="px-4 py-2">Cant.</th>
              <th className="px-4 py-2">Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {board.components.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2 font-mono text-xs text-ink">{c.designator}</td>
                <td className="px-4 py-2 text-ink">{c.reference}</td>
                <td className="px-4 py-2 text-ink-muted">{c.description ?? "—"}</td>
                <td className="px-4 py-2 tabular text-ink-muted">{c.quantity}</td>
                <td className="px-4 py-2">
                  <span className={c.status === "AVAILABLE" ? "text-success" : "text-ink-muted"}>
                    {SCRAP_COMPONENT_STATUS_LABELS[c.status]}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex items-center justify-end gap-3">
                    {c.status === "AVAILABLE" ? (
                      <button
                        type="button"
                        disabled={busyId === c.id}
                        onClick={() => markUsed(c)}
                        className="text-xs text-warning hover:underline"
                      >
                        Marcar usado
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busyId === c.id}
                        onClick={() => markAvailable(c)}
                        className="text-xs text-accent hover:underline"
                      >
                        Deshacer
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busyId === c.id}
                      onClick={() => removeComponent(c)}
                      className="text-xs text-danger hover:underline"
                    >
                      Quitar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function NewComponentForm({ boardId, onAdded }: { boardId: number; onAdded: () => void }) {
  const [designator, setDesignator] = useState("");
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post(`/scrap-boards/${boardId}/components`, {
        designator,
        reference,
        description: description || undefined,
        quantity: Number(quantity) || 1,
      });
      setDesignator("");
      setReference("");
      setDescription("");
      setQuantity("1");
      onAdded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo agregar el componente");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      {error && (
        <div className="w-full">
          <ErrorBanner message={error} />
        </div>
      )}
      <Field label="Designador (ej. U4)">
        <Input value={designator} onChange={(e) => setDesignator(e.target.value)} required className="w-28" />
      </Field>
      <Field label="Referencia (ej. BQ24780S)">
        <Input value={reference} onChange={(e) => setReference(e.target.value)} required className="w-40" />
      </Field>
      <Field label="Descripción (opcional)">
        <Input value={description} onChange={(e) => setDescription(e.target.value)} className="w-48" />
      </Field>
      <Field label="Cant.">
        <Input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="w-20"
        />
      </Field>
      <Button type="submit" variant="primary" disabled={saving}>
        {saving ? "Agregando…" : "Agregar"}
      </Button>
    </form>
  );
}

const CSV_TEMPLATE =
  "data:text/csv;charset=utf-8," +
  encodeURIComponent("Designador,Referencia,Descripcion,Cantidad\nU4,BQ24780S,IC de carga,1\n");

/**
 * Carga masiva de componentes desde un CSV/Excel (ver
 * ScrapBoardsService.importComponentsCsv) — para cuando el listado ya
 * viene armado en una hoja de cálculo (ej. a partir de un esquemático o
 * boardview revisado aparte) en vez de capturarlo fila por fila.
 */
function ImportComponentsForm({ boardId, onImported }: { boardId: number; onImported: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportComponentsResult | null>(null);

  async function handleImport() {
    if (!file) return;
    setError(null);
    setResult(null);
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const data = await api.postForm<ImportComponentsResult>(
        `/scrap-boards/${boardId}/components/import`,
        formData,
      );
      setResult(data);
      setFile(null);
      onImported();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo importar el archivo");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-muted">
        Columnas esperadas: <span className="font-mono text-xs">Designador</span>,{" "}
        <span className="font-mono text-xs">Referencia</span> (obligatorias),{" "}
        <span className="font-mono text-xs">Descripcion</span> y{" "}
        <span className="font-mono text-xs">Cantidad</span> (opcionales).{" "}
        <a href={CSV_TEMPLATE} download="plantilla_componentes.csv" className="text-accent hover:underline">
          Descargar plantilla
        </a>
      </p>

      {error && <ErrorBanner message={error} />}

      {result && (
        <div className="rounded border border-border bg-surface-raised p-3 text-sm">
          <p className={result.imported > 0 ? "text-success" : "text-ink-muted"}>
            {result.imported} componente{result.imported === 1 ? "" : "s"} importado
            {result.imported === 1 ? "" : "s"}.
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-warning">
              {result.errors.map((e, i) => (
                <li key={i}>
                  Fila {e.row}: {e.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-xs text-ink-muted file:mr-2 file:rounded file:border file:border-border file:bg-surface-raised file:px-2 file:py-1 file:text-xs file:text-ink"
        />
        {file && (
          <Button type="button" variant="primary" onClick={handleImport} disabled={importing}>
            {importing ? "Importando…" : "Importar"}
          </Button>
        )}
      </div>
    </div>
  );
}
