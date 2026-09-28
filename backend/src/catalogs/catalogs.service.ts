import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateCatalogEntryDto } from "./dto/create-catalog-entry.dto";

/**
 * Marcas y tipos de equipo ya se cargaron en el seed de la Fase 1
 * (normalizados de las variantes detectadas en el Excel), pero el taller
 * sigue recibiendo equipos de marcas o tipos que no estaban en esa lista
 * original — de ahí el CRUD (módulo de Configuración): crear, renombrar,
 * desactivar/reactivar. Nunca se borran físicamente (mismo criterio que
 * Customer/Supplier/Product): un equipo ya ingresado sigue necesitando su
 * Brand/DeviceType para mostrarse, aunque ya no se use para ingresos
 * nuevos.
 */
@Injectable()
export class CatalogsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

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

  // --- Marcas (CRUD) ------------------------------------------------------

  findAllBrandsIncludingInactive() {
    return this.prisma.brand.findMany({ orderBy: { name: "asc" } });
  }

  async createBrand(dto: CreateCatalogEntryDto, actingUserId: number) {
    const existing = await this.prisma.brand.findUnique({ where: { name: dto.name } });
    if (existing) {
      throw new ConflictException("Ya existe una marca con ese nombre");
    }

    const brand = await this.prisma.brand.create({ data: { name: dto.name } });
    await this.audit.log({
      userId: actingUserId,
      action: "CREATE",
      entityType: "Brand",
      entityId: brand.id,
      newValue: { name: brand.name },
    });
    return brand;
  }

  async renameBrand(id: number, dto: CreateCatalogEntryDto, actingUserId: number) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) {
      throw new NotFoundException("Marca no encontrada");
    }
    if (dto.name !== brand.name) {
      const existing = await this.prisma.brand.findUnique({ where: { name: dto.name } });
      if (existing) {
        throw new ConflictException("Ya existe una marca con ese nombre");
      }
    }

    const updated = await this.prisma.brand.update({ where: { id }, data: { name: dto.name } });
    await this.audit.log({
      userId: actingUserId,
      action: "UPDATE",
      entityType: "Brand",
      entityId: id,
      previousValue: { name: brand.name },
      newValue: { name: dto.name },
    });
    return updated;
  }

  async setBrandStatus(id: number, status: "ACTIVE" | "INACTIVE", actingUserId: number) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) {
      throw new NotFoundException("Marca no encontrada");
    }

    const updated = await this.prisma.brand.update({ where: { id }, data: { status } });
    await this.audit.log({
      userId: actingUserId,
      action: status === "ACTIVE" ? "REACTIVATE" : "DEACTIVATE",
      entityType: "Brand",
      entityId: id,
    });
    return updated;
  }

  // --- Tipos de equipo (CRUD) ---------------------------------------------

  findAllDeviceTypesIncludingInactive() {
    return this.prisma.deviceType.findMany({ orderBy: { name: "asc" } });
  }

  async createDeviceType(dto: CreateCatalogEntryDto, actingUserId: number) {
    const existing = await this.prisma.deviceType.findUnique({ where: { name: dto.name } });
    if (existing) {
      throw new ConflictException("Ya existe un tipo de equipo con ese nombre");
    }

    const deviceType = await this.prisma.deviceType.create({ data: { name: dto.name } });
    await this.audit.log({
      userId: actingUserId,
      action: "CREATE",
      entityType: "DeviceType",
      entityId: deviceType.id,
      newValue: { name: deviceType.name },
    });
    return deviceType;
  }

  async renameDeviceType(id: number, dto: CreateCatalogEntryDto, actingUserId: number) {
    const deviceType = await this.prisma.deviceType.findUnique({ where: { id } });
    if (!deviceType) {
      throw new NotFoundException("Tipo de equipo no encontrado");
    }
    if (dto.name !== deviceType.name) {
      const existing = await this.prisma.deviceType.findUnique({ where: { name: dto.name } });
      if (existing) {
        throw new ConflictException("Ya existe un tipo de equipo con ese nombre");
      }
    }

    const updated = await this.prisma.deviceType.update({ where: { id }, data: { name: dto.name } });
    await this.audit.log({
      userId: actingUserId,
      action: "UPDATE",
      entityType: "DeviceType",
      entityId: id,
      previousValue: { name: deviceType.name },
      newValue: { name: dto.name },
    });
    return updated;
  }

  async setDeviceTypeStatus(id: number, status: "ACTIVE" | "INACTIVE", actingUserId: number) {
    const deviceType = await this.prisma.deviceType.findUnique({ where: { id } });
    if (!deviceType) {
      throw new NotFoundException("Tipo de equipo no encontrado");
    }

    const updated = await this.prisma.deviceType.update({ where: { id }, data: { status } });
    await this.audit.log({
      userId: actingUserId,
      action: status === "ACTIVE" ? "REACTIVATE" : "DEACTIVATE",
      entityType: "DeviceType",
      entityId: id,
    });
    return updated;
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
