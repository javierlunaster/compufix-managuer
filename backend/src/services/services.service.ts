import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateServiceDto } from "./dto/create-service.dto";
import { UpdateServiceDto } from "./dto/update-service.dto";

@Injectable()
export class ServicesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(dto: CreateServiceDto, actingUserId: number) {
    if (dto.code) {
      const existing = await this.prisma.service.findUnique({ where: { code: dto.code } });
      if (existing) {
        throw new ConflictException("Ya existe un servicio con ese código");
      }
    }

    const service = await this.prisma.service.create({ data: dto });

    await this.audit.log({
      userId: actingUserId,
      action: "CREATE",
      entityType: "Service",
      entityId: service.id,
      newValue: { code: service.code, name: service.name },
    });

    return service;
  }

  findAll(search?: string) {
    return this.prisma.service.findMany({
      where: {
        status: "ACTIVE",
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                { code: { contains: search, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
    });
  }

  async findOne(id: number) {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service) {
      throw new NotFoundException("Servicio no encontrado");
    }
    return service;
  }

  async update(id: number, dto: UpdateServiceDto, actingUserId: number) {
    await this.findOne(id);

    const service = await this.prisma.service.update({ where: { id }, data: dto });

    await this.audit.log({
      userId: actingUserId,
      action: "UPDATE",
      entityType: "Service",
      entityId: id,
      newValue: dto,
    });

    return service;
  }

  async deactivate(id: number, actingUserId: number) {
    await this.findOne(id);

    const service = await this.prisma.service.update({
      where: { id },
      data: { status: "INACTIVE" },
    });

    await this.audit.log({
      userId: actingUserId,
      action: "DEACTIVATE",
      entityType: "Service",
      entityId: id,
    });

    return service;
  }

  async reactivate(id: number, actingUserId: number) {
    await this.findOne(id);

    const service = await this.prisma.service.update({
      where: { id },
      data: { status: "ACTIVE" },
    });

    await this.audit.log({
      userId: actingUserId,
      action: "REACTIVATE",
      entityType: "Service",
      entityId: id,
    });

    return service;
  }
}
