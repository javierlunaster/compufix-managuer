import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { Supplier } from "@/lib/types";
import { PAYMENT_STATUS_LABELS } from "@/lib/types";
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
  Spinner,
} from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";

export function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: supplier, loading, error, reload } = useFetch(
    () => api.get<Supplier>(`/suppliers/${id}`),
    [id],
  );

  const [editing, setEditing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleDeactivate() {
    if (!confirm("¿Desactivar este proveedor? Ya no aparecerá para nuevas compras.")) return;
    setBusy(true);
    setActionError(null);
    try {
      await api.patch(`/suppliers/${id}/deactivate`);
      navigate("/suppliers");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "No se pudo desactivar");
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
  if (error || !supplier) {
    return <ErrorBanner message={error ?? "Proveedor no encontrado"} />;
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">{supplier.name}</h1>
          {supplier.status === "INACTIVE" && (
            <span className="text-xs uppercase text-danger">Inactivo</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setEditing((e) => !e)}>
            {editing ? "Cancelar" : "Editar"}
          </Button>
          {supplier.status !== "INACTIVE" && (
            <Button variant="danger" onClick={handleDeactivate} disabled={busy}>
              Desactivar
            </Button>
          )}
        </div>
      </div>

      {actionError && <ErrorBanner message={actionError} />}

      {editing ? (
        <EditSupplierForm
          supplier={supplier}
          onSaved={() => {
            setEditing(false);
            reload();
          }}
        />
      ) : (
        <Card>
          <CardHeader title="Datos de contacto" />
          <dl className="grid grid-cols-2 gap-4 p-4 text-sm">
            <Detail label="Persona de contacto" value={supplier.contactName} />
            <Detail label="Teléfono" value={supplier.phone} />
            <Detail label="WhatsApp" value={supplier.whatsapp} />
            <Detail label="Correo" value={supplier.email} />
            <Detail label="Documento" value={supplier.documentId} />
            <Detail label="Cuenta de pago" value={supplier.paymentAccount} />
            <Detail label="Dirección" value={supplier.address} />
          </dl>
        </Card>
      )}

      <Card>
        <CardHeader title="Historial de compras" />
        {supplier.purchases && supplier.purchases.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Total</th>
                <th className="px-4 py-2">Estado de pago</th>
              </tr>
            </thead>
            <tbody>
              {supplier.purchases.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 tabular text-ink-muted">{formatDate(p.date)}</td>
                  <td className="px-4 py-2 tabular text-ink">{formatCurrency(p.total)}</td>
                  <td className="px-4 py-2 text-ink-muted">
                    {PAYMENT_STATUS_LABELS[p.paymentStatus] ?? p.paymentStatus}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState title="Sin compras registradas a este proveedor todavía" />
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

function EditSupplierForm({ supplier, onSaved }: { supplier: Supplier; onSaved: () => void }) {
  const [contactName, setContactName] = useState(supplier.contactName ?? "");
  const [phone, setPhone] = useState(supplier.phone ?? "");
  const [whatsapp, setWhatsapp] = useState(supplier.whatsapp ?? "");
  const [email, setEmail] = useState(supplier.email ?? "");
  const [paymentAccount, setPaymentAccount] = useState(supplier.paymentAccount ?? "");
  const [address, setAddress] = useState(supplier.address ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.patch(`/suppliers/${supplier.id}`, {
        contactName: contactName || undefined,
        phone: phone || undefined,
        whatsapp: whatsapp || undefined,
        email: email || undefined,
        paymentAccount: paymentAccount || undefined,
        address: address || undefined,
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
      <CardHeader title="Editar datos" />
      <form onSubmit={handleSubmit} className="space-y-3 p-4">
        {error && <ErrorBanner message={error} />}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Persona de contacto">
            <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </Field>
          <Field label="Teléfono">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="WhatsApp">
            <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
          </Field>
          <Field label="Correo">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        </div>
        <Field label="Cuenta de pago">
          <Input value={paymentAccount} onChange={(e) => setPaymentAccount(e.target.value)} />
        </Field>
        <Field label="Dirección">
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </Button>
      </form>
    </Card>
  );
}
