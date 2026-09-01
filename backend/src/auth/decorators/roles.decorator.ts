import { SetMetadata } from "@nestjs/common";

export const ROLES_KEY = "roles";

/**
 * Restringe un endpoint a uno o más roles, ej.:
 *   @Roles("Administrador", "Gerente")
 * Se evalúa en RolesGuard contra el rol del usuario autenticado.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
