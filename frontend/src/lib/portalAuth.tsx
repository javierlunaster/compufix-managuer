import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { portalApi, clearPortalToken, getPortalToken, setPortalToken } from "./portalApi";

type PortalCustomer = { id: number; fullName: string };
type PortalLoginResponse = { accessToken: string; customer: PortalCustomer };

type PortalAuthContextValue = {
  customer: PortalCustomer | null;
  loading: boolean;
  login: (documentId: string) => Promise<void>;
  logout: () => void;
};

const PortalAuthContext = createContext<PortalAuthContextValue | null>(null);

const PORTAL_CUSTOMER_KEY = "compufix_portal_customer";

export function PortalAuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<PortalCustomer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getPortalToken();
    const stored = localStorage.getItem(PORTAL_CUSTOMER_KEY);
    if (token && stored) {
      setCustomer(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  // Usuario y contraseña son el mismo número de documento — el propio
  // formulario de login del portal solo pide un campo y lo manda como
  // ambos valores, así que esta función recibe uno solo.
  async function login(documentId: string) {
    const response = await portalApi.post<PortalLoginResponse>("/customer-portal/login", {
      documentId,
      password: documentId,
    });
    setPortalToken(response.accessToken);
    localStorage.setItem(PORTAL_CUSTOMER_KEY, JSON.stringify(response.customer));
    setCustomer(response.customer);
  }

  function logout() {
    clearPortalToken();
    localStorage.removeItem(PORTAL_CUSTOMER_KEY);
    setCustomer(null);
  }

  return (
    <PortalAuthContext.Provider value={{ customer, loading, login, logout }}>
      {children}
    </PortalAuthContext.Provider>
  );
}

export function usePortalAuth() {
  const ctx = useContext(PortalAuthContext);
  if (!ctx) {
    throw new Error("usePortalAuth debe usarse dentro de <PortalAuthProvider>");
  }
  return ctx;
}
