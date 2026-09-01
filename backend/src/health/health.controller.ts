import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Public } from "../common/decorators/public.decorator";

@Controller("health")
export class HealthController {
  constructor(private prisma: PrismaService) {}

  /**
   * Público (sin token) a propósito: el healthcheck de Docker Compose y
   * cualquier monitor externo (ej. UptimeRobot) necesitan poder golpear
   * este endpoint sin credenciales. No expone información sensible —
   * solo confirma que el proceso responde y que la base de datos está
   * alcanzable.
   */
  @Public()
  @Get()
  async check() {
    let database: "ok" | "error" = "ok";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = "error";
    }

    return {
      status: database === "ok" ? "ok" : "degraded",
      database,
      timestamp: new Date().toISOString(),
    };
  }
}
