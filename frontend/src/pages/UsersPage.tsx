import { useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { Role, SystemUser } from "@/lib/types";
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

export function UsersPage() {
  const [showForm, setShowForm] = useState(false);
  const { data: users, loading, error, reload } = useFetch(
    () => api.get<SystemUser[]>("/users"),
    [],
  );

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Usuarios y técnicos</h1>
          <p className="text-sm text-ink-muted">Quién puede entrar al sistema y con qué rol</p>
        </div>
        <Button variant="primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancelar" : "+ Nuevo usuario"}
        </Button>
      </div>

      {showForm && (
        <div className="mb-4">
          <NewUserForm
            onCreated={() => {
              setShowForm(false);
              reload();
            }}
          />
        </div>
      )}

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
        {!loading && !error && users?.length === 0 && <EmptyState title="Sin usuarios registrados" />}
        {!loading && users && users.length > 0 && (
          <ul className="divide-y divide-border">
            {users.map((u) => (
              <li key={u.id}>
                <Link
                  to={`/users/${u.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-surface-raised"
                >
                  <div>
                    <p className="text-ink">
                      {u.fullName}
                      {u.status === "INACTIVE" && (
                        <span className="ml-2 text-xs uppercase text-danger">Inactivo</span>
                      )}
                    </p>
                    <p className="text-sm text-ink-muted">
                      @{u.username} · {u.role.name}
                      {u.specialty ? ` · ${u.specialty}` : ""}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function NewUserForm({ onCreated }: { onCreated: () => void }) {
  const { data: roles } = useFetch(() => api.get<Role[]>("/roles"), []);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [documentId, setDocumentId] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!roleId) {
      setError("Selecciona un rol");
      return;
    }
    setSaving(true);
    try {
      await api.post("/users", {
        fullName,
        username,
        password,
        roleId: Number(roleId),
        specialty: specialty || undefined,
        phone: phone || undefined,
        email: email || undefined,
        documentId: documentId || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el usuario");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Nuevo usuario" />
      <form onSubmit={handleSubmit} className="space-y-3 p-4">
        {error && <ErrorBanner message={error} />}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre completo">
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </Field>
          <Field label="Rol">
            <Select value={roleId} onChange={(e) => setRoleId(e.target.value)} required>
              <option value="">Selecciona…</option>
              {roles?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Usuario (para iniciar sesión)">
            <Input value={username} onChange={(e) => setUsername(e.target.value)} required />
          </Field>
          <Field label="Contraseña temporal">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </Field>
        </div>

        <Field label="Especialidad (opcional, solo para técnicos)">
          <Input
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            placeholder="Ej. Diagnóstico electrónico, reparación de placas"
          />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Teléfono">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="Correo">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Documento">
            <Input value={documentId} onChange={(e) => setDocumentId(e.target.value)} />
          </Field>
        </div>

        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Guardando…" : "Crear usuario"}
        </Button>
      </form>
    </Card>
  );
}
