import { Injectable, NotFoundException } from "@nestjs/common";
import { CashMovementType, InventoryMovementType, Product } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { InventoryMovementsService } from "../inventory/inventory-movements.service";
import { CreateRepairPartDto } from "./dto/create-repair-part.dto";

// Mismo criterio que InventoryMovementsService: un tipo mínimo que acepta
// tanto `this.prisma` como el `tx` de una transacción en curso, para poder
// componer esta operación dentro de una transacción más grande (ver
// QuotationsService.convert(), que consume repuestos de la cotización
// dentro de la misma transacción que crea la orden/actualiza sus totales).
// Debe incluir tanto lo que usa directamente este servicio (repairPart)
// como lo que reenvía a InventoryMovementsService.applyMovement()
// (product, inventoryMovement) — si solo incluyera "repairPart", TypeScript
// rechazaría el `tx` al pasarlo a applyMovement().
type PrismaTxClient = Pick<PrismaService, "repairPart" | "product" | "inventoryMovement">;

@Injectable()
export class RepairPartsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private movements: InventoryMovementsService,
  ) {}

  private async ensureOrderExists(orderId: number) {
    const order = await this.prisma.repairOrder.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException("Orden de reparación no encontrada");
    }
    return order;
  }

  /**
   * Núcleo de "consumir un repuesto", sin abrir su propia transacción —
   * para poder invocarse tanto desde `create()` (transacción propia) como
   * desde otro servicio que ya está dentro de una transacción (ver
   * QuotationsService.convert()).
   */
  async createWithTx(
    tx: PrismaTxClient,
    orderId: number,
    product: Product,
    quantity: number,
    unitPrice: number,
    actingUserId: number,
  ) {
    await this.movements.applyMovement(tx, {
      productId: product.id,
      type: InventoryMovementType.USED_IN_REPAIR,
      quantity: -quantity, // sale del inventario
      unitCost: Number(product.cost),
      repairOrderId: orderId,
      userId: actingUserId,
      notes: "Usado en orden de reparación",
    });

    return tx.repairPart.create({
      data: {
        repairOrderId: orderId,
        productId: product.id,
        quantity,
        unitCost: product.cost,
        unitPrice,
      },
      include: { product: { select: { id: true, sku: true, description: true } } },
    });
  }

  /**
   * Consume un repuesto del inventario para una reparación (sección 12 del
   * brief). Todo ocurre en una sola transacción: se descuenta el stock vía
   * InventoryMovement (nunca se toca Product.stock directo) y se registra
   * el RepairPart con el costo ($ que le costó al taller, tomado de
   * Product.cost en ese momento) y el precio cobrado al cliente — así el
   * costo histórico de la reparación no cambia si el costo del producto
   * sube o baja después.
   */
  async create(orderId: number, dto: CreateRepairPartDto, actingUserId: number) {
    await this.ensureOrderExists(orderId);

    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) {
      throw new NotFoundException("Producto no encontrado");
    }

    const unitPrice = dto.unitPrice ?? Number(product.salePrice);

    const repairPart = await this.prisma.$transaction((tx) =>
      this.createWithTx(tx, orderId, product, dto.quantity, unitPrice, actingUserId),
    );

    await this.audit.log({
      userId: actingUserId,
      action: "CREATE",
      entityType: "RepairPart",
      entityId: repairPart.id,
      newValue: { repairOrderId: orderId, productId: dto.productId, quantity: dto.quantity },
    });

    return repairPart;
  }

  findAllForOrder(orderId: number) {
    return this.prisma.repairPart.findMany({
      where: { repairOrderId: orderId },
      include: { product: { select: { id: true, sku: true, description: true } } },
    });
  }

  /**
   * Quita un repuesto que se agregó por error: revierte el movimiento de
   * inventario (el stock vuelve, vía un InventoryMovement positivo — nunca
   * editando Product.stock a mano) y borra el registro de consumo. A
   * diferencia de la mayoría del sistema, RepairPart no tiene un campo de
   * estado para "desactivar": es un hecho transaccional (como una medición
   * de diagnóstico), así que se borra físicamente, con la reversión de
   * inventario y el borrado auditados.
   */
  async remove(orderId: number, partId: number, actingUserId: number) {
    const part = await this.prisma.repairPart.findUnique({ where: { id: partId } });
    if (!part || part.repairOrderId !== orderId) {
      throw new NotFoundException("Repuesto no encontrado en esta orden");
    }

    await this.prisma.$transaction(async (tx) => {
      await this.movements.applyMovement(tx, {
        productId: part.productId,
        type: InventoryMovementType.USED_IN_REPAIR,
        quantity: part.quantity, // devuelve al inventario
        repairOrderId: orderId,
        userId: actingUserId,
        notes: "Reversión: repuesto retirado de la orden",
      });

      await tx.repairPart.delete({ where: { id: partId } });
    });

    await this.audit.log({
      userId: actingUserId,
      action: "DELETE",
      entityType: "RepairPart",
      entityId: partId,
      previousValue: part,
    });

    return { message: "Repuesto retirado de la orden y stock restituido" };
  }

  /**
   * Resumen de costo/ganancia de la orden (sección 12 del brief: costo de
   * repuestos + mano de obra = costo total; precio cobrado; ganancia;
   * margen). Incluye el costo de repuestos, los servicios aplicados a la
   * orden (RepairService.cost — ver RepairServicesService, snapshot de
   * Service.estimatedCost al momento de aplicarlo) y los egresos de Caja
   * que se asignaron manualmente a esta orden (ver CashService.createMovement,
   * campo repairOrderId) — el caso típico de esto último es un servicio
   * externo subcontratado (una reparación mandada a hacer afuera) pagado
   * de caja, que es un costo real de la orden aunque no pase por
   * RepairPart ni RepairService.
   */
  async costSummary(orderId: number) {
    const order = await this.ensureOrderExists(orderId);
    const parts = await this.findAllForOrder(orderId);
    // Consulta directa a Prisma (no a RepairServicesService) para no sumar
    // una dependencia de módulo nueva — mismo criterio ya usado aquí mismo
    // con cashMovement, unas líneas abajo.
    const services = await this.prisma.repairService.findMany({
      where: { repairOrderId: orderId },
    });
    const externalExpenseMovements = await this.prisma.cashMovement.findMany({
      where: { repairOrderId: orderId, type: CashMovementType.EXPENSE },
    });

    const partsCost = parts.reduce(
      (sum, p) => sum + Number(p.unitCost) * p.quantity,
      0,
    );
    const partsRevenue = parts.reduce(
      (sum, p) => sum + Number(p.unitPrice) * p.quantity,
      0,
    );
    const servicesCost = services.reduce((sum, s) => sum + Number(s.cost), 0);
    const servicesRevenue = services.reduce((sum, s) => sum + Number(s.price), 0);
    const externalExpenses = externalExpenseMovements.reduce(
      (sum, m) => sum + Number(m.amount),
      0,
    );
    const totalCharged = Number(order.totalValue);
    const profit = totalCharged - partsCost - servicesCost - externalExpenses;
    const marginPct = totalCharged > 0 ? (profit / totalCharged) * 100 : 0;

    return {
      partsCost,
      partsRevenue,
      servicesCost,
      servicesRevenue,
      externalExpenses,
      externalExpenseMovements: externalExpenseMovements.map((m) => ({
        id: m.id,
        category: m.category,
        amount: Number(m.amount),
        description: m.description,
        date: m.date,
      })),
      totalCharged,
      profit,
      marginPct: Math.round(marginPct * 100) / 100,
    };
  }
}
