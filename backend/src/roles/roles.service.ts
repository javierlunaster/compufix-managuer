import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Por ahora solo lectura: los 6 roles del brief (sección 21) ya se cargan
 * en el seed de la Fase 1. La administración completa de roles/permisos
 * personalizados (crear roles nuevos, asignar permisos finos) se deja para
 * el módulo de Configuración (Fase 12+), cuando ya exista un catálogo real
 * de permisos por módulo para asignar.
 */
@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.role.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
    });
  }

  async findOne(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } } },
    });
    if (!role) {
      throw new NotFoundException("Rol no encontrado");
    }
    return role;
  }
}
