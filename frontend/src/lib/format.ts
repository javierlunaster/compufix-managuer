const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function formatCurrency(value: string | number): string {
  const num = typeof value === "string" ? Number(value) : value;
  return currencyFormatter.format(Number.isFinite(num) ? num : 0);
}

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(value: string): string {
  return dateFormatter.format(new Date(value));
}

export function formatDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value));
}

// Sin timeZone: "UTC" aquí, Intl.DateTimeFormat usa la zona horaria del
// navegador. El backend calcula el mes con date_trunc('month', ...) en
// UTC (ej. "2026-08-01T00:00:00.000Z" para "agosto") — en un navegador en
// Colombia (UTC-5), esa medianoche UTC cae el 31 de julio a las 7pm hora
// local, así que sin forzar UTC aquí, agosto se mostraría etiquetado
// como julio. El dato nunca estuvo mal; solo la etiqueta.
const monthLabelFormatter = new Intl.DateTimeFormat("es-CO", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatMonthLabel(value: string): string {
  const label = monthLabelFormatter.format(new Date(value));
  return label.charAt(0).toUpperCase() + label.slice(1);
}
