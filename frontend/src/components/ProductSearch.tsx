import { useState } from "react";
import { api } from "@/lib/api";
import type { Product } from "@/lib/types";
import { Input } from "@/components/ui";
import { formatCurrency } from "@/lib/format";

/**
 * Buscador de productos por SKU/descripción, con resultados en vivo.
 * Reemplaza el campo de "ID de producto" que tenía la pestaña de
 * Repuestos del expediente técnico — se usa ahí y en el módulo de
 * Inventario, así que vive como componente propio en vez de duplicarse.
 */
export function ProductSearch({
  onSelect,
  placeholder = "Buscar por SKU o descripción…",
  lowStockOnly,
}: {
  onSelect: (product: Product) => void;
  placeholder?: string;
  lowStockOnly?: boolean;
}) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  async function search(value: string) {
    setTerm(value);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const products = await api.get<Product[]>("/products", {
        search: value,
        lowStockOnly,
      });
      setResults(products);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <Input value={term} onChange={(e) => search(e.target.value)} placeholder={placeholder} />
      {loading && <p className="mt-1 text-xs text-ink-muted">Buscando…</p>}
      {results.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded border border-border bg-surface-raised shadow-lg">
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-bg"
                onClick={() => {
                  onSelect(p);
                  setTerm("");
                  setResults([]);
                }}
              >
                <span>
                  <span className="font-mono text-xs text-ink-muted">{p.sku}</span>{" "}
                  <span className="text-ink">{p.description}</span>
                </span>
                <span className="flex items-center gap-2 text-xs">
                  <span
                    className={p.stock <= p.minStock ? "text-warning" : "text-ink-muted"}
                  >
                    stock: {p.stock}
                  </span>
                  <span className="tabular text-ink">{formatCurrency(p.salePrice)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
