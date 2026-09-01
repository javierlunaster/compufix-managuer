import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  Button,
  Card,
  CardHeader,
  ErrorBanner,
  Field,
  Input,
} from "@/components/ui";

export function AccountPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-md space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-ink">Mi cuenta</h1>
        <p className="text-sm text-ink-muted">
          {user?.fullName} · {user?.role}
        </p>
      </div>

      <ChangeOwnPasswordForm />
    </div>
  );
}

function ChangeOwnPasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);

    if (newPassword !== confirmPassword) {
      setError("La confirmación no coincide con la nueva contraseña");
      return;
    }

    setSaving(true);
    try {
      await api.patch("/auth/change-password", { currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cambiar la contraseña");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Cambiar mi contraseña" subtitle="Necesitas escribir tu contraseña actual para confirmarlo" />
      <form onSubmit={handleSubmit} className="space-y-3 p-4">
        {error && <ErrorBanner message={error} />}
        {done && (
          <p className="rounded border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
            Contraseña actualizada correctamente.
          </p>
        )}

        <Field label="Contraseña actual">
          <Input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </Field>
        <Field label="Nueva contraseña (mínimo 8 caracteres)">
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            required
          />
        </Field>
        <Field label="Confirmar nueva contraseña">
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={8}
            required
          />
        </Field>

        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Guardando…" : "Cambiar contraseña"}
        </Button>
      </form>
    </Card>
  );
}
