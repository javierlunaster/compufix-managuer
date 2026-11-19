import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CashService } from "../cash/cash.service";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { CreateRefundDto } from "./dto/create-refund.dto";
import { UpdatePaymentDto } from "./dto/update-payment.dto";

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private cash: CashService,
  ) {}

  /**
   * Registra un abono (sección 18 del brief). Si está asociado a una orden
   * de reparación o a una venta, incrementa su `paidAmount` en la misma
   * transacción (el saldo pendiente sigue calculándose al vuelo como
   * total - paidAmount, nunca se almacena aparte). Si hay una caja
   * abierta, el abono también queda reflejado como ingreso de caja
   * automáticamente (ver CashService.recordIncomeIfRegisterOpen) — sin
   * bloquear el pago si no hay caja abierta ese día.
   */
  async create(dto: CreatePaymentDto, actingUserId: number) {
    if (dto.repairOrderId && dto.saleId) {
      throw new BadRequestException(
        "Un pago se aplica a una orden de reparación o a una venta, no a ambas",
      );
    }

    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new NotFoundException("El cliente indicado no existe");
    }

    let category = "Abonos";

    if (dto.repairOrderId) {
      const order = await this.prisma.repairOrder.findUnique({
        where: { id: dto.repairOrderId },
      });
      if (!order) {
        throw new NotFoundException("La orden de reparación indicada no existe");
      }
      if (order.customerId !== dto.customerId) {
        throw new BadRequestException(
          "La orden de reparación indicada no pertenece a este cliente",
        );
      }
      category = "Reparaciones";
    }

    if (dto.saleId) {
      const sale = await this.prisma.sale.findUnique({ where: { id: dto.saleId } });
      if (!sale) {
        throw new NotFoundException("La venta indicada no existe");
      }
      if (sale.status !== "ACTIVE") {
        throw new BadRequestException("Esta venta está cancelada — no se le pueden registrar abonos");
      }
      if (sale.customerId !== dto.customerId) {
        throw new BadRequestException("La venta indicada no pertenece a este cliente");
      }
      category = "Ventas";
    }

    const payment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          customerId: dto.customerId,
          repairOrderId: dto.repairOrderId,
          saleId: dto.saleId,
          amount: dto.amount,
          method: dto.method,
          reference: dto.reference,
          notes: dto.notes,
          userId: actingUserId,
        },
      });

      if (dto.repairOrderId) {
        await tx.repairOrder.update({
          where: { id: dto.repairOrderId },
          data: { paidAmount: { increment: dto.amount } },
        });
      }

      if (dto.saleId) {
        await tx.sale.update({
          where: { id: dto.saleId },
          data: { paidAmount: { increment: dto.amount } },
        });
      }

      await this.cash.recordIncomeIfRegisterOpen(tx, {
        category,
        amount: dto.amount,
        paymentId: created.id,
        userId: actingUserId,
        description: dto.repairOrderId
          ? `Abono a orden #${dto.repairOrderId}`
          : dto.saleId
            ? `Pago de venta #${dto.saleId}`
            : `Abono general de ${customer.fullName}`,
      });

      return created;
    });

    await this.audit.log({
      userId: actingUserId,
      action: "CREATE",
      entityType: "Payment",
      entityId: payment.id,
      newValue: {
        customerId: dto.customerId,
        repairOrderId: dto.repairOrderId,
        saleId: dto.saleId,
        amount: dto.amount,
      },
    });

    return payment;
  }

  /**
   * Corrige un abono ya registrado (monto/método/referencia/notas) — para
   * cuando alguien se equivocó al digitar el valor. Nunca se reasigna a
   * otro cliente/orden/venta (eso sería otro pago, no una corrección): ese
   * trío de relaciones se queda igual, solo cambian los datos del valor en
   * sí. Tampoco se toca `date` ni `userId` — sigue siendo el mismo evento
   * histórico, solo con el dato correcto.
   *
   * Mismo criterio que el resto del sistema con la caja (ver
   * CashService.reverseSaleIncomeIfStillOpen / reversePurchaseExpenseIfStillOpen):
   * si la caja donde quedó reflejado el ingreso de este abono ya se cerró,
   * el arqueo de ese día NO se toca — es un snapshot congelado. El
   * movimiento de caja solo se ajusta cuando esa caja sigue abierta.
   */
  async update(id: number, dto: UpdatePaymentDto, actingUserId: number) {
    const existing = await this.prisma.payment.findUnique({
      where: { id },
      include: { cashMovements: { include: { cashRegister: true } } },
    });
    if (!existing) {
      throw new NotFoundException("Pago no encontrado");
    }

    const newAmount = new Prisma.Decimal(dto.amount);
    const delta = newAmount.minus(existing.amount);

    const payment = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id },
        data: {
          amount: newAmount,
          method: dto.method,
          reference: dto.reference,
          notes: dto.notes,
        },
      });

      if (existing.repairOrderId && !delta.isZero()) {
        await tx.repairOrder.update({
          where: { id: existing.repairOrderId },
          data: { paidAmount: { increment: delta } },
        });
      }

      if (existing.saleId && !delta.isZero()) {
        await tx.sale.update({
          where: { id: existing.saleId },
          data: { paidAmount: { increment: delta } },
        });
      }

      if (!delta.isZero()) {
        const openMovement = existing.cashMovements.find(
          (m) => m.cashRegister.status === "OPEN",
        );
        if (openMovement) {
          await tx.cashMovement.update({
            where: { id: openMovement.id },
            data: { amount: { increment: delta } },
          });
        }
      }

      return updated;
    });

    await this.audit.log({
      userId: actingUserId,
      action: "UPDATE",
      entityType: "Payment",
      entityId: id,
      previousValue: {
        amount: existing.amount,
        method: existing.method,
        reference: existing.reference,
      },
      newValue: {
        amount: payment.amount,
        method: payment.method,
        reference: payment.reference,
      },
    });

    return payment;
  }

  /**
   * Devuelve dinero a un cliente — el caso típico es una orden que quedó
   * con saldo a favor del cliente (balance negativo) después de quitar un
   * repuesto/servicio cotizado y cobrado que al final no se usó (ver
   * RepairPartsService.remove()/RepairServicesService.remove(),
   * `adjustTotal`). A diferencia de un abono, NO crea un Payment (ese
   * historial representa cobros reales, no devoluciones) — decrementa
   * `paidAmount` directamente y deja un egreso real en Caja ("mejor
   * esfuerzo": si no hay caja abierta, la devolución igual queda
   * registrada en la orden, solo que sin reflejo en el arqueo del día).
   */
  async refund(dto: CreateRefundDto, actingUserId: number) {
    const order = await this.prisma.repairOrder.findUnique({
      where: { id: dto.repairOrderId },
    });
    if (!order) {
      throw new NotFoundException("La orden de reparación indicada no existe");
    }

    const overpaid = order.paidAmount.minus(order.totalValue);
    if (overpaid.lessThanOrEqualTo(0)) {
      throw new BadRequestException(
        "Esta orden no tiene saldo a favor del cliente — no hay nada que devolver",
      );
    }
    if (new Prisma.Decimal(dto.amount).greaterThan(overpaid)) {
      throw new BadRequestException(
        `No puedes devolver más de lo que el cliente pagó de más (${overpaid.toFixed(2)})`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.repairOrder.update({
        where: { id: dto.repairOrderId },
        data: { paidAmount: { decrement: dto.amount } },
      });

      await this.cash.recordRefundExpenseIfRegisterOpen(tx, {
        category: "Devoluciones",
        amount: dto.amount,
        repairOrderId: dto.repairOrderId,
        userId: actingUserId,
        description:
          dto.notes ?? `Devolución (${dto.method}) a cliente — orden ${order.orderCode}`,
      });
    });

    await this.audit.log({
      userId: actingUserId,
      action: "REFUND",
      entityType: "RepairOrder",
      entityId: dto.repairOrderId,
      previousValue: { paidAmount: order.paidAmount },
      newValue: { refundAmount: dto.amount, method: dto.method, notes: dto.notes },
    });

    return { message: "Devolución registrada" };
  }

  findAll(params: { customerId?: number; repairOrderId?: number; saleId?: number }) {
    const where: Prisma.PaymentWhereInput = {};
    if (params.customerId) where.customerId = params.customerId;
    if (params.repairOrderId) where.repairOrderId = params.repairOrderId;
    if (params.saleId) where.saleId = params.saleId;

    return this.prisma.payment.findMany({
      where,
      include: { user: { select: { id: true, fullName: true } } },
      orderBy: { date: "desc" },
      take: 100,
    });
  }

  async findOne(id: number) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, fullName: true } },
        user: { select: { id: true, fullName: true } },
        repairOrder: { select: { id: true, orderCode: true } },
        sale: { select: { id: true, invoiceNumber: true } },
      },
    });
    if (!payment) {
      throw new NotFoundException("Pago no encontrado");
    }
    return payment;
  }
}
