/**
 * Nombre del negocio usado en los documentos generados (PDF) y en el
 * arranque del servidor — el único lugar del backend donde vive la marca.
 * Respaldo: los datos actuales de CompuFix, así que este despliegue sigue
 * funcionando sin tocar nada; para replicar el backend a un cliente
 * nuevo, basta con definir BUSINESS_NAME (y opcionalmente
 * BUSINESS_TAGLINE) en su propio proyecto (ver .env.example).
 */
export const BUSINESS_NAME = process.env.BUSINESS_NAME || "CompuFix Soluciones Integrales";
export const BUSINESS_TAGLINE =
  process.env.BUSINESS_TAGLINE || "Taller de reparación de computadores";
