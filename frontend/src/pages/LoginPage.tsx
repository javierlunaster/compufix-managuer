import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { Button, ErrorBanner, Field, Input } from "@/components/ui";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          {/* Tarjeta blanca: el logo trae texto negro sin fondo propio,
              sobre este fondo oscuro se volvería casi invisible. */}
          <div className="inline-flex items-center rounded-lg bg-white px-4 py-2 shadow-sm">
            <img src="/logo.png" alt="CompuFix Soluciones Integrales" className="h-10 w-auto" />
          </div>
          <div className="text-center">
            <p className="text-sm text-ink-muted">Sistema del taller</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded border border-border bg-surface p-6">
          {error && <ErrorBanner message={error} />}

          <Field label="Usuario">
            <Input
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              required
            />
          </Field>

          <Field label="Contraseña">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </Field>

          <Button type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? "Ingresando…" : "Ingresar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
