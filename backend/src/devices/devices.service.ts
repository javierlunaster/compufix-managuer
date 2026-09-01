import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateDeviceDto } from "./dto/create-device.dto";
import { UpdateDeviceDto } from "./dto/update-device.dto";

@Injectable()
export class DevicesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(dto: CreateDeviceDto, actingUserId: number) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new NotFoundException("El cliente indicado no existe");
    }

    const device = await this.prisma.device.create({
      data: dto,
      include: { deviceType: true, brand: true },
    });

    await this.audit.log({
      userId: actingUserId,
      action: "CREATE",
      entityType: "Device",
      entityId: device.id,
      newValue: { customerId: device.customerId, serialNumber: device.serialNumber },
    });

    return device;
  }

  findByCustomer(customerId: number) {
    return this.prisma.device.findMany({
      where: { customerId, status: "ACTIVE" },
      include: { deviceType: true, brand: true },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Busca por número de serie sin importar el cliente — útil en recepción
   * para detectar si un equipo ya pasó antes por el taller (a veces bajo
   * otro cliente: reventa, préstamo, error de captura del nombre).
   */
  async findBySerial(serialNumber: string) {
    return this.prisma.device.findMany({
      where: { serialNumber, status: "ACTIVE" },
      include: { customer: { select: { id: true, fullName: true, phone: true } } },
    });
  }

  async findOne(id: number) {
    const device = await this.prisma.device.findUnique({
      where: { id },
      include: {
        deviceType: true,
        brand: true,
        customer: { select: { id: true, fullName: true, phone: true } },
        // El historial de reparaciones de este equipo (Regla 6) se llena a
        // partir de la Fase 4, cuando exista el módulo de recepción; la
        // relación ya está lista para traerlo apenas haya datos.
        repairOrders: {
          select: { id: true, orderCode: true, status: true, entryDate: true },
          orderBy: { entryDate: "desc" },
        },
      },
    });
    if (!device) {
      throw new NotFoundException("Equipo no encontrado");
    }
    return device;
  }

  async update(id: number, dto: UpdateDeviceDto, actingUserId: number) {
    await this.findOne(id);

    const device = await this.prisma.device.update({
      where: { id },
      data: dto,
      include: { deviceType: true, brand: true },
    });

    await this.audit.log({
      userId: actingUserId,
      action: "UPDATE",
      entityType: "Device",
      entityId: id,
      newValue: dto,
    });

    return device;
  }

  async deactivate(id: number, actingUserId: number) {
    await this.findOne(id);

    const device = await this.prisma.device.update({
      where: { id },
      data: { status: "INACTIVE" },
    });

    await this.audit.log({
      userId: actingUserId,
      action: "DEACTIVATE",
      entityType: "Device",
      entityId: id,
    });

    return device;
  }
}
