import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { AuthenticatedUser } from "../decorators/current-user.decorator";

/**
 * Se aplica DESPUÉS de JwtAuthGuard (el orden de guards en Nest respeta el
 * orden de declaración en @UseGuards). Si el endpoint no tiene @Roles(),
 * deja pasar a cualquier usuario autenticado — la restricción por rol es
 * opt-in por endpoint, la autenticación es obligatoria por defecto.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;

    return !!user && requiredRoles.includes(user.roleName);
  }
}
