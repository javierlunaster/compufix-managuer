const SPANISH_MONTHS: Record<string, number> = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  abril: 3,
  mayo: 4,
  junio: 5,
  julio: 6,
  agosto: 7,
  septiembre: 8,
  setiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11,
};

/**
 * El Excel guarda la fecha en 3 columnas separadas (Año / Mes en texto en
 * español / Día) en vez de una fecha real — patrón detectado en
 * `Ingreso de equipos` (ver documento de arquitectura, Fase 1). Devuelve
 * `null` si cualquiera de las partes no se puede interpretar, para que el
 * importador la trate como "Fecha inválida" (sección 27 del brief) en vez
 * de adivinar una fecha incorrecta.
 */
export function parseSpanishDate(
  year: unknown,
  monthName: unknown,
  day: unknown,
): Date | null {
  const yearNum = Number(year);
  const dayNum = Number(day);
  const monthKey = String(monthName ?? "")
    .trim()
    .toLowerCase();
  const monthNum = SPANISH_MONTHS[monthKey];

  if (
    !Number.isInteger(yearNum) ||
    yearNum < 2000 ||
    yearNum > 2100 ||
    monthNum === undefined ||
    !Number.isInteger(dayNum) ||
    dayNum < 1 ||
    dayNum > 31
  ) {
    return null;
  }

  const date = new Date(yearNum, monthNum, dayNum);
  // JS "corrige" fechas imposibles (ej. 31 de febrero → 3 de marzo) en vez
  // de fallar — se revisa que el día siga siendo el mismo después de
  // construir la fecha, para detectar esos casos como inválidos.
  if (date.getDate() !== dayNum || date.getMonth() !== monthNum) {
    return null;
  }

  return date;
}
