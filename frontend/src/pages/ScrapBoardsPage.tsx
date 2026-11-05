import { useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type {
  Brand,
  DeviceTypeCatalog,
  ScrapBoardListItem,
  ScrapComponentSearchResult,
} from "@/lib/types";
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
/**
 * Inventario de placas base de SCRAP: placas donadas/desechadas que se
 * conservan solo como fuente de componentes para reparar OTRAS placas.
 * El problema real que esto resuelve (ver ScrapBoardsService en el
 * backend): antes de esto, saber si algún componente ya disponible en
 * SCRAP sirve para una reparación tomaba horas de revisar placa por
 * placa a mano — por eso la búsqueda de componentes va primero en esta
 * página, antes que la lista/gestión de placas.
 */
export function ScrapBoardsPage() {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const {
    data: boards,
    loading,
    error,
    reload,
  } = useFetch(() => api.get<ScrapBoardListItem[]>("/scrap-boards", { search }), [search]);

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Placas SCRAP</h1>
        <p className="text-sm text-ink-muted">
          Inventario de placas base donadas/desechadas, conservadas como fuente de componentes
        </p>
      </div>

      <ComponentSearchCard />

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-ink-muted">
          Inventario de placas
        </h2>
        <Button variant="primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancelar" : "+ Nueva placa"}
        </Button>
      </div>

      {showForm && (
        <NewScrapBoardForm
          onCreated={() => {
            setShowForm(false);
            reload();
          }}
        />
      )}

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por código, modelo o ubicación…"
        className="max-w-sm"
      />

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
        {!loading && !error && boards?.length === 0 && (
          <EmptyState title="Sin placas SCRAP registradas todavía" />
        )}
        {!loading && boards && boards.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-2">Código</th>
                <th className="px-4 py-2">Modelo</th>
                <th className="px-4 py-2">Marca</th>
                <th className="px-4 py-2">Tipo de equipo</th>
                <th className="px-4 py-2">Ubicación</th>
                <th className="px-4 py-2">Componentes disp.</th>
              </tr>
            </thead>
            <tbody>
              {boards.map((b) => (
                <tr key={b.id} className="border-b border-border last:border-0 hover:bg-surface-raised">
                  <td className="px-4 py-3">
                    <Link to={`/scrap-boards/${b.id}`} className="font-mono text-xs text-accent">
                      {b.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink">{b.model}</td>
                  <td className="px-4 py-3 text-ink-muted">{b.brand?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-muted">{b.deviceType?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-muted">{b.location ?? "—"}</td>
                  <td className="px-4 py-3 tabular text-ink">{b._count.components}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function ComponentSearchCard() {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<ScrapComponentSearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(value: string) {
    setTerm(value);
    if (value.trim().length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<ScrapComponentSearchResult[]>("/scrap-components/search", { q: value });
      setResults(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo buscar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-accent/30 bg-accent/5">
      <CardHeader
        title="Buscar componente"
        subtitle="Por designador de serigrafía (ej. U4) o por referencia (ej. BQ24780S) — dice en qué placa está"
      />
      <div className="p-4">
        <Input
          value={term}
          onChange={(e) => search(e.target.value)}
          placeholder="Ej. U4, BQ24780S…"
        />
        {loading && <p className="mt-2 text-xs text-ink-muted">Buscando…</p>}
        {error && (
          <div className="mt-2">
            <ErrorBanner message={error} />
          </div>
        )}
        {results && results.length === 0 && (
          <p className="mt-2 text-sm text-ink-muted">
            Ningún componente disponible coincide con "{term}".
          </p>
        )}
        {results && results.length > 0 && (
          <ul className="mt-3 divide-y divide-border">
            {results.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2">
                <div className="text-sm">
                  <span className="font-mono text-xs text-ink">{r.designator}</span>{" "}
                  <span className="text-ink">{r.reference}</span>
                  {r.description && <span className="text-ink-muted"> — {r.description}</span>}
                  <span className="ml-2 text-xs text-ink-muted">x{r.quantity}</span>
                </div>
                <Link
                  to={`/scrap-boards/${r.scrapBoard.id}`}
                  className="flex items-center gap-2 text-sm text-accent hover:underline"
                >
                  <span className="font-mono text-xs">{r.scrapBoard.code}</span>
                  <span className="text-ink-muted">
                    {r.scrapBoard.model}
                    {r.scrapBoard.location && ` · ${r.scrapBoard.location}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function NewScrapBoardForm({ onCreated }: { onCreated: () => void }) {
  const { data: brands } = useFetch(() => api.get<Brand[]>("/catalogs/brands"), []);
  const { data: deviceTypes } = useFetch(
    () => api.get<DeviceTypeCatalog[]>("/catalogs/device-types"),
    [],
  );

  const [model, setModel] = useState("");
  const [brandId, setBrandId] = useState("");
  const [deviceTypeId, setDeviceTypeId] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post("/scrap-boards", {
        model,
        brandId: brandId ? Number(brandId) : undefined,
        deviceTypeId: deviceTypeId ? Number(deviceTypeId) : undefined,
        location: location || undefined,
        notes: notes || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la placa");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Nueva placa SCRAP" />
      <form onSubmit={handleSubmit} className="space-y-3 p-4">
        {error && <ErrorBanner message={error} />}

        <Field label="Modelo de la placa (ej. DA0ZAUMB8E0, no el modelo comercial del equipo)">
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
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ej. Estante 3 - Caja B"
          />
        </Field>

        <Field label="Notas (opcional)">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Guardando…" : "Crear placa"}
        </Button>
      </form>
    </Card>
  );
}
