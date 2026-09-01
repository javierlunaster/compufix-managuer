const REQUIRED_VARS = [
  "DATABASE_URL",
  "JWT_SECRET",
  "ENCRYPTION_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

// Los valores de ejemplo que trae .env.example — si alguien copia el
// archivo y se le olvida cambiarlos, el sistema arrancaría "funcionando"
// con un secreto de JWT y una llave de cifrado conocidas públicamente
// (están en este mismo repositorio). Se bloquea el arranque en producción
// para que eso sea imposible de pasar por alto.
const PLACEHOLDER_VALUES = new Set([
  "reemplazar-por-un-secreto-seguro",
  "reemplazar-por-una-llave-segura-de-32-bytes",
]);

/**
 * Se llama una sola vez en `main.ts`, antes de crear la aplicación de
 * Nest. Lanzar el error acá (en vez de dejar que cada servicio falle por
 * su cuenta la primera vez que necesite la variable) da un mensaje claro
 * de una sola vez, en el momento de arrancar, no a mitad de una request
 * de un usuario real.
 */
export function validateEnv() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de entorno obligatorias: ${missing.join(", ")}. Revisa tu archivo .env (compáralo con .env.example).`,
    );
  }

  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    const usingPlaceholder = REQUIRED_VARS.filter(
      (key) => process.env[key] && PLACEHOLDER_VALUES.has(process.env[key] as string),
    );
    if (usingPlaceholder.length > 0) {
      throw new Error(
        `No se puede arrancar en producción con valores de ejemplo sin cambiar: ${usingPlaceholder.join(", ")}. Genera secretos propios antes de desplegar.`,
      );
    }
  }
}
