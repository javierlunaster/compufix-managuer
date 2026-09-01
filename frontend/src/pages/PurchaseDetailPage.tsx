import { Link, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { Purchase } from "@/lib/types";
import { PAYMENT_STATUS_LABELS } from "@/lib/types";
import { Card, CardHeader, ErrorBanner, Spinner } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";

export function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: purchase, loading, error } = useFetch(
    () => api.get<Purchase>(`/purchases/${id}`),
    [id],
  );

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }
  if (error || !purchase) {
    return <ErrorBanner message={error ?? "Compra no encontrada"} />;
  }

  return (
    <div className="max-w-2xl space-y-4">
      <Link to="/purchases" className="text-xs text-ink-muted hover:text-accent">
        ← Volver a Compras
      </Link>

      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-ink-muted">
              <Link to={`/suppliers/${purchase.supplier.id}`} className="text-accent hover:underline">
                {purchase.supplier.name}
              </Link>
            </p>
            <h1 className="text-xl font-semibold text-ink">
              {purchase.invoiceNumber ? `Factura ${purchase.invoiceNumber}` : `Compra #${purchase.id}`}
            </h1>
            <p className="text-sm text-ink-muted">{formatDate(purchase.date)}</p>
          </div>
          <span className="font-mono text-xs uppercase text-ink-muted">
            {PAYMENT_STATUS_LABELS[purchase.paymentStatus] ?? purchase.paymentStatus}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-4 border-t border-border pt-4 text-sm">
          <Money label="Subtotal" value={purchase.subtotal} />
          <Money label="Impuesto" value={purchase.tax} />
          <Money label="Envío" value={purchase.shipping} />
          <Money label="Total" value={purchase.total} emphasize />
        </div>
      </Card>

      <Card>
        <CardHeader title="Productos comprados" />
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-2">Producto</th>
              <th className="px-4 py-2">Cant.</th>
              <th className="px-4 py-2">Costo unit.</th>
              <th className="px-4 py-2">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {purchase.items?.map((item) => (
              <tr key={item.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2">
                  <Link to={`/inventory/${item.product.id}`} className="text-ink hover:text-accent">
                    {item.product.description}
                  </Link>
                  <p className="font-mono text-xs text-ink-muted">{item.product.sku}</p>
                </td>
                <td className="px-4 py-2 tabular text-ink-muted">{item.quantity}</td>
                <td className="px-4 py-2 tabular text-ink-muted">{formatCurrency(item.unitCost)}</td>
                <td className="px-4 py-2 tabular text-ink">{formatCurrency(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
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
