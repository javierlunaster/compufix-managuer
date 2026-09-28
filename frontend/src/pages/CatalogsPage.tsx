import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { Brand, DeviceTypeCatalog } from "@/lib/types";
import { Button, Card, CardHeader, EmptyState, ErrorBanner, Input, Spinner } from "@/components/ui";

/**
 * Gestión de catálogos cerrados (marcas y tipos de equipo) — antes solo se
 * podían leer (CatalogsService.findAllBrands/findAllDeviceTypes, usados en
 * los formularios de ingreso de equipo), sin forma de agregar uno nuevo ni
 * corregir un nombre mal escrito salvo editando el seed. El mismo
 * componente <CatalogSection> sirve para ambos catálogos — misma forma
 * exacta de API (nombre único, crear/renombrar/activar/desactivar).
 */
export function CatalogsPage() {
  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-ink">Catálogos</h1>
        <p className="text-sm text-ink-muted">
          Marcas y tipos de equipo disponibles al registrar un ingreso
        </p>
      </div>

      <CatalogSection
        title="Marcas"
        subtitle="HP, Lenovo, Asus…"
        listUrl="/catalogs/brands/all"
        baseUrl="/catalogs/brands"
      />
      <CatalogSection
        title="Tipos de equipo"
        subtitle="Portátil, Torre, Tablet…"
        listUrl="/catalogs/device-types/all"
        baseUrl="/catalogs/device-types"
      />
    </div>
  );
}

function CatalogSection({
  title,
  subtitle,
  listUrl,
  baseUrl,
}: {
  title: string;
  subtitle: string;
  listUrl: string;
  baseUrl: string;
}) {
  const { data: items, loading, error, reload } = useFetch(
    () => api.get<(Brand | DeviceTypeCatalog)[]>(listUrl),
    [listUrl],
  );
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setActionError(null);
    setSaving(true);
    try {
      await api.post(baseUrl, { name: newName });
      setNewName("");
      setShowForm(false);
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "No se pudo crear");
    } finally {
      setSaving(false);
    }
  }

  async function handleRename(id: number) {
    setActionError(null);
    setSaving(true);
    try {
      await api.patch(`${baseUrl}/${id}`, { name: editingName });
      setEditingId(null);
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "No se pudo renombrar");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(item: Brand | DeviceTypeCatalog) {
    const action = item.status === "INACTIVE" ? "reactivate" : "deactivate";
    setActionError(null);
    try {
      await api.patch(`${baseUrl}/${item.id}/${action}`);
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "No se pudo completar la acción");
    }
  }

  return (
    <Card>
      <CardHeader
        title={title}
        subtitle={subtitle}
        action={
          <Button variant="secondary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Cancelar" : "+ Nuevo"}
          </Button>
        }
      />

      {actionError && (
        <div className="p-4 pb-0">
          <ErrorBanner message={actionError} />
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="flex items-end gap-2 border-b border-border p-4">
          <div className="flex-1">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre"
              required
              autoFocus
            />
          </div>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Guardando…" : "Crear"}
          </Button>
        </form>
      )}

      {loading && (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      )}
      {error && (
        <div className="p-4">
          <ErrorBanner message={error} />
        </div>
      )}
      {!loading && !error && items?.length === 0 && <EmptyState title="Sin registros todavía" />}
      {!loading && items && items.length > 0 && (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between px-4 py-2.5">
              {editingId === item.id ? (
                <form
                  className="flex flex-1 items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleRename(item.id);
                  }}
                >
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    autoFocus
                    required
                  />
                  <Button type="submit" variant="primary" disabled={saving}>
                    Guardar
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setEditingId(null)}>
                    Cancelar
                  </Button>
                </form>
              ) : (
                <>
                  <span className="text-sm text-ink">
                    {item.name}
                    {item.status === "INACTIVE" && (
                      <span className="ml-2 text-xs uppercase text-danger">Inactivo</span>
                    )}
                  </span>
                  <div className="flex gap-3 text-xs">
                    <button
                      type="button"
                      className="text-ink-muted hover:text-accent"
                      onClick={() => {
                        setEditingId(item.id);
                        setEditingName(item.name);
                      }}
                    >
                      Renombrar
                    </button>
                    <button
                      type="button"
                      className="text-ink-muted hover:text-accent"
                      onClick={() => handleToggleStatus(item)}
                    >
                      {item.status === "INACTIVE" ? "Reactivar" : "Desactivar"}
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
