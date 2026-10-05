import type { BusinessSettings } from "./types";

/**
 * Identidad del negocio (nombre, contacto, redes, logo, tema) — el único
 * lugar del código donde vive la marca. Cada valor arranca con el respaldo
 * de las variables VITE_* (horneadas al build, ver .env.example) y luego,
 * en tiempo de ejecución, `applyBusinessSettings()` lo sobrescribe con lo
 * que el negocio haya guardado en la página "Configuración" (tabla
 * `business_settings`, ver BusinessSettingsService en el backend) — así un
 * cambio de marca no requiere volver a construir ni desplegar el frontend.
 *
 * Importante: esto cubre identidad, contacto y tema, no el contenido de
 * marketing (los 6 servicios, los 5 pasos del proceso, los títulos del
 * hero). Ese texto sigue siendo el mismo redactado para un taller de
 * reparación electrónica — si el cliente nuevo ofrece algo distinto, esa
 * copy hay que ajustarla a mano en LandingPage.tsx, no es un dato de
 * configuración.
 *
 * "No definida" (la variable ni existe) usa el respaldo de CompuFix.
 * "Definida vacía" (VITE_SOCIAL_FACEBOOK="") se respeta tal cual — así un
 * cliente sin Instagram, por ejemplo, la deja vacía y ese enlace
 * simplemente no se muestra, en vez de heredar el de CompuFix.
 */
function env(key: string, fallback: string): string {
  const value = (import.meta.env as Record<string, string | undefined>)[key];
  return value === undefined ? fallback : value;
}

export const BRAND = {
  // Nombre completo (título de la página, copyright del pie) y corto
  // (alt del logo). Para un cliente nuevo, normalmente son iguales.
  name: env("VITE_BUSINESS_NAME", "CompuFix Soluciones Integrales"),
  shortName: env("VITE_BUSINESS_SHORT_NAME", "CompuFix"),

  locationTag: env("VITE_BUSINESS_LOCATION", "Cartagena, Bolívar"),
  footerLocation: env("VITE_BUSINESS_FOOTER_LOCATION", "Cartagena, Colombia"),
  footerTagline: env("VITE_BUSINESS_FOOTER_TAGLINE", "Diagnóstico · Reparación · Repuestos"),

  phoneDisplay: env("VITE_BUSINESS_PHONE_DISPLAY", "301 395 1619"),
  phoneDial: env("VITE_BUSINESS_PHONE_DIAL", "+573013951619"),

  whatsappNumber: env("VITE_WHATSAPP_NUMBER", "573013951619"),
  whatsappMessage: env("VITE_WHATSAPP_MESSAGE", "Hola, quiero una cotización para mi equipo"),

  addressLine1: env("VITE_BUSINESS_ADDRESS_LINE1", "Transversal 68 Manzana 31 Lote 21"),
  addressLine2: env("VITE_BUSINESS_ADDRESS_LINE2", "Las Gaviotas, segunda etapa"),
  addressCity: env("VITE_BUSINESS_ADDRESS_CITY", "Cartagena, Bolívar"),
  // Si se define, se usa tal cual en vez de armar la búsqueda a partir de
  // la dirección — útil si el cliente prefiere pegar el enlace exacto de
  // su ubicación en Google Maps.
  mapsUrlOverride: env("VITE_MAPS_URL", ""),

  // Vacío = no se muestra ese enlace en "Redes" (ver LandingPage.tsx).
  facebookUrl: env("VITE_SOCIAL_FACEBOOK", "https://www.facebook.com/compufixsolucionesintegrales/"),
  instagramUrl: env("VITE_SOCIAL_INSTAGRAM", "https://www.instagram.com/javierenriqueluna/"),
  youtubeUrl: env("VITE_SOCIAL_YOUTUBE", "https://www.youtube.com/@javierlunamarzola"),

  // Ruta o URL del logo. Con un despliegue separado por cliente (repo
  // compartido, infraestructura propia) lo más simple suele ser alojar el
  // logo del cliente en su propio Supabase Storage y apuntar esta
  // variable ahí, sin tocar el repositorio. `applyBusinessSettings()` lo
  // sobrescribe con la URL subida desde Configuración en cuanto existe.
  logoUrl: env("VITE_LOGO_URL", "/logo.png"),
};

export let WHATSAPP_URL = `https://wa.me/${BRAND.whatsappNumber}?text=${encodeURIComponent(BRAND.whatsappMessage)}`;

export let MAPS_URL =
  BRAND.mapsUrlOverride ||
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${BRAND.addressLine1}, ${BRAND.addressLine2}, ${BRAND.addressCity}`,
  )}`;

/**
 * Sobrescribe `BRAND` en el sitio con lo guardado en Configuración y
 * aplica el color de acento como variables CSS (ver index.css/
 * tailwind.config.js — `bg-accent`/`text-accent` ya apuntan a
 * `--accent`/`--accent-strong`, así que esto no necesita tocar ninguna
 * clase existente). Se llama una vez al arrancar la app (ver App.tsx) —
 * nunca se reemplaza el objeto `BRAND` por uno nuevo porque varios
 * módulos ya tienen una referencia a él importada por valor.
 */
export function applyBusinessSettings(settings: BusinessSettings) {
  BRAND.name = settings.businessName;
  BRAND.shortName = settings.shortName;
  BRAND.locationTag = settings.locationTag;
  BRAND.footerLocation = settings.footerLocation;
  BRAND.footerTagline = settings.footerTagline;
  BRAND.phoneDisplay = settings.phoneDisplay ?? "";
  BRAND.phoneDial = settings.phoneDial ?? "";
  BRAND.whatsappNumber = settings.whatsappNumber ?? "";
  BRAND.whatsappMessage = settings.whatsappMessage;
  BRAND.addressLine1 = settings.addressLine1 ?? "";
  BRAND.addressLine2 = settings.addressLine2 ?? "";
  BRAND.addressCity = settings.addressCity ?? "";
  BRAND.mapsUrlOverride = settings.mapsUrlOverride ?? "";
  BRAND.facebookUrl = settings.facebookUrl ?? "";
  BRAND.instagramUrl = settings.instagramUrl ?? "";
  BRAND.youtubeUrl = settings.youtubeUrl ?? "";
  if (settings.logoUrl) {
    BRAND.logoUrl = settings.logoUrl;
  }

  WHATSAPP_URL = `https://wa.me/${BRAND.whatsappNumber}?text=${encodeURIComponent(BRAND.whatsappMessage)}`;
  MAPS_URL =
    BRAND.mapsUrlOverride ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${BRAND.addressLine1}, ${BRAND.addressLine2}, ${BRAND.addressCity}`,
    )}`;

  const root = document.documentElement.style;
  root.setProperty("--accent", settings.accentColor);
  root.setProperty("--accent-strong", settings.accentStrongColor);
}
