import { Injectable, NotFoundException } from "@nestjs/common";
import { InventoryMovementType, PaymentStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { InventoryMovementsService } from "../inventory/inventory-movements.service";
import { CreatePurchaseDto } from "./dto/create-purchase.dto";
import { UpdatePurchasePaymentStatusDto } from "./dto/update-purchase-payment-status.dto";

@Injectable()
export class PurchasesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private movements: InventoryMovementsService,
  ) {}

  /**
   * Registra una compra y actualiza el inventario en la misma operación
   * (sección 13 del brief: "la compra debe actualizar automáticamente el
   * inventario"). Cada ítem genera un InventoryMovement tipo PURCHASE que
   * aumenta el stock, y además actualiza `Product.cost` al costo de esta
   * compra ("último costo" — es el método de costeo más simple; no se
   * implementa costo promedio ponderado en este MVP, ver nota en el
   * README). Todo dentro de una sola transacción.
   */
  async create(dto: CreatePurchaseDto, actingUserId: number) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: dto.supplierId },
    });
    if (!supplier) {
      throw new NotFoundException("El proveedor indicado no existe");
    }

    for (const item of dto.items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
      });
      if (!product) {
        throw new NotFoundException(`Producto ${item.productId} no encontrado`);
      }
    }

    const subtotal = dto.items.reduce((sum, i) => sum + i.unitCost * i.quantity, 0);
    const total = subtotal + (dto.tax ?? 0) + (dto.shipping ?? 0);

    const purchase = await this.prisma.$transaction(async (tx) => {
      const created = await tx.purchase.create({
        data: {
          supplierId: dto.supplierId,
          date: dto.date ? new Date(dto.date) : new Date(),
          invoiceNumber: dto.invoiceNumber,
          subtotal,
          tax: dto.tax ?? 0,
          shipping: dto.shipping ?? 0,
          total,
          paymentMethod: dto.paymentMethod,
          paymentStatus: dto.paymentStatus ?? "PENDING",
          notes: dto.notes,
        },
      });

      for (const item of dto.items) {
        await tx.purchaseItem.create({
          data: {
            purchaseId: created.id,
            productId: item.productId,
            quantity: item.quantity,
            unitCost: item.unitCost,
            subtotal: item.unitCost * item.quantity,
          },
        });

        await this.movements.applyMovement(tx, {
          productId: item.productId,
          type: InventoryMovementType.PURCHASE,
          quantity: item.quantity, // entra al inventario
          unitCost: item.unitCost,
          purchaseId: created.id,
          userId: actingUserId,
          notes: `Compra a ${supplier.name}`,
        });

        // Costeo por "último costo": el precio de esta compra se vuelve el
        // costo vigente del producto para valorizaciones futuras.
        await tx.product.update({
          where: { id: item.productId },
          data: { cost: item.unitCost },
        });
      }

      return created;
    });

    await this.audit.log({
      userId: actingUserId,
      action: "CREATE",
      entityType: "Purchase",
      entityId: purchase.id,
      newValue: { supplierId: dto.supplierId, total },
    });

    return this.findOne(purchase.id);
  }

  async findAll(params: { supplierId?: number; paymentStatus?: PaymentStatus }) {
    const where: Prisma.PurchaseWhereInput = { status: "ACTIVE" };
    if (params.supplierId) {
      where.supplierId = params.supplierId;
    }
    if (params.paymentStatus) {
      where.paymentStatus = params.paymentStatus;
    }

    return this.prisma.purchase.findMany({
      where,
      include: { supplier: { select: { id: true, name: true } } },
      orderBy: { date: "desc" },
      take: 100,
    });
  }

  async findOne(id: number) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          include: { product: { select: { id: true, sku: true, description: true } } },
        },
      },
    });
    if (!purchase) {
      throw new NotFoundException("Compra no encontrada");
    }
    return purchase;
  }

  async updatePaymentStatus(
    id: number,
    dto: UpdatePurchasePaymentStatusDto,
    actingUserId: number,
  ) {
    await this.findOne(id);

    const purchase = await this.prisma.purchase.update({
      where: { id },
      data: { paymentStatus: dto.paymentStatus },
    });

    await this.audit.log({
      userId: actingUserId,
      action: "UPDATE_PAYMENT_STATUS",
      entityType: "Purchase",
      entityId: id,
      newValue: { paymentStatus: dto.paymentStatus },
    });

    return purchase;
  }
}
