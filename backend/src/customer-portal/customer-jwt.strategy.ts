import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../prisma/prisma.service";

interface CustomerJwtPayload {
  sub: number; // id del cliente
  type: "customer";
}

export interface AuthenticatedCustomer {
  id: number;
  fullName: string;
}

/**
 * Estrategia separada de la del personal (JwtStrategy) — nombre distinto
 * ("customer-jwt" vs "jwt") a propósito, para que Passport nunca las
 * confunda entre sí sin importar qué guard se use. Comparte el mismo
 * JWT_SECRET por simplicidad (no hace falta una segunda variable de
 * entorno), pero exige que el payload tenga `type: "customer"` — un
 * token del personal, aunque esté firmado con el mismo secreto, no tiene
 * esa forma y esta estrategia lo rechaza.
 */
@Injectable()
export class CustomerJwtStrategy extends PassportStrategy(Strategy, "customer-jwt") {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>("JWT_SECRET") ?? "",
    });
  }

  async validate(payload: CustomerJwtPayload): Promise<AuthenticatedCustomer> {
    if (payload.type !== "customer") {
      throw new UnauthorizedException("Token no válido para el portal de clientes");
    }

    const customer = await this.prisma.customer.findUnique({
      where: { id: payload.sub },
    });

    // Se vuelve a consultar el cliente en cada request (igual que hace
    // JwtStrategy con el personal) para que desactivar un cliente le
    // corte el acceso al portal de inmediato, sin esperar a que expire
    // el token.
    if (!customer || customer.status !== "ACTIVE") {
      throw new UnauthorizedException("Cliente inválido o inactivo");
    }

    return { id: customer.id, fullName: customer.fullName };
  }
}
