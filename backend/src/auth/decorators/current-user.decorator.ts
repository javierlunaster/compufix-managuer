import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface AuthenticatedUser {
  id: number;
  username: string;
  fullName: string;
  roleId: number;
  roleName: string;
}

/**
 * Uso: método(@CurrentUser() user: AuthenticatedUser)
 * Lee el usuario que JwtStrategy.validate() adjuntó a la request.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
