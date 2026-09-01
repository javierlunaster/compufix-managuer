const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

// Se mantiene por compatibilidad con datos antiguos (ver resolvePhotoUrl
// más abajo) — ya no se usa para fotos nuevas, que ahora se suben a
// Supabase Storage con URL absoluta propia.
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

/**
 * `Attachment.fileUrl` ahora guarda una URL absoluta de Supabase Storage
 * (ver backend/src/storage). Se mantiene el fallback a API_ORIGIN por si
 * quedan registros antiguos con la ruta relativa "/uploads/..." de antes
 * de la migración a Railway + Supabase.
 */
export function resolvePhotoUrl(fileUrl: string): string {
  return /^https?:\/\//.test(fileUrl) ? fileUrl : `${API_ORIGIN}${fileUrl}`;
}

const TOKEN_KEY = "compufix_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, message: string, payload: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

/**
 * Envoltorio delgado sobre fetch: agrega el header de autorización, arma la
 * query string, y convierte cualquier respuesta no-2xx en un ApiError con
 * el mensaje que ya viene armado desde el backend (Nest devuelve
 * { message, ... } en sus excepciones — ver refusal/validation pipes del
 * backend), para no tener que repetir ese parsing en cada pantalla.
 */
async function request<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: unknown;
    query?: Record<string, string | number | boolean | undefined>;
  } = {},
): Promise<T> {
  const { method = "GET", body, query } = options;

  const url = new URL(API_BASE_URL + path);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (payload && typeof payload === "object" && "message" in payload
        ? Array.isArray((payload as { message: unknown }).message)
          ? (payload as { message: string[] }).message.join(", ")
          : String((payload as { message: unknown }).message)
        : null) ?? `Error ${response.status}`;

    // Si el token expiró o es inválido, se limpia para forzar un login
    // limpio en vez de dejar a la persona atrapada en pantallas rotas.
    if (response.status === 401) {
      clearToken();
    }

    throw new ApiError(response.status, message, payload);
  }

  return payload as T;
}

/**
 * Igual que `request`, pero para subir archivos: envía FormData en vez de
 * JSON, y deliberadamente NO fija el header Content-Type — el navegador
 * necesita ponerlo él mismo con el "boundary" correcto del multipart, algo
 * que no se puede replicar a mano de forma confiable.
 */
async function requestForm<T>(path: string, formData: FormData): Promise<T> {
  const token = getToken();
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
        ? Array.isArray((payload as { message: unknown }).message)
          ? (payload as { message: string[] }).message.join(", ")
          : String((payload as { message: unknown }).message)
        : null) ?? `Error ${response.status}`;
    if (response.status === 401) {
      clearToken();
    }
    throw new ApiError(response.status, message, payload);
  }

  return payload as T;
}

/**
 * Descarga un archivo protegido por token (los PDFs, ver Fase 11/16). Un
 * `<a href="...">` normal no puede mandar el header Authorization, así que
 * se trae el archivo con fetch, se arma un blob, y se dispara la descarga
 * mediante un enlace temporal invisible — el patrón estándar para
 * descargas autenticadas en una SPA.
 */
async function downloadFile(path: string, fallbackFilename: string): Promise<void> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(API_BASE_URL + path, { headers });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      (payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message: unknown }).message)
        : null) ?? `Error ${response.status}`;
    throw new ApiError(response.status, message, payload);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition");
  const match = disposition?.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? fallbackFilename;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const api = {
  get: <T>(path: string, query?: Record<string, string | number | boolean | undefined>) =>
    request<T>(path, { method: "GET", query }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  postForm: <T>(path: string, formData: FormData) => requestForm<T>(path, formData),
  download: (path: string, fallbackFilename: string) => downloadFile(path, fallbackFilename),
};
