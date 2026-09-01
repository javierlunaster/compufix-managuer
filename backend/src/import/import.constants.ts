import { RepairStatus } from "@prisma/client";

/**
 * Variantes de texto detectadas al analizar `Ingreso de equipos` en la
 * Fase 1 (ver documento de arquitectura, sección G). La clave es la forma
 * normalizada (minúsculas, sin espacios extra) del valor tal como aparece
 * en el Excel; el valor es el nombre canónico que ya existe en el catálogo
 * sembrado por la Fase 1 (`prisma/seed.ts`).
 *
 * Si el archivo real del taller tiene variantes que no están aquí, el
 * importador no las descarta: crea la categoría nueva en el catálogo y lo
 * marca como advertencia (ver ImportService) — nunca pierde un dato por
 * no reconocerlo.
 */
export const DEVICE_TYPE_ALIASES: Record<string, string> = {
  portatil: "Portátil",
  portail: "Portátil",
  portaitil: "Portátil",
  portaitl: "Portátil",
  portitil: "Portátil",
  portatl: "Portátil",
  torre: "Torre",
  "all in one": "All in One",
  "al in one": "All in One",
  "placa base": "Placa base",
  tablet: "Tablet",
  impresora: "Impresora",
};

export const BRAND_ALIASES: Record<string, string> = {
  hp: "HP",
  lenovo: "Lenovo",
  asus: "Asus",
  dell: "Dell",
  acer: "Acer",
  toshiba: "Toshiba",
  compaq: "Compaq",
  mac: "Apple",
  apple: "Apple",
  samsung: "Samsung",
  sony: "Sony",
  clon: "Clon",
};

/**
 * Mapea el `Estado` (texto libre en el Excel) al enum RepairStatus. Solo
 * cubre los 6 valores reales encontrados en el histórico (ver Fase 1) — el
 * flujo ampliado de 14 estados aplica hacia adelante, no se reconstruye
 * retroactivamente (decisión ya confirmada en el documento de arquitectura).
 */
export const HISTORICAL_STATUS_ALIASES: Record<string, RepairStatus> = {
  entregado: RepairStatus.DELIVERED,
  "no reparado": RepairStatus.NOT_REPAIRED,
  ingresado: RepairStatus.RECEIVED,
  diagnosticando: RepairStatus.DIAGNOSING,
  reparado: RepairStatus.REPAIRED,
};
