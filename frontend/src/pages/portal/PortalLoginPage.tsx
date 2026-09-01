import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePortalAuth } from "@/lib/portalAuth";
import { PortalApiError } from "@/lib/portalApi";
import { Button, Card, ErrorBanner, Field, Input } from "@/components/ui";

export function PortalLoginPage() {
  const { login } = usePortalAuth();
  const navigate = useNavigate();
  const [documentId, setDocumentId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await login(documentId.trim());
      navigate("/portal/orders");
    } catch (err) {
      setError(err instanceof PortalApiError ? err.message : "No se pudo iniciar sesión");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-2xl font-semibold tracking-wide text-ink">
            COMP<span className="text-accent">ufix</span>
          </p>
          <p className="text-sm text-ink-muted">Consulta tus reparaciones</p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <ErrorBanner message={error} />}
            <Field label="Número de documento">
              <Input
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                placeholder="Tu documento de identidad"
                autoFocus
                required
              />
            </Field>
            <p className="text-xs text-ink-muted">
              Ingresa con tu número de documento — es tu usuario y tu contraseña.
            </p>
            <Button type="submit" variant="primary" disabled={saving} className="w-full justify-center">
              {saving ? "Ingresando…" : "Ingresar"}
            </Button>
          </form>
        </Card>

        <p className="mt-4 text-center text-xs text-ink-muted">
          ¿No encuentras tus reparaciones? Comunícate con el taller.
        </p>
      </div>
    </div>
  );
}
