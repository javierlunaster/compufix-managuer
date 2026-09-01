import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateLogDto } from "./dto/create-log.dto";
import { UpdateLogDto } from "./dto/update-log.dto";

@Injectable()
export class RepairLogsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private async ensureOrderExists(orderId: number) {
    const order = await this.prisma.repairOrder.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException("Orden de reparación no encontrada");
    }
    return order;
  }

  /**
   * Una orden puede tener múltiples entradas de bitácora (Regla 3 del
   * brief). Cada entrada es un renglón cronológico: qué se hizo, qué se
   * midió, en qué componente, con qué resultado — el ejemplo de la sección
   * 9 del brief (medición de señales → sin PLTRST ni PCH_PWROK →
   * reprogramación BIOS → sin cambio) es literalmente una secuencia de
   * entradas como estas.
   */
  async create(orderId: number, dto: CreateLogDto, actingUserId: number) {
    await this.ensureOrderExists(orderId);

    const log = await this.prisma.repairLog.create({
      data: {
        repairOrderId: orderId,
        technicianId: dto.technicianId ?? actingUserId,
        date: dto.date ? new Date(dto.date) : undefined,
        procedure: dto.procedure,
        measurement: dto.measurement,
        component: dto.component,
        reference: dto.reference,
        result: dto.result,
        notes: dto.notes,
      },
    });

    await this.audit.log({
      userId: actingUserId,
      action: "CREATE",
      entityType: "RepairLog",
      entityId: log.id,
      newValue: { repairOrderId: orderId },
    });

    return log;
  }

  findAllForOrder(orderId: number) {
    return this.prisma.repairLog.findMany({
      where: { repairOrderId: orderId },
      include: {
        technician: { select: { id: true, fullName: true } },
        photos: { orderBy: { uploadedAt: "asc" } },
      },
      orderBy: { date: "asc" }, // cronológico, tal como pide la sección 9
    });
  }

  async findOne(id: number) {
    const log = await this.prisma.repairLog.findUnique({
      where: { id },
      include: { technician: { select: { id: true, fullName: true } } },
    });
    if (!log) {
      throw new NotFoundException("Entrada de bitácora no encontrada");
    }
    return log;
  }

  /**
   * No existe endpoint de borrado a propósito: la bitácora es información
   * histórica importante (Regla 1). Si una entrada se capturó mal, se
   * corrige por edición (queda auditado el cambio), nunca desaparece.
   */
  async update(id: number, dto: UpdateLogDto, actingUserId: number) {
    const before = await this.findOne(id);

    const log = await this.prisma.repairLog.update({
      where: { id },
      data: {
        ...dto,
        date: dto.date ? new Date(dto.date) : undefined,
      },
    });

    await this.audit.log({
      userId: actingUserId,
      action: "UPDATE",
      entityType: "RepairLog",
      entityId: id,
      previousValue: { result: before.result, notes: before.notes },
      newValue: dto,
    });

    return log;
  }
}
