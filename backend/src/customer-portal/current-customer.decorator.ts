import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AuthenticatedCustomer } from "./customer-jwt.strategy";

/** Uso: método(@CurrentCustomer() customer: AuthenticatedCustomer) */
export const CurrentCustomer = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedCustomer => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
