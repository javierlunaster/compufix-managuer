import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError, resolvePhotoUrl } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { Role, SystemUser } from "@/lib/types";
import {
  Button,
  Card,
  CardHeader,
  ErrorBanner,
  Field,
  Input,
  Select,
  Spinner,
} from "@/components/ui";
import { formatDate } from "@/lib/format";

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: user, loading, error, reload } = useFetch(
    () => api.get<SystemUser>(`/users/${id}`),
    [id],
  );
  const { data: roles } = useFetch(() => api.get<Role[]>("/roles"), []);

  const [editing, setEditing] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleToggleStatus() {
    if (!user) return;
    const action = user.status === "ACTIVE" ? "deactivate" : "reactivate";
    const confirmMsg =
      user.status === "ACTIVE"
        ? "¿Desactivar a este usuario? No podrá iniciar sesión hasta que lo reactives."
        : "¿Reactivar a este usuario?";
    if (!confirm(confirmMsg)) return;

    setBusy(true);
    setActionError(null);
    try {
      await api.patch(`/users/${user.id}/${action}`);
      reload();
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
  if (error || !user) {
    return <ErrorBanner message={error ?? "Usuario no encontrado"} />;
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">{user.fullName}</h1>
          <p className="text-sm text-ink-muted">
            @{user.username} · {user.role.name}
            {user.status === "INACTIVE" && <span className="ml-2 uppercase text-danger">Inactivo</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setEditing((e) => !e)}>
            {editing ? "Cancelar" : "Editar"}
          </Button>
          <Button
            variant={user.status === "ACTIVE" ? "danger" : "secondary"}
            onClick={handleToggleStatus}
            disabled={busy}
          >
            {user.status === "ACTIVE" ? "Desactivar" : "Reactivar"}
          </Button>
        </div>
      </div>

      {actionError && <ErrorBanner message={actionError} />}

      {editing ? (
        <EditUserForm
          user={user}
          roles={roles ?? []}
          onSaved={() => {
            setEditing(false);
            reload();
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <Card>
          <CardHeader title="Datos" />
          <dl className="grid grid-cols-2 gap-4 p-4 text-sm">
            <Detail label="Correo" value={user.email} />
            <Detail label="Teléfono" value={user.phone} />
            <Detail label="Documento" value={user.documentId} />
            <Detail label="Especialidad" value={user.specialty} />
            <Detail label="Usuario desde" value={formatDate(user.createdAt)} />
          </dl>
        </Card>
      )}

      <Card>
        <CardHeader title="Contraseña" subtitle="Restablécela si el usuario la olvidó" />
        {resettingPassword ? (
          <ResetPasswordForm
            userId={user.id}
            onDone={() => setResettingPassword(false)}
          />
        ) : (
          <div className="p-4">
            <Button variant="secondary" onClick={() => setResettingPassword(true)}>
              Restablecer contraseña
            </Button>
          </div>
        )}
      </Card>

      <SignatureCard user={user} onUpdated={reload} />
    </div>
  );
}

/**
 * Firma (imagen) de este usuario — sale impresa en documentos donde firma
 * como técnico responsable (ver DocumentsService.generateTechnicalReport)
 * o, si es el propietario del negocio y en Configuración todavía no se
 * subió una firma propia, como respaldo en la cuenta de cobro (ver
 * DocumentsService.generateServiceJobAccount). Si no se sube, esos
 * documentos siguen saliendo igual que antes, con la línea en blanco.
 */
function SignatureCard({ user, onUpdated }: { user: SystemUser; onUpdated: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await api.postForm(`/users/${user.id}/signature`, formData);
      setFile(null);
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo subir la firma");
    } finally {
      setBusy(false);
    }
  }

  async function handleClear() {
    if (!confirm("¿Quitar la firma de este usuario?")) return;
    setError(null);
    setBusy(true);
    try {
      await api.delete(`/users/${user.id}/signature`);
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo quitar la firma");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Firma" subtitle="Sale impresa en los documentos donde este usuario firma" />
      <div className="flex flex-wrap items-center gap-4 p-4">
        {user.signatureUrl && (
          <div className="flex items-center rounded bg-white px-3 py-2 shadow-sm">
            <img src={resolvePhotoUrl(user.signatureUrl)} alt="Firma" className="h-14 w-auto" />
          </div>
        )}
        <div className="flex flex-1 flex-col gap-2">
          {error && <ErrorBanner message={error} />}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-xs text-ink-muted file:mr-2 file:rounded file:border file:border-border file:bg-surface-raised file:px-2 file:py-1 file:text-xs file:text-ink"
          />
          <div className="flex gap-2">
            {file && (
              <Button type="button" variant="secondary" onClick={handleUpload} disabled={busy}>
                {busy ? "Subiendo…" : "Subir firma"}
              </Button>
            )}
            {user.signatureUrl && !file && (
              <Button type="button" variant="danger" onClick={handleClear} disabled={busy}>
                Quitar firma
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
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

function EditUserForm({
  user,
  roles,
  onSaved,
  onCancel,
}: {
  user: SystemUser;
  roles: Role[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [fullName, setFullName] = useState(user.fullName);
  const [roleId, setRoleId] = useState(String(user.roleId));
  const [specialty, setSpecialty] = useState(user.specialty ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [email, setEmail] = useState(user.email ?? "");
  const [documentId, setDocumentId] = useState(user.documentId ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.patch(`/users/${user.id}`, {
        fullName,
        roleId: Number(roleId),
        specialty: specialty || undefined,
        phone: phone || undefined,
        email: email || undefined,
        documentId: documentId || undefined,
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
      <CardHeader title="Editar usuario" />
      <form onSubmit={handleSubmit} className="space-y-3 p-4">
        {error && <ErrorBanner message={error} />}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre completo">
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </Field>
          <Field label="Rol">
            <Select value={roleId} onChange={(e) => setRoleId(e.target.value)}>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Especialidad">
          <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
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

function ResetPasswordForm({ userId, onDone }: { userId: number; onDone: () => void }) {
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.patch(`/users/${userId}/reset-password`, { newPassword });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo restablecer la contraseña");
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="p-4 text-sm">
        <p className="text-success">Contraseña actualizada. Comunícasela al usuario de forma segura.</p>
        <Button variant="ghost" onClick={onDone} className="mt-2">
          Cerrar
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3 p-4">
      {error && <ErrorBanner message={error} />}
      <Field label="Nueva contraseña (mínimo 8 caracteres)">
        <Input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          minLength={8}
          required
        />
      </Field>
      <Button type="submit" variant="primary" disabled={saving}>
        {saving ? "Guardando…" : "Restablecer"}
      </Button>
    </form>
  );
}
