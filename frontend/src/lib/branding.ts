/**
 * Identidad del negocio (nombre, contacto, redes, logo) — el único lugar
 * del código donde vive la marca. Cada valor tiene como respaldo los
 * datos actuales de CompuFix, así que este despliegue sigue funcionando
 * sin tocar nada; para replicar el sitio a un cliente nuevo, basta con
 * definir estas variables VITE_* en su propio proyecto (ver .env.example)
 * — el mismo código entonces muestra su marca en vez de la de CompuFix,
 * sin volver a tocar un archivo .tsx.
 *
 * Importante: esto cubre identidad y contacto, no el contenido de
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
  // variable ahí, sin tocar el repositorio.
  logoUrl: env("VITE_LOGO_URL", "/logo.png"),
};

export const WHATSAPP_URL = `https://wa.me/${BRAND.whatsappNumber}?text=${encodeURIComponent(BRAND.whatsappMessage)}`;

export const MAPS_URL =
  BRAND.mapsUrlOverride ||
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${BRAND.addressLine1}, ${BRAND.addressLine2}, ${BRAND.addressCity}`,
  )}`;
