import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CashService } from "../cash/cash.service";
import { CreatePaymentDto } from "./dto/create-payment.dto";

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private cash: CashService,
  ) {}

  /**
   * Registra un abono (sección 18 del brief). Si está asociado a una orden
   * de reparación, incrementa `RepairOrder.paidAmount` en la misma
   * transacción (el saldo pendiente sigue calculándose al vuelo como
   * totalValue - paidAmount, nunca se almacena). Si hay una caja abierta,
   * el abono también queda reflejado como ingreso de caja automáticamente
   * (ver CashService.recordIncomeIfRegisterOpen) — sin bloquear el pago si
   * no hay caja abierta ese día.
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
