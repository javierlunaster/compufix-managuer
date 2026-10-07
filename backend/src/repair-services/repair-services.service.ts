import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateRepairServiceDto } from "./dto/create-repair-service.dto";

// Mismo criterio que RepairPartsService/InventoryMovementsService: un tipo
// mínimo que acepta tanto `this.prisma` como el `tx` de una transacción en
// curso, para que QuotationsService pueda crear estos registros dentro de
// la misma transacción que convierte una cotización aprobada.
type PrismaTxClient = Pick<PrismaService, "repairService" | "service">;

const SERVICE_SELECT = { service: { select: { id: true, code: true, name: true } } } as const;

@Injectable()
export class RepairServicesService {
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
   * Núcleo de "aplicar un servicio a una orden", sin abrir su propia
   * transacción — para poder invocarse tanto desde `create()` (transacción
   * propia) como desde QuotationsService.convert() (ya dentro de una
   * transacción, para los ítems tipo SERVICE/LABOR/OTHER de la cotización).
   */
  async createWithTx(
    tx: PrismaTxClient,
    orderId: number,
    params: { serviceId?: number; description?: string; price: number; cost?: number },
  ) {
    let description = params.description;
    let cost = params.cost;

    if (params.serviceId) {
      const service = await tx.service.findUniqueOrThrow({ where: { id: params.serviceId } });
      description ??= service.name;
      cost ??= service.estimatedCost ? Number(service.estimatedCost) : 0;
    }

    if (!description) {
      throw new BadRequestException(
        "Indica un servicio del catálogo o una descripción para el cargo",
      );
    }

    return tx.repairService.create({
      data: {
        repairOrderId: orderId,
        serviceId: params.serviceId,
        description,
        price: params.price,
        cost: cost ?? 0,
      },
      include: SERVICE_SELECT,
    });
  }

  /**
   * Aplica un servicio directo a la orden (catálogo o cargo ad-hoc de mano
   * de obra) — igual que RepairPartsService.create() con repuestos, no
   * requiere pasar primero por una cotización. Deliberadamente NO toca
   * `order.totalValue`: mismo criterio que los repuestos, el total
   * cobrado lo controla el personal aparte (edición directa o conversión
   * de cotización) — este registro es para costeo/trazabilidad, no para
   * facturar automáticamente.
   */
  async create(orderId: number, dto: CreateRepairServiceDto, actingUserId: number) {
    await this.ensureOrderExists(orderId);

    const repairService = await this.prisma.$transaction((tx) =>
      this.createWithTx(tx, orderId, dto),
    );

    await this.audit.log({
      userId: actingUserId,
      action: "CREATE",
      entityType: "RepairService",
      entityId: repairService.id,
      newValue: { repairOrderId: orderId, serviceId: dto.serviceId, price: dto.price },
    });

    return repairService;
  }

  findAllForOrder(orderId: number) {
    return this.prisma.repairService.findMany({
      where: { repairOrderId: orderId },
      include: SERVICE_SELECT,
      orderBy: { id: "asc" },
    });
  }

  /**
   * Quita un servicio de la orden. A diferencia de un repuesto, no hay
   * inventario que reversar — es un borrado físico simple, mismo criterio
   * que RepairPart (un hecho transaccional sin valor histórico que
   * preservar).
   *
   * `adjustTotal`: ver el docstring equivalente en
   * RepairPartsService.remove() — cubre "se cotizó este servicio, la
   * cotización se aprobó (sumando su precio a totalValue), pero al final
   * no se prestó", descontando su precio del total cobrado. Opt-in: la
   * mayoría de remociones son correcciones de captura donde totalValue
   * nunca se tocó al crear el registro (ver create()).
   */
  async remove(orderId: number, repairServiceId: number, actingUserId: number, adjustTotal = false) {
    const entry = await this.prisma.repairService.findUnique({ where: { id: repairServiceId } });
    if (!entry || entry.repairOrderId !== orderId) {
      throw new NotFoundException("Servicio no encontrado en esta orden");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.repairService.delete({ where: { id: repairServiceId } });

      if (adjustTotal) {
        await tx.repairOrder.update({
          where: { id: orderId },
          data: { totalValue: { decrement: entry.price } },
        });
      }
    });

    await this.audit.log({
      userId: actingUserId,
      action: "DELETE",
      entityType: "RepairService",
      entityId: repairServiceId,
      previousValue: entry,
      newValue: adjustTotal ? { totalValueDecrementedBy: entry.price } : undefined,
    });

    return {
      message: adjustTotal
        ? "Servicio retirado y total de la orden ajustado"
        : "Servicio retirado de la orden",
    };
  }
}
