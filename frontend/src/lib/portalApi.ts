import { API_ORIGIN, resolvePhotoUrl } from "@/lib/api";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

// Llave de localStorage DISTINTA a la del personal ("compufix_token") a
// propósito — si alguien tiene abierta una sesión de personal y una de
// portal de clientes en el mismo navegador (poco común, pero posible en
// el mismo computador de recepción), cada una debe vivir en su propio
// cajón sin pisarse.
const PORTAL_TOKEN_KEY = "compufix_portal_token";

export function getPortalToken(): string | null {
  return localStorage.getItem(PORTAL_TOKEN_KEY);
}

export function setPortalToken(token: string) {
  localStorage.setItem(PORTAL_TOKEN_KEY, token);
}

export function clearPortalToken() {
  localStorage.removeItem(PORTAL_TOKEN_KEY);
}

export class PortalApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function portalRequest<T>(
  path: string,
  options: { method?: "GET" | "POST"; body?: unknown } = {},
): Promise<T> {
  const { method = "GET", body } = options;
  const token = getPortalToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(API_BASE_URL + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message: unknown }).message)
        : null) ?? `Error ${response.status}`;
    if (response.status === 401) {
      clearPortalToken();
    }
    throw new PortalApiError(response.status, message);
  }

  return payload as T;
}

export { API_ORIGIN, resolvePhotoUrl };

export const portalApi = {
  get: <T>(path: string) => portalRequest<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) => portalRequest<T>(path, { method: "POST", body }),
};
