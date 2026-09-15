import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateHardwareTestResultDto } from "./dto/create-hardware-test-result.dto";
import { UpdateHardwareTestResultDto } from "./dto/update-hardware-test-result.dto";

@Injectable()
export class HardwareTestsService {
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

  /** Para que el controller pueda validar acceso antes de tocar el recurso. */
  async getOrderId(resultId: number): Promise<number> {
    const result = await this.prisma.hardwareTestResult.findUnique({
      where: { id: resultId },
      select: { repairOrderId: true },
    });
    if (!result) {
      throw new NotFoundException("Resultado de prueba no encontrado");
    }
    return result.repairOrderId;
  }

  async create(orderId: number, dto: CreateHardwareTestResultDto, actingUserId: number) {
    await this.ensureOrderExists(orderId);

    const result = await this.prisma.hardwareTestResult.create({
      data: {
        repairOrderId: orderId,
        category: dto.category,
        testName: dto.testName,
        status: dto.status,
        notes: dto.notes,
        testedById: actingUserId,
      },
    });

    await this.audit.log({
      userId: actingUserId,
      action: "CREATE",
      entityType: "HardwareTestResult",
      entityId: result.id,
      newValue: dto,
    });

    return result;
  }

  async update(id: number, dto: UpdateHardwareTestResultDto, actingUserId: number) {
    const existing = await this.prisma.hardwareTestResult.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Resultado de prueba no encontrado");
    }

    const result = await this.prisma.hardwareTestResult.update({
      where: { id },
      data: { ...dto, testedById: actingUserId, testedAt: new Date() },
    });

    await this.audit.log({
      userId: actingUserId,
      action: "UPDATE",
      entityType: "HardwareTestResult",
      entityId: id,
      previousValue: { status: existing.status, notes: existing.notes },
      newValue: dto,
    });

    return result;
  }

  /**
   * Igual que las mediciones de diagnóstico: se puede borrar físicamente
   * (un checklist mal marcado por error no tiene valor histórico que
   * preservar). El borrado queda auditado.
   */
  async remove(id: number, actingUserId: number) {
    const existing = await this.prisma.hardwareTestResult.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Resultado de prueba no encontrado");
    }

    await this.prisma.hardwareTestResult.delete({ where: { id } });

    await this.audit.log({
      userId: actingUserId,
      action: "DELETE",
      entityType: "HardwareTestResult",
      entityId: id,
      previousValue: existing,
    });

    return { message: "Resultado de prueba eliminado" };
  }
}
