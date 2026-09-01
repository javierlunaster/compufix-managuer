import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/**
 * Marca un endpoint como accesible sin token (ej. login). Se usa junto con
 * JwtAuthGuard, que está registrado globalmente — sin este decorador,
 * TODA ruta nueva queda protegida por defecto (fail-safe: es más seguro
 * olvidar marcar una ruta pública que olvidar protegerla).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
