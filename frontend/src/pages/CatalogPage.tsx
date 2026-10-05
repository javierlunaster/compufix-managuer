import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BRAND } from "@/lib/branding";
import { api, resolvePhotoUrl } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { formatCurrency } from "@/lib/format";
import type { Paginated, PublicCatalogFilters, PublicProduct } from "@/lib/types";
import "./CatalogPage.css";

const PAGE_SIZE = 24;

function whatsappLinkFor(product: PublicProduct) {
  const message = `Hola, quiero consultar por: ${product.description}`;
  return `https://wa.me/${BRAND.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

/**
 * Vitrina pública de productos — sin login, pensada para compartir el
 * link directo con un cliente (ver PublicCatalogController en el
 * backend). Mismo lenguaje visual que LandingPage (header/footer, CSS
 * propio con variables de index.css) — no reutiliza los componentes de
 * @/components/ui porque esos asumen el contexto autenticado del panel.
 */
export function CatalogPage() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    document.title = `Catálogo — ${BRAND.name}`;
  }, []);

  const { data: filters } = useFetch(
    () => api.get<PublicCatalogFilters>("/public/catalog/filters"),
    [],
  );
  const { data: result, loading, error } = useFetch(
    () =>
      api.get<Paginated<PublicProduct>>("/public/catalog/products", {
        search: search || undefined,
        categoryId: categoryId || undefined,
        brandId: brandId || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    [search, categoryId, brandId, page],
  );

  const products = result?.data ?? [];
  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;

  function resetToFirstPage() {
    setPage(1);
  }

  return (
    <div className="catalog-page">
      <header className="site">
        <div className="wrap header-row">
          <Link to="/" className="brand">
            <span className="brand-logo">
              <img src={BRAND.logoUrl} alt={BRAND.name} />
            </span>
            <span className="brand-tag">{BRAND.locationTag}</span>
          </Link>
          <div className="header-actions">
            <a className="phone-readout" href={`tel:${BRAND.phoneDial}`}>
              {BRAND.phoneDisplay}
            </a>
            <Link className="staff-link" to="/login">
              Personal
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="catalog-intro wrap">
          <p className="eyebrow">Catálogo de repuestos y accesorios</p>
          <h1>Lo que tenemos disponible, al día.</h1>
          <p className="lede">
            Consulta precios y disponibilidad — escríbenos por WhatsApp para confirmar o apartar
            un producto.
          </p>
        </section>

        <section className="catalog-filters wrap">
          <input
            className="catalog-search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetToFirstPage();
            }}
            placeholder="Buscar producto…"
          />
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              resetToFirstPage();
            }}
          >
            <option value="">Todas las categorías</option>
            {filters?.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={brandId}
            onChange={(e) => {
              setBrandId(e.target.value);
              resetToFirstPage();
            }}
          >
            <option value="">Todas las marcas</option>
            {filters?.brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </section>

        <section className="catalog-grid-section wrap">
          {loading && <p className="catalog-status">Cargando…</p>}
          {error && <p className="catalog-status catalog-error">{error}</p>}
          {!loading && !error && products.length === 0 && (
            <p className="catalog-status">Ningún producto coincide con la búsqueda.</p>
          )}

          {!loading && products.length > 0 && (
            <div className="catalog-grid">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          {!loading && result && totalPages > 1 && (
            <div className="catalog-pagination">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </button>
              <span>
                Página {page} de {totalPages}
              </span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Siguiente
              </button>
            </div>
          )}
        </section>
      </main>

      <footer className="site">
        <div className="wrap footer-row">
          <span>
            © {new Date().getFullYear()} {BRAND.name} — {BRAND.footerLocation}
          </span>
          <span>{BRAND.footerTagline}</span>
        </div>
      </footer>
    </div>
  );
}

function ProductCard({ product }: { product: PublicProduct }) {
  const photo = product.photos[0];
  return (
    <article className="product-card">
      <div className="product-photo">
        {photo ? (
          <img src={resolvePhotoUrl(photo.fileUrl)} alt={product.description} loading="lazy" />
        ) : (
          <div className="product-photo-placeholder" aria-hidden="true">
            <PlaceholderIcon />
          </div>
        )}
        <span className={`stock-badge ${product.inStock ? "in-stock" : "out-of-stock"}`}>
          {product.inStock ? "Disponible" : "Agotado"}
        </span>
      </div>
      <div className="product-body">
        {product.brand && <p className="product-brand">{product.brand.name}</p>}
        <h3 className="product-name">{product.description}</h3>
        <p className="product-category">{product.category.name}</p>
        <p className="product-price">{formatCurrency(product.salePrice)}</p>
        {product.warrantyMonths ? (
          <p className="product-warranty">Garantía: {product.warrantyMonths} meses</p>
        ) : null}
        <a
          className="btn btn-primary product-whatsapp"
          href={whatsappLinkFor(product)}
          target="_blank"
          rel="noreferrer"
        >
          Consultar por WhatsApp
        </a>
      </div>
    </article>
  );
}

function PlaceholderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M21 8l-9-5-9 5 9 5 9-5z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v8" />
    </svg>
  );
}
