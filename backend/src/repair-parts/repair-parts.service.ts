import { Injectable, NotFoundException } from "@nestjs/common";
import { InventoryMovementType, Product } from "@prisma/client";
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
   * margen). En esta fase, "mano de obra" como costo del taller todavía no
   * se registra por separado (no hay tarifas horarias en el modelo), así
   * que la ganancia se calcula sobre el costo de repuestos solamente —
   * queda como una simplificación explícita del MVP, documentada aquí y en
   * el README, hasta que un módulo de servicios/facturación permita
   * desglosar mano de obra como un costo propio.
   */
  async costSummary(orderId: number) {
    const order = await this.ensureOrderExists(orderId);
    const parts = await this.findAllForOrder(orderId);

    const partsCost = parts.reduce(
      (sum, p) => sum + Number(p.unitCost) * p.quantity,
      0,
    );
    const partsRevenue = parts.reduce(
      (sum, p) => sum + Number(p.unitPrice) * p.quantity,
      0,
    );
    const totalCharged = Number(order.totalValue);
    const profit = totalCharged - partsCost;
    const marginPct = totalCharged > 0 ? (profit / totalCharged) * 100 : 0;

    return {
      partsCost,
      partsRevenue,
      totalCharged,
      profit,
      marginPct: Math.round(marginPct * 100) / 100,
    };
  }
}
