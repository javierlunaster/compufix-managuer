import { useState } from "react";
import { useParams } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { Brand, InventoryMovement, Product, ProductCategory } from "@/lib/types";
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
import { formatCurrency, formatDateTime } from "@/lib/format";

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  PURCHASE: "Compra",
  SALE: "Venta",
  USED_IN_REPAIR: "Usado en reparación",
  ADJUSTMENT: "Ajuste",
  RETURN: "Devolución",
  TRANSFER: "Transferencia",
  LOSS: "Pérdida",
  WARRANTY_REPLACEMENT: "Reemplazo por garantía",
};

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    data: product,
    loading,
    error,
    reload: reloadProduct,
  } = useFetch(() => api.get<Product>(`/products/${id}`), [id]);

  const {
    data: movements,
    reload: reloadMovements,
  } = useFetch(() => api.get<InventoryMovement[]>("/inventory-movements", { productId: id }), [id]);

  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  function reloadAll() {
    reloadProduct();
    reloadMovements();
  }

  async function handleToggleStatus() {
    if (!product) return;
    const action = product.status === "ACTIVE" ? "deactivate" : "reactivate";
    const confirmMsg =
      product.status === "ACTIVE"
        ? "¿Desactivar este producto? Dejará de aparecer en el buscador para nuevas ventas, compras o reparaciones."
        : "¿Reactivar este producto?";
    if (!confirm(confirmMsg)) return;

    setBusy(true);
    setActionError(null);
    try {
      await api.patch(`/products/${product.id}/${action}`);
      reloadProduct();
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
  if (error || !product) {
    return <ErrorBanner message={error ?? "Producto no encontrado"} />;
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-sm text-ink-muted">{product.sku}</p>
          <h1 className="text-xl font-semibold text-ink">
            {product.description}
            {product.status === "INACTIVE" && (
              <span className="ml-2 text-xs uppercase text-danger">Inactivo</span>
            )}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setEditing((e) => !e)}>
            {editing ? "Cancelar" : "Editar"}
          </Button>
          <Button
            variant={product.status === "ACTIVE" ? "danger" : "secondary"}
            onClick={handleToggleStatus}
            disabled={busy}
          >
            {product.status === "ACTIVE" ? "Desactivar" : "Reactivar"}
          </Button>
        </div>
      </div>

      {actionError && <ErrorBanner message={actionError} />}

      {editing ? (
        <EditProductForm
          product={product}
          onSaved={() => {
            setEditing(false);
            reloadProduct();
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <Card>
          <CardHeader title="Datos del producto" />
          <dl className="grid grid-cols-3 gap-4 p-4 text-sm">
            <Detail label="Categoría" value={product.category?.name} />
            <Detail label="Marca" value={product.brand?.name} />
            <Detail label="Ubicación" value={product.location} />
            <Detail label="Costo" value={formatCurrency(product.cost)} />
            <Detail label="Precio de venta" value={formatCurrency(product.salePrice)} />
            <Detail label="Stock mínimo" value={String(product.minStock)} />
          </dl>
          <div className="border-t border-border px-4 py-3">
            <span className="text-xs uppercase tracking-wide text-ink-muted">Stock actual</span>
            <p className={`font-mono text-2xl tabular ${product.stock <= product.minStock ? "text-warning" : "text-ink"}`}>
              {product.stock}
            </p>
          </div>
        </Card>
      )}

      <AdjustStockForm productId={product.id} onAdjusted={reloadAll} />

      <Card>
        <CardHeader title="Historial de movimientos" />
        {movements && movements.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">Cantidad</th>
                <th className="px-4 py-2">Usuario</th>
                <th className="px-4 py-2">Nota</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 tabular text-ink-muted">{formatDateTime(m.createdAt)}</td>
                  <td className="px-4 py-2 text-ink">{MOVEMENT_TYPE_LABELS[m.type] ?? m.type}</td>
                  <td className={`px-4 py-2 tabular ${m.quantity < 0 ? "text-danger" : "text-success"}`}>
                    {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                  </td>
                  <td className="px-4 py-2 text-ink-muted">{m.user.fullName}</td>
                  <td className="px-4 py-2 text-ink-muted">{m.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState title="Sin movimientos registrados todavía" />
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

/**
 * No incluye stock ni SKU en un campo libre reeditable a la ligera: SKU sí
 * se puede corregir (a veces se digita mal al crear el producto), pero el
 * stock queda deliberadamente fuera — cualquier cambio de existencias pasa
 * por un movimiento de inventario explícito (AdjustStockForm, abajo),
 * nunca por una edición general del producto (Regla 2 del brief).
 */
function EditProductForm({
  product,
  onSaved,
  onCancel,
}: {
  product: Product;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { data: categories } = useFetch(() => api.get<ProductCategory[]>("/product-categories"), []);
  const { data: brands } = useFetch(() => api.get<Brand[]>("/catalogs/brands"), []);

  const [sku, setSku] = useState(product.sku);
  const [internalCode, setInternalCode] = useState(product.internalCode ?? "");
  const [description, setDescription] = useState(product.description);
  const [categoryId, setCategoryId] = useState(String(product.categoryId));
  const [brandId, setBrandId] = useState(product.brandId ? String(product.brandId) : "");
  const [cost, setCost] = useState(product.cost);
  const [salePrice, setSalePrice] = useState(product.salePrice);
  const [minStock, setMinStock] = useState(String(product.minStock));
  const [location, setLocation] = useState(product.location ?? "");
  const [warrantyMonths, setWarrantyMonths] = useState(
    product.warrantyMonths ? String(product.warrantyMonths) : "",
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.patch(`/products/${product.id}`, {
        sku,
        internalCode: internalCode || undefined,
        description,
        categoryId: Number(categoryId),
        brandId: brandId ? Number(brandId) : undefined,
        cost: cost ? Number(cost) : undefined,
        salePrice: salePrice ? Number(salePrice) : undefined,
        minStock: Number(minStock),
        location: location || undefined,
        warrantyMonths: warrantyMonths ? Number(warrantyMonths) : undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el producto");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Editar producto" />
      <form onSubmit={handleSubmit} className="space-y-3 p-4">
        {error && <ErrorBanner message={error} />}

        <Field label="Descripción">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} required />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="SKU">
            <Input value={sku} onChange={(e) => setSku(e.target.value)} required />
          </Field>
          <Field label="Código interno (opcional)">
            <Input value={internalCode} onChange={(e) => setInternalCode(e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoría">
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
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

        <div className="grid grid-cols-3 gap-3">
          <Field label="Costo">
            <Input type="number" min={0} value={cost} onChange={(e) => setCost(e.target.value)} />
          </Field>
          <Field label="Precio de venta">
            <Input type="number" min={0} value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
          </Field>
          <Field label="Stock mínimo">
            <Input type="number" min={0} value={minStock} onChange={(e) => setMinStock(e.target.value)} required />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Ubicación (opcional)">
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          </Field>
          <Field label="Garantía del repuesto (meses, opcional)">
            <Input type="number" min={0} value={warrantyMonths} onChange={(e) => setWarrantyMonths(e.target.value)} />
          </Field>
        </div>

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

function AdjustStockForm({ productId, onAdjusted }: { productId: number; onAdjusted: () => void }) {
  const [type, setType] = useState("ADJUSTMENT");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post("/inventory-movements", {
        productId,
        type,
        quantity: Number(quantity),
        notes,
      });
      setQuantity("");
      setNotes("");
      onAdjusted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo registrar el movimiento");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Registrar movimiento manual" subtitle="Ajuste, pérdida, devolución, transferencia" />
      <form onSubmit={handleSubmit} className="space-y-3 p-4">
        {error && <ErrorBanner message={error} />}
        <div className="grid grid-cols-3 gap-3">
          <Field label="Tipo">
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="ADJUSTMENT">Ajuste</option>
              <option value="LOSS">Pérdida</option>
              <option value="RETURN">Devolución</option>
              <option value="TRANSFER">Transferencia</option>
              <option value="WARRANTY_REPLACEMENT">Reemplazo por garantía</option>
            </Select>
          </Field>
          <Field label="Cantidad (negativa para restar)">
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="ej. -2 o 5"
              required
            />
          </Field>
          <Field label="Observación">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} required />
          </Field>
        </div>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Registrando…" : "Registrar movimiento"}
        </Button>
      </form>
    </Card>
  );
}
