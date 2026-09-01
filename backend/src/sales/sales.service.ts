import { Injectable, NotFoundException } from "@nestjs/common";
import { InventoryMovementType, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { InventoryMovementsService } from "../inventory/inventory-movements.service";
import { CreateSaleDto } from "./dto/create-sale.dto";

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private movements: InventoryMovementsService,
  ) {}

  /**
   * Venta rápida tipo POS (sección 15 del brief): cliente (opcional) →
   * productos → cantidad → precio → descuento → pago → salida de
   * inventario, todo en un solo paso. Cada ítem descuenta stock vía
   * InventoryMovement tipo SALE — si no hay suficiente stock de algún
   * producto, toda la venta se cancela (transacción), no se vende "a
   * medias".
   */
  async create(dto: CreateSaleDto, actingUserId: number) {
    if (dto.customerId) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: dto.customerId },
      });
      if (!customer) {
        throw new NotFoundException("El cliente indicado no existe");
      }
    }

    const resolvedItems: {
      productId: number;
      quantity: number;
      unitPrice: number;
      discount: number;
    }[] = [];

    for (const item of dto.items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
      });
      if (!product) {
        throw new NotFoundException(`Producto ${item.productId} no encontrado`);
      }
      resolvedItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice ?? Number(product.salePrice),
        discount: item.discount ?? 0,
      });
    }

    const subtotal = resolvedItems.reduce(
      (sum, i) => sum + (i.unitPrice - i.discount) * i.quantity,
      0,
    );
    const total = subtotal - (dto.discount ?? 0);

    const sale = await this.prisma.$transaction(async (tx) => {
      const created = await tx.sale.create({
        data: {
          customerId: dto.customerId,
          sellerId: actingUserId,
          invoiceNumber: dto.invoiceNumber,
          subtotal,
          discount: dto.discount ?? 0,
          total,
          paymentMethod: dto.paymentMethod,
        },
      });

      for (const item of resolvedItems) {
        await tx.saleItem.create({
          data: {
            saleId: created.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            subtotal: (item.unitPrice - item.discount) * item.quantity,
          },
        });

        await this.movements.applyMovement(tx, {
          productId: item.productId,
          type: InventoryMovementType.SALE,
          quantity: -item.quantity, // sale del inventario
          saleId: created.id,
          userId: actingUserId,
          notes: "Venta de mostrador",
        });
      }

      return created;
    });

    await this.audit.log({
      userId: actingUserId,
      action: "CREATE",
      entityType: "Sale",
      entityId: sale.id,
      newValue: { total, customerId: dto.customerId },
    });

    return this.findOne(sale.id);
  }

  async findAll(params: { customerId?: number; search?: string }) {
    const where: Prisma.SaleWhereInput = { status: "ACTIVE" };
    if (params.customerId) {
      where.customerId = params.customerId;
    }
    if (params.search) {
      where.invoiceNumber = { contains: params.search, mode: "insensitive" };
    }

    return this.prisma.sale.findMany({
      where,
      include: {
        customer: { select: { id: true, fullName: true } },
        seller: { select: { id: true, fullName: true } },
      },
      orderBy: { date: "desc" },
      take: 100,
    });
  }

  async findOne(id: number) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, fullName: true } },
        seller: { select: { id: true, fullName: true } },
        items: {
          include: { product: { select: { id: true, sku: true, description: true } } },
        },
      },
    });
    if (!sale) {
      throw new NotFoundException("Venta no encontrada");
    }
    return sale;
  }

  /**
   * Cancela una venta: restituye el stock de cada ítem (vía un movimiento
   * compensatorio, nunca editando `stock` a mano) y marca la venta como
   * INACTIVE — nunca se borra (Regla 1), es un documento financiero.
   */
  async cancel(id: number, actingUserId: number) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!sale) {
      throw new NotFoundException("Venta no encontrada");
    }
    if (sale.status === "INACTIVE") {
      throw new NotFoundException("Esta venta ya está cancelada");
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of sale.items) {
        await this.movements.applyMovement(tx, {
          productId: item.productId,
          type: InventoryMovementType.SALE,
          quantity: item.quantity, // devuelve al inventario
          saleId: id,
          userId: actingUserId,
          notes: "Reversión: venta cancelada",
        });
      }

      await tx.sale.update({ where: { id }, data: { status: "INACTIVE" } });
    });

    await this.audit.log({
      userId: actingUserId,
      action: "CANCEL",
      entityType: "Sale",
      entityId: id,
    });

    return { message: "Venta cancelada y stock restituido" };
  }
}
