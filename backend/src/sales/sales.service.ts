import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InventoryMovementType, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { InventoryMovementsService } from "../inventory/inventory-movements.service";
import { CashService } from "../cash/cash.service";
import { CreateSaleDto } from "./dto/create-sale.dto";

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private movements: InventoryMovementsService,
    private cash: CashService,
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

    // Si no se indica cuánto paga ahora, se asume el total — el caso
    // normal de venta de mostrador pagada de contado. Si paga menos,
    // queda saldo pendiente a cargo de un cliente real (no se puede
    // fiar una venta anónima: no habría a quién cobrarle después).
    const paidAmount = dto.amountPaid ?? total;
    if (paidAmount > total) {
      throw new BadRequestException(
        "El pago inicial no puede ser mayor al total de la venta",
      );
    }
    if (paidAmount < total && !dto.customerId) {
      throw new BadRequestException(
        "Una venta con saldo pendiente requiere un cliente registrado, para poder cobrarle el resto después",
      );
    }

    const sale = await this.prisma.$transaction(async (tx) => {
      const created = await tx.sale.create({
        data: {
          customerId: dto.customerId,
          sellerId: actingUserId,
          invoiceNumber: dto.invoiceNumber,
          subtotal,
          discount: dto.discount ?? 0,
          total,
          paidAmount,
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

      // El ingreso de caja es por lo que de verdad entra ahora
      // (paidAmount), no por el total facturado — si la venta queda con
      // saldo pendiente, ese resto entra después como un Payment normal
      // (ver PaymentsService.create, rama saleId) y cuenta en Caja en su
      // propio momento, no aquí. Mismo mecanismo que ya usan los abonos
      // (ver CashService.recordIncomeIfRegisterOpen), solo que con saleId
      // en vez de paymentId para este ingreso inicial.
      if (paidAmount > 0) {
        await this.cash.recordIncomeIfRegisterOpen(tx, {
          category: "Ventas",
          amount: paidAmount,
          saleId: created.id,
          userId: actingUserId,
          description: `Venta${dto.customerId ? "" : " de mostrador"} #${created.id}`,
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

  /**
   * Ventas activas con saldo pendiente (sección pedida: "seguimiento a
   * las ventas con saldo pendiente por pagar") — no se puede comparar
   * paidAmount vs total directo en el where de Prisma (son dos columnas
   * de la misma fila), así que se trae todo lo activo y se filtra acá.
   * El volumen esperado para un taller es bajo, mismo criterio pragmático
   * que el resto del sistema (ver los `take` fijos en otros findAll).
   */
  async findPending() {
    const sales = await this.prisma.sale.findMany({
      where: { status: "ACTIVE" },
      include: {
        customer: { select: { id: true, fullName: true, phone: true } },
        seller: { select: { id: true, fullName: true } },
      },
      orderBy: { date: "asc" },
    });

    return sales
      .map((s) => ({ ...s, balance: new Prisma.Decimal(s.total).minus(s.paidAmount) }))
      .filter((s) => s.balance.greaterThan(0));
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
      include: { items: true, payments: { select: { id: true } } },
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

      // Reversa el ingreso inicial (tagueado con saleId) y el de cada
      // abono posterior que se le haya registrado a esta venta (tagueados
      // con paymentId) — una venta con saldo pendiente puede tener varios
      // ingresos de caja repartidos en días distintos, no solo el de la
      // creación.
      await this.cash.reverseSaleIncomeIfStillOpen(tx, {
        saleId: id,
        paymentIds: sale.payments.map((p) => p.id),
        userId: actingUserId,
        description: `Reversión de venta #${id} cancelada`,
      });

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
