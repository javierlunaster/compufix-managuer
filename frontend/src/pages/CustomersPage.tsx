import { useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { Customer } from "@/lib/types";
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

export function CustomersPage() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: customers, loading, error, reload } = useFetch(
    () => api.get<Customer[]>("/customers", { search }),
    [search],
  );

  return (
    <div className="max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Clientes</h1>
          <p className="text-sm text-ink-muted">Búsqueda por nombre, teléfono o documento</p>
        </div>
        <Button variant="primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancelar" : "+ Nuevo cliente"}
        </Button>
      </div>

      {showForm && (
        <div className="mb-4">
          <NewCustomerForm
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
        placeholder="Buscar cliente…"
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
        {!loading && !error && customers?.length === 0 && (
          <EmptyState title="Sin resultados" description="Ningún cliente coincide con la búsqueda" />
        )}
        {!loading && customers && customers.length > 0 && (
          <ul className="divide-y divide-border">
            {customers.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/customers/${c.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-surface-raised"
                >
                  <div>
                    <p className="font-medium text-ink">{c.fullName}</p>
                    <p className="text-sm text-ink-muted">
                      {c.phone ?? "Sin teléfono"} {c.documentId ? `· ${c.documentId}` : ""}
                    </p>
                  </div>
                  <span className="font-mono text-xs text-ink-muted">#{c.id}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function NewCustomerForm({ onCreated }: { onCreated: () => void }) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<
    { id: number; fullName: string; phone?: string | null }[] | null
  >(null);

  async function handleSubmit(e: React.FormEvent, confirmDuplicate = false) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post("/customers", {
        fullName,
        phone: phone || undefined,
        whatsapp: whatsapp || undefined,
        documentId: documentId || undefined,
        email: email || undefined,
        city: city || undefined,
        address: address || undefined,
        confirmCreateDespiteDuplicate: confirmDuplicate || undefined,
      });
      onCreated();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // El backend (Fase 3) responde 409 con la lista de posibles
        // duplicados — se muestra para que la persona decida, en vez de
        // fallar en silencio o crear el registro sin preguntar.
        const payload = err.payload as { possibleDuplicates?: typeof duplicates };
        setDuplicates(payload.possibleDuplicates ?? []);
      } else {
        setError(err instanceof ApiError ? err.message : "No se pudo crear el cliente");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Nuevo cliente" />
      <form onSubmit={(e) => handleSubmit(e)} className="space-y-3 p-4">
        {error && <ErrorBanner message={error} />}

        {duplicates && duplicates.length > 0 && (
          <div className="rounded border border-warning/30 bg-warning/10 p-3 text-sm">
            <p className="font-medium text-warning">Ya existe alguien con un nombre parecido:</p>
            <ul className="mt-2 space-y-1 text-ink-muted">
              {duplicates.map((d) => (
                <li key={d.id}>
                  {d.fullName} {d.phone ? `— ${d.phone}` : ""}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setDuplicates(null)}>
                Es la misma persona, cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={(e) => handleSubmit(e as unknown as React.FormEvent, true)}
              >
                Es alguien distinto, crear igual
              </Button>
            </div>
          </div>
        )}

        <Field label="Nombre completo / razón social">
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Teléfono">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="WhatsApp">
            <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Documento">
            <Input value={documentId} onChange={(e) => setDocumentId(e.target.value)} />
          </Field>
          <Field label="Correo">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ciudad">
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </Field>
          <Field label="Dirección">
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </Field>
        </div>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Guardando…" : "Crear cliente"}
        </Button>
      </form>
    </Card>
  );
}
