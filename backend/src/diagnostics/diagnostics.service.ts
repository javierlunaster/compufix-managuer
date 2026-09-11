import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateDiagnosticDto } from "./dto/create-diagnostic.dto";
import { UpdateDiagnosticDto } from "./dto/update-diagnostic.dto";
import { CreateMeasurementDto } from "./dto/create-measurement.dto";
import { UpdateMeasurementDto } from "./dto/update-measurement.dto";
import { BulkCreateMeasurementsDto } from "./dto/bulk-create-measurements.dto";

@Injectable()
export class DiagnosticsService {
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
   * Una orden puede tener MÚLTIPLES diagnósticos (Regla 3 del brief): por
   * ejemplo, un primer diagnóstico que concluye "posible falla de fuente" y,
   * tras reemplazar el componente, un segundo diagnóstico de verificación.
   * No hay límite ni se reemplaza el anterior.
   */
  async create(orderId: number, dto: CreateDiagnosticDto, actingUserId: number) {
    await this.ensureOrderExists(orderId);

    const diagnostic = await this.prisma.repairDiagnostic.create({
      data: {
        repairOrderId: orderId,
        technicianId: dto.technicianId ?? actingUserId,
        boardReference: dto.boardReference,
        chargerIc: dto.chargerIc,
        initialSymptom: dto.initialSymptom,
        componentSuspected: dto.componentSuspected,
        componentReplaced: dto.componentReplaced,
        biosReprogrammed: dto.biosReprogrammed ?? false,
        ecReviewed: dto.ecReviewed ?? false,
        ecReprogrammed: dto.ecReprogrammed ?? false,
        proceduresPerformed: dto.proceduresPerformed,
        result: dto.result,
      },
    });

    await this.audit.log({
      userId: actingUserId,
      action: "CREATE",
      entityType: "RepairDiagnostic",
      entityId: diagnostic.id,
      newValue: { repairOrderId: orderId },
    });

    return diagnostic;
  }

  findAllForOrder(orderId: number) {
    return this.prisma.repairDiagnostic.findMany({
      where: { repairOrderId: orderId },
      include: {
        measurements: true,
        technician: { select: { id: true, fullName: true } },
        photos: { orderBy: { uploadedAt: "asc" } },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async findOne(id: number) {
    const diagnostic = await this.prisma.repairDiagnostic.findUnique({
      where: { id },
      include: {
        measurements: true,
        technician: { select: { id: true, fullName: true } },
        photos: { orderBy: { uploadedAt: "asc" } },
      },
    });
    if (!diagnostic) {
      throw new NotFoundException("Diagnóstico no encontrado");
    }
    return diagnostic;
  }

  async update(id: number, dto: UpdateDiagnosticDto, actingUserId: number) {
    await this.findOne(id);

    const diagnostic = await this.prisma.repairDiagnostic.update({
      where: { id },
      data: dto,
    });

    await this.audit.log({
      userId: actingUserId,
      action: "UPDATE",
      entityType: "RepairDiagnostic",
      entityId: id,
      newValue: dto,
    });

    return diagnostic;
  }

  // --- Mediciones (tabla libre de puntos, sección 8 del brief) -----------

  async addMeasurement(diagnosticId: number, dto: CreateMeasurementDto, actingUserId: number) {
    await this.findOne(diagnosticId);

    const measurement = await this.prisma.diagnosticMeasurement.create({
      data: { diagnosticId, ...dto },
    });

    await this.audit.log({
      userId: actingUserId,
      action: "CREATE",
      entityType: "DiagnosticMeasurement",
      entityId: measurement.id,
      newValue: dto,
    });

    return measurement;
  }

  /**
   * Carga varias mediciones de una vez — útil cuando el técnico ya tiene
   * la tabla completa de puntos de una placa conocida y quiere registrarla
   * de un solo golpe en vez de fila por fila.
   */
  async bulkAddMeasurements(
    diagnosticId: number,
    dto: BulkCreateMeasurementsDto,
    actingUserId: number,
  ) {
    await this.findOne(diagnosticId);

    const created = await this.prisma.$transaction(
      dto.measurements.map((m) =>
        this.prisma.diagnosticMeasurement.create({
          data: { diagnosticId, ...m },
        }),
      ),
    );

    await this.audit.log({
      userId: actingUserId,
      action: "BULK_CREATE",
      entityType: "DiagnosticMeasurement",
      entityId: diagnosticId,
      newValue: { count: created.length },
    });

    return created;
  }

  async updateMeasurement(
    measurementId: number,
    dto: UpdateMeasurementDto,
    actingUserId: number,
  ) {
    const existing = await this.prisma.diagnosticMeasurement.findUnique({
      where: { id: measurementId },
    });
    if (!existing) {
      throw new NotFoundException("Medición no encontrada");
    }

    const measurement = await this.prisma.diagnosticMeasurement.update({
      where: { id: measurementId },
      data: dto,
    });

    await this.audit.log({
      userId: actingUserId,
      action: "UPDATE",
      entityType: "DiagnosticMeasurement",
      entityId: measurementId,
      previousValue: { measuredValue: existing.measuredValue, status: existing.status },
      newValue: dto,
    });

    return measurement;
  }

  /**
   * Las mediciones sí se pueden borrar físicamente (a diferencia del resto
   * del sistema, Regla 1): son datos técnicos puntuales sin impacto
   * financiero ni legal, y el caso de uso real es corregir una fila
   * capturada por error durante la revisión. El borrado queda auditado.
   */
  async deleteMeasurement(measurementId: number, actingUserId: number) {
    const existing = await this.prisma.diagnosticMeasurement.findUnique({
      where: { id: measurementId },
    });
    if (!existing) {
      throw new NotFoundException("Medición no encontrada");
    }

    await this.prisma.diagnosticMeasurement.delete({ where: { id: measurementId } });

    await this.audit.log({
      userId: actingUserId,
      action: "DELETE",
      entityType: "DiagnosticMeasurement",
      entityId: measurementId,
      previousValue: existing,
    });

    return { message: "Medición eliminada" };
  }
}
