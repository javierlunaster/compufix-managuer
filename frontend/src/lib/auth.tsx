import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, clearToken, getToken, setToken, UNAUTHORIZED_EVENT } from "./api";
import type { AuthUser } from "./types";

type LoginResponse = { accessToken: string; user: AuthUser };

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const USER_KEY = "compufix_user";
export const SESSION_EXPIRED_KEY = "compufix_session_expired";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Al cargar la app, si ya había un token+usuario guardados de una sesión
  // anterior, se restauran de inmediato para no forzar un login en cada
  // recarga de página. Si el token venció, la primera llamada a la API
  // fallará con 401 y api.ts ya se encarga de limpiarlo.
  useEffect(() => {
    const token = getToken();
    const storedUser = localStorage.getItem(USER_KEY);
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // Si el token vence mientras la persona ya está adentro (sin recargar
  // la página), api.ts lo detecta en la siguiente llamada y avisa con
  // este evento — sin este listener, `user` se quedaba poblado en
  // memoria para siempre y ProtectedLayout nunca mandaba de vuelta a
  // /login, dejando el menú visible con cada acción fallando en
  // "Unauthorized".
  useEffect(() => {
    function handleUnauthorized() {
      // Bandera de una sola lectura: LoginPage la revisa al montar para
      // mostrar "tu sesión expiró" y la borra de inmediato — así no se
      // confunde con un login normal (sin sesión previa) donde no debe
      // aparecer ese aviso.
      sessionStorage.setItem(SESSION_EXPIRED_KEY, "1");
      localStorage.removeItem(USER_KEY);
      setUser(null);
    }
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  async function login(username: string, password: string) {
    const response = await api.post<LoginResponse>("/auth/login", { username, password });
    setToken(response.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    setUser(response.user);
  }

  function logout() {
    clearToken();
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return ctx;
}
