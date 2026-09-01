import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { Brand, Product, ProductCategory } from "@/lib/types";
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
import { formatCurrency } from "@/lib/format";

export function ProductsPage() {
  const [params, setParams] = useSearchParams();
  const search = params.get("search") ?? "";
  const categoryId = params.get("categoryId") ?? "";
  const lowStockOnly = params.get("lowStockOnly") === "true";
  const [showForm, setShowForm] = useState(false);
  const [showCategories, setShowCategories] = useState(false);

  const { data: categories, reload: reloadCategories } = useFetch(
    () => api.get<ProductCategory[]>("/product-categories"),
    [],
  );

  const {
    data: products,
    loading,
    error,
    reload,
  } = useFetch(
    () => api.get<Product[]>("/products", { search, categoryId: categoryId || undefined, lowStockOnly }),
    [search, categoryId, lowStockOnly],
  );

  function updateParam(key: string, value: string) {
    setParams((p) => {
      const next = Object.fromEntries(p);
      if (value) next[key] = value;
      else delete next[key];
      return next;
    });
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Inventario</h1>
          <p className="text-sm text-ink-muted">Productos, repuestos y accesorios</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowCategories((s) => !s)}>
            {showCategories ? "Cerrar categorías" : "Categorías"}
          </Button>
          <Button variant="primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Cancelar" : "+ Nuevo producto"}
          </Button>
        </div>
      </div>

      {showCategories && (
        <div className="mb-4">
          <ManageCategoriesPanel categories={categories ?? []} onChanged={reloadCategories} />
        </div>
      )}

      {showForm && (
        <div className="mb-4">
          <NewProductForm
            categories={categories ?? []}
            onCategoryCreated={reloadCategories}
            onCreated={() => {
              setShowForm(false);
              reload();
            }}
          />
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          value={search}
          onChange={(e) => updateParam("search", e.target.value)}
          placeholder="Buscar por SKU o descripción…"
          className="max-w-sm"
        />
        <Select
          value={categoryId}
          onChange={(e) => updateParam("categoryId", e.target.value)}
          className="max-w-xs"
        >
          <option value="">Todas las categorías</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 rounded border border-border bg-surface px-3 py-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => updateParam("lowStockOnly", e.target.checked ? "true" : "")}
            className="h-4 w-4 accent-accent"
          />
          Solo stock bajo
        </label>
      </div>

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
        {!loading && !error && products?.length === 0 && (
          <EmptyState title="Sin resultados" description="Ningún producto coincide con la búsqueda" />
        )}
        {!loading && products && products.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-2">SKU</th>
                <th className="px-4 py-2">Descripción</th>
                <th className="px-4 py-2">Categoría</th>
                <th className="px-4 py-2">Stock</th>
                <th className="px-4 py-2">Precio</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface-raised">
                  <td className="px-4 py-3">
                    <Link to={`/inventory/${p.id}`} className="font-mono text-xs text-accent">
                      {p.sku}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink">{p.description}</td>
                  <td className="px-4 py-3 text-ink-muted">{p.category?.name ?? "—"}</td>
                  <td className="px-4 py-3 tabular">
                    <span className={p.stock <= p.minStock ? "text-warning" : "text-ink"}>
                      {p.stock}
                    </span>
                    <span className="text-ink-muted"> / mín. {p.minStock}</span>
                  </td>
                  <td className="px-4 py-3 tabular text-ink">{formatCurrency(p.salePrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

/**
 * Sin botón de "reactivar" a propósito: el backend nunca tuvo ese endpoint
 * para categorías (a diferencia de clientes/productos, que sí lo tienen) —
 * desactivar una categoría desde aquí es, en la práctica, difícil de
 * deshacer sin entrar directo a la base de datos. El mensaje de
 * confirmación lo deja explícito para que nadie lo haga por error
 * pensando que después la puede reactivar con un clic.
 */
function ManageCategoriesPanel({
  categories,
  onChanged,
}: {
  categories: ProductCategory[];
  onChanged: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setError(null);
    setSaving(true);
    try {
      await api.post("/product-categories", { name: newName.trim() });
      setNewName("");
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la categoría");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(category: ProductCategory) {
    const confirmed = confirm(
      `¿Desactivar "${category.name}"? No hay forma de reactivarla desde la interfaz — solo quedaría crear una categoría nueva con el mismo nombre.`,
    );
    if (!confirmed) return;
    setError(null);
    try {
      await api.patch(`/product-categories/${category.id}/deactivate`);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo desactivar la categoría");
    }
  }

  return (
    <Card>
      <CardHeader title="Categorías de producto" />
      <div className="p-4">
        {error && (
          <div className="mb-3">
            <ErrorBanner message={error} />
          </div>
        )}

        {categories.length > 0 ? (
          <ul className="mb-4 divide-y divide-border">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-ink">{c.name}</span>
                <button
                  type="button"
                  onClick={() => handleDeactivate(c)}
                  className="text-xs text-danger hover:underline"
                >
                  Desactivar
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-4 text-sm text-ink-muted">Sin categorías activas todavía.</p>
        )}

        <form onSubmit={handleAdd} className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre de la categoría nueva"
          />
          <Button type="submit" variant="secondary" disabled={saving}>
            {saving ? "Creando…" : "Agregar"}
          </Button>
        </form>
      </div>
    </Card>
  );
}

function NewProductForm({
  categories,
  onCategoryCreated,
  onCreated,
}: {
  categories: ProductCategory[];
  onCategoryCreated: () => void;
  onCreated: () => void;
}) {
  const { data: brands } = useFetch(() => api.get<Brand[]>("/catalogs/brands"), []);

  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [cost, setCost] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [minStock, setMinStock] = useState("0");
  const [initialStock, setInitialStock] = useState("0");
  const [newCategoryName, setNewCategoryName] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return;
    try {
      await api.post("/product-categories", { name: newCategoryName.trim() });
      setNewCategoryName("");
      onCategoryCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la categoría");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!categoryId) {
      setError("Selecciona o crea una categoría primero");
      return;
    }
    setSaving(true);
    try {
      await api.post("/products", {
        sku,
        description,
        categoryId: Number(categoryId),
        brandId: brandId ? Number(brandId) : undefined,
        cost: cost ? Number(cost) : undefined,
        salePrice: salePrice ? Number(salePrice) : undefined,
        minStock: Number(minStock) || 0,
        initialStock: Number(initialStock) || 0,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el producto");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Nuevo producto" />
      <form onSubmit={handleSubmit} className="space-y-3 p-4">
        {error && <ErrorBanner message={error} />}

        <div className="grid grid-cols-2 gap-3">
          <Field label="SKU">
            <Input value={sku} onChange={(e) => setSku(e.target.value)} required />
          </Field>
          <Field label="Descripción">
            <Input value={description} onChange={(e) => setDescription(e.target.value)} required />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Field label="Categoría">
              <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Selecciona…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="mt-1 flex gap-2">
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="…o crea una categoría nueva"
                className="text-xs"
              />
              <Button type="button" variant="secondary" onClick={handleAddCategory}>
                Agregar
              </Button>
            </div>
          </div>
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

        <div className="grid grid-cols-4 gap-3">
          <Field label="Costo">
            <Input type="number" min={0} value={cost} onChange={(e) => setCost(e.target.value)} />
          </Field>
          <Field label="Precio de venta">
            <Input
              type="number"
              min={0}
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
            />
          </Field>
          <Field label="Stock mínimo">
            <Input
              type="number"
              min={0}
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
            />
          </Field>
          <Field label="Stock inicial">
            <Input
              type="number"
              min={0}
              value={initialStock}
              onChange={(e) => setInitialStock(e.target.value)}
            />
          </Field>
        </div>

        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Guardando…" : "Crear producto"}
        </Button>
      </form>
    </Card>
  );
}
