/**
 * Normaliza un nombre para comparación de duplicados: minúsculas, sin
 * tildes/diacríticos, espacios múltiples colapsados y recortados.
 *
 * Esta es la misma regla que se definió en el plan de migración del
 * documento de arquitectura (sección H, Paso 2): "Manuel Gonzalez" y
 * "MANUEL   GONZÁLEZ " deben normalizar al mismo valor.
 */
export function normalizeName(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita tildes/diacríticos
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}
