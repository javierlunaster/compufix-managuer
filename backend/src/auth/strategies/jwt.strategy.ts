import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthenticatedUser } from "../decorators/current-user.decorator";

interface JwtPayload {
  sub: number; // id del usuario
  type?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
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

  /**
   * Se ejecuta en cada request autenticada. Vuelve a consultar el usuario
   * (en vez de confiar ciegamente en lo que dice el token) para que un
   * usuario desactivado pierda acceso de inmediato, sin esperar a que
   * expire el token.
   *
   * El chequeo de `payload.type === "customer"` es defensa en profundidad:
   * los tokens del portal de clientes (customer-portal/) se firman con el
   * mismo JWT_SECRET por simplicidad, pero tienen una forma distinta
   * (`{ sub, type: "customer" }`). Sin este chequeo, un token de cliente
   * técnicamente válido podría colarse en cualquier endpoint del personal
   * que no tenga un @Roles específico (ej. catálogos de solo lectura).
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (payload.type === "customer") {
      throw new UnauthorizedException("Token de portal de clientes no válido aquí");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true },
    });

    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedException("Usuario inválido o inactivo");
    }

    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      roleId: user.roleId,
      roleName: user.role.name,
    };
  }
}
