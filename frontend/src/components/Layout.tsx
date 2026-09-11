import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

type NavItem = {
  to: string;
  label: string;
  icon: (props: { className?: string }) => JSX.Element;
  roles?: string[];
};

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Panel", icon: DashboardIcon },
  { to: "/repair-orders", label: "Reparaciones", icon: WrenchIcon },
  { to: "/quotations", label: "Cotizaciones", icon: DocumentIcon },
  { to: "/warranties", label: "Garantías", icon: ShieldIcon },
  { to: "/customers", label: "Clientes", icon: UserIcon },
  { to: "/inventory", label: "Inventario", icon: BoxIcon },
  { to: "/sales", label: "Ventas", icon: CartIcon },
  { to: "/purchases", label: "Compras", icon: TruckIcon },
  { to: "/cash", label: "Caja", icon: CashIcon },
  { to: "/finance", label: "Finanzas", icon: ChartIcon, roles: ["Administrador", "Gerente"] },
  // El backend restringe toda la gestión de usuarios a Administrador
  // (Fase 2) — mostrar este ítem a otros roles solo llevaría a una
  // pantalla que va a fallar con 403 en cada llamada.
  { to: "/users", label: "Usuarios", icon: UsersIcon, roles: ["Administrador"] },
];

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState("");
  // Panel lateral: en pantallas angostas (celular) arranca oculto y se
  // superpone al contenido como un cajón en vez de empujarlo — con ancho
  // fijo de 224px no cabía nada más al lado en una pantalla de ~360-400px.
  // Desde md hacia arriba vuelve al comportamiento de siempre (fijo,
  // siempre visible, en flujo normal), sin importar este estado.
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(user?.role ?? ""),
  );

  // Si el usuario navega por cualquier otro medio (un Link dentro del
  // contenido, el botón "atrás" del navegador), el cajón se cierra solo
  // — sin esto, quedaría abierto tapando la pantalla nueva.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = search.trim();
    if (!term) return;
    navigate(`/repair-orders?search=${encodeURIComponent(term)}`);
  }

  return (
    <div className="flex h-screen bg-bg text-ink">
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 -translate-x-full flex-col border-r border-border bg-surface transition-transform duration-200 md:static md:w-56 md:translate-x-0 ${
          mobileNavOpen ? "translate-x-0" : ""
        }`}
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          {/* El logo trae texto negro sin fondo propio — sobre el fondo
              oscuro del panel se volvería casi invisible, por eso va en
              una tarjeta blanca a modo de placa. */}
          <div className="flex items-center rounded bg-white px-2 py-1 shadow-sm">
            <img src="/logo.png" alt="CompuFix" className="h-7 w-auto" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-ink-muted">Manager</p>
          </div>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className="rounded p-1.5 text-ink-muted hover:bg-surface-raised hover:text-ink md:hidden"
            aria-label="Cerrar menú"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-accent/15 text-accent"
                    : "text-ink-muted hover:bg-surface-raised hover:text-ink"
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <p className="truncate text-sm font-medium">{user?.fullName}</p>
          <p className="truncate text-xs text-ink-muted">{user?.role}</p>
          <div className="mt-2 flex gap-3">
            <Link
              to="/account"
              className="text-xs text-ink-muted underline decoration-dotted hover:text-accent"
            >
              Cambiar contraseña
            </Link>
            <button
              onClick={logout}
              className="text-xs text-ink-muted underline decoration-dotted hover:text-accent"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3 md:gap-4 md:px-6">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="shrink-0 rounded p-2 text-ink-muted hover:bg-surface-raised hover:text-ink md:hidden"
            aria-label="Abrir menú"
          >
            <MenuIcon className="h-5 w-5" />
          </button>

          <form onSubmit={handleSearch} className="min-w-0 flex-1">
            <div className="flex max-w-md items-center gap-2 rounded border border-border bg-bg px-3 py-2">
              <SearchIcon className="h-4 w-4 shrink-0 text-ink-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por código de orden, cliente, serial…"
                className="w-full min-w-0 bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none"
              />
            </div>
          </form>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

// Íconos de línea simples e inline (sin depender de una librería de
// íconos externa) — minimalistas, coherentes con el resto de la interfaz.
function iconProps(className?: string) {
  return {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}

function WrenchIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <path d="M14.7 6.3a4 4 0 1 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-2.83 2.83-2-2z" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
    </svg>
  );
}

function BoxIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <path d="M21 8l-9-5-9 5 9 5 9-5z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v8" />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h6" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <path d="M12 3l7 3v6c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.5 2.5-6 6-6s6 2.5 6 6" />
      <circle cx="17" cy="8" r="2.5" />
      <path d="M15.5 14.2c2.4.5 4.5 2.5 4.5 5.8" />
    </svg>
  );
}

function CartIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <circle cx="9" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
      <path d="M3 4h2l2.5 12h10L20 8H6" />
    </svg>
  );
}

function TruckIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <rect x="1" y="6" width="13" height="10" rx="1" />
      <path d="M14 10h4l3 3v3h-7z" />
      <circle cx="6" cy="18" r="1.5" />
      <circle cx="16.5" cy="18" r="1.5" />
    </svg>
  );
}

function CashIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M6 6v0M18 18v0" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <path d="M4 20V10M12 20V4M20 20v-7" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
