import type { ReactNode } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { usePortalAuth } from "@/lib/portalAuth";

export function PortalProtectedLayout({ children }: { children: ReactNode }) {
  const { customer, loading, logout } = usePortalAuth();
  const navigate = useNavigate();

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-bg" />;
  }
  if (!customer) {
    return <Navigate to="/portal/login" replace />;
  }

  function handleLogout() {
    logout();
    navigate("/portal/login");
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-6">
          <p className="font-semibold tracking-wide text-ink">
            COMP<span className="text-accent">ufix</span>
          </p>
          <nav className="flex gap-4 text-sm text-ink-muted">
            <Link to="/portal/orders" className="hover:text-accent">
              Mis reparaciones
            </Link>
            <Link to="/portal/quotations" className="hover:text-accent">
              Mis cotizaciones
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-ink-muted">{customer.fullName}</span>
          <button onClick={handleLogout} className="text-ink-muted underline decoration-dotted hover:text-accent">
            Salir
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-2xl p-6">{children}</main>
    </div>
  );
}
