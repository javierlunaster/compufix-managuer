import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Solo lectura por ahora, igual que RolesService: estos catálogos ya se
 * cargaron en el seed de la Fase 1 (marcas y tipos de equipo normalizados
 * de las variantes detectadas en el Excel). Crear/editar catálogos nuevos
 * queda para el módulo de Configuración.
 */
@Injectable()
export class CatalogsService {
  constructor(private prisma: PrismaService) {}

  findAllBrands() {
    return this.prisma.brand.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
    });
  }

  findAllDeviceTypes() {
    return this.prisma.deviceType.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
    });
  }

  /**
   * Lista de técnicos para el selector de "asignar técnico" en una orden
   * de reparación (sección 6 del brief). Se agregó aquí, no en
   * `UsersController` (restringido a Administrador desde la Fase 2),
   * porque Recepción y los propios técnicos también necesitan poder
   * asignar una reparación sin tener permiso para administrar usuarios —
   * mismo criterio que brands/deviceTypes: solo los campos necesarios
   * para poblar un desplegable, nunca username/documento/rol completo.
   */
  findTechnicians() {
    return this.prisma.user.findMany({
      where: { status: "ACTIVE", role: { name: "Técnico" } },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    });
  }

  /**
   * Sugerencias de modelo para el formulario de equipo — no un catálogo
   * cerrado como marcas/tipos, sino texto libre ya usado antes (los
   * modelos se repiten mucho: "E14 GEN 3", "Ideapad 330", etc.). Filtrar
   * por marca cuando se conoce reduce el ruido — no tiene sentido
   * sugerir modelos de HP al escribir un equipo Lenovo.
   */
  async findDeviceModels(brandId?: number, deviceTypeId?: number) {
    const devices = await this.prisma.device.findMany({
      where: {
        model: { not: null },
        ...(brandId ? { brandId } : {}),
        ...(deviceTypeId ? { deviceTypeId } : {}),
      },
      select: { model: true },
      distinct: ["model"],
      orderBy: { model: "asc" },
      take: 50,
    });
    return devices.map((d) => d.model).filter((m): m is string => !!m && m.trim().length > 0);
  }
}
