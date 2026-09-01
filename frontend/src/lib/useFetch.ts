import { useCallback, useEffect, useState } from "react";
import { ApiError } from "./api";

/**
 * No es React Query — es deliberadamente simple (useEffect + useState) para
 * no sumar una dependencia más a un proyecto que ya es bastante grande.
 * Si el frontend crece mucho más allá de este scaffold inicial, vale la
 * pena migrar a algo como TanStack Query para cache/revalidación.
 */
export function useFetch<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fn()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Ocurrió un error inesperado");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey]);

  return { data, loading, error, reload };
}
