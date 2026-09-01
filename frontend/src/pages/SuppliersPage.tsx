import { useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { Supplier } from "@/lib/types";
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

export function SuppliersPage() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: suppliers, loading, error, reload } = useFetch(
    () => api.get<Supplier[]>("/suppliers", { search }),
    [search],
  );

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Proveedores</h1>
          <p className="text-sm text-ink-muted">A quién le compra el taller</p>
        </div>
        <Button variant="primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancelar" : "+ Nuevo proveedor"}
        </Button>
      </div>

      {showForm && (
        <div className="mb-4">
          <NewSupplierForm
            onCreated={() => {
              setShowForm(false);
              reload();
            }}
          />
        </div>
      )}

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar proveedor…"
        className="mb-4"
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
        {!loading && !error && suppliers?.length === 0 && (
          <EmptyState title="Sin proveedores registrados" />
        )}
        {!loading && suppliers && suppliers.length > 0 && (
          <ul className="divide-y divide-border">
            {suppliers.map((s) => (
              <li key={s.id}>
                <Link
                  to={`/suppliers/${s.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-surface-raised"
                >
                  <div>
                    <p className="font-medium text-ink">{s.name}</p>
                    <p className="text-sm text-ink-muted">
                      {s.contactName ?? "Sin contacto"} {s.phone ? `· ${s.phone}` : ""}
                    </p>
                  </div>
                  <span className="font-mono text-xs text-ink-muted">#{s.id}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function NewSupplierForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [paymentAccount, setPaymentAccount] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post("/suppliers", {
        name,
        contactName: contactName || undefined,
        phone: phone || undefined,
        whatsapp: whatsapp || undefined,
        email: email || undefined,
        paymentAccount: paymentAccount || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el proveedor");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Nuevo proveedor" />
      <form onSubmit={handleSubmit} className="space-y-3 p-4">
        {error && <ErrorBanner message={error} />}

        <Field label="Nombre / empresa">
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
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
        <Field label="Cuenta de pago (ej. Nequi, Bancolombia)">
          <Input value={paymentAccount} onChange={(e) => setPaymentAccount(e.target.value)} />
        </Field>

        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Guardando…" : "Crear proveedor"}
        </Button>
      </form>
    </Card>
  );
}
