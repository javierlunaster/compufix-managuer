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

// Mismo mecanismo que UNAUTHORIZED_EVENT en lib/api.ts, con su propio
// nombre de evento — portal y personal son sesiones independientes en el
// mismo navegador (ver PORTAL_TOKEN_KEY arriba), así que un token de
// portal vencido no debe cerrar una sesión de personal abierta en otra
// pestaña, ni viceversa.
export const PORTAL_UNAUTHORIZED_EVENT = "compufix:portal-unauthorized";

function handlePortalUnauthorized() {
  clearPortalToken();
  window.dispatchEvent(new Event(PORTAL_UNAUTHORIZED_EVENT));
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
  options: { method?: "GET" | "POST" | "PATCH"; body?: unknown } = {},
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
      handlePortalUnauthorized();
    }
    throw new PortalApiError(response.status, message);
  }

  return payload as T;
}

// Aparte de portalRequest (que siempre manda JSON) porque un archivo va
// como FormData, sin el header Content-Type manual — el navegador arma
// el boundary del multipart solo, y ponerlo a mano lo rompe. Mismo
// patrón que requestForm() en lib/api.ts para el personal.
async function portalRequestForm<T>(path: string, formData: FormData): Promise<T> {
  const token = getPortalToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(API_BASE_URL + path, {
    method: "POST",
    headers,
    body: formData,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message: unknown }).message)
        : null) ?? `Error ${response.status}`;
    if (response.status === 401) {
      handlePortalUnauthorized();
    }
    throw new PortalApiError(response.status, message);
  }

  return payload as T;
}

export { API_ORIGIN, resolvePhotoUrl };

export const portalApi = {
  get: <T>(path: string) => portalRequest<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) => portalRequest<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => portalRequest<T>(path, { method: "PATCH", body }),
  postForm: <T>(path: string, formData: FormData) => portalRequestForm<T>(path, formData),
};
