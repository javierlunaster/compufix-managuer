"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const cash_service_1 = require("../cash/cash.service");
let PaymentsService = class PaymentsService {
    constructor(prisma, audit, cash) {
        this.prisma = prisma;
        this.audit = audit;
        this.cash = cash;
    }
    /**
     * Registra un abono (sección 18 del brief). Si está asociado a una orden
     * de reparación, incrementa `RepairOrder.paidAmount` en la misma
     * transacción (el saldo pendiente sigue calculándose al vuelo como
     * totalValue - paidAmount, nunca se almacena). Si hay una caja abierta,
     * el abono también queda reflejado como ingreso de caja automáticamente
     * (ver CashService.recordIncomeIfRegisterOpen) — sin bloquear el pago si
     * no hay caja abierta ese día.
     */
    async create(dto, actingUserId) {
        if (dto.repairOrderId && dto.saleId) {
            throw new common_1.BadRequestException("Un pago se aplica a una orden de reparación o a una venta, no a ambas");
        }
        const customer = await this.prisma.customer.findUnique({
            where: { id: dto.customerId },
        });
        if (!customer) {
            throw new common_1.NotFoundException("El cliente indicado no existe");
        }
        let category = "Abonos";
        if (dto.repairOrderId) {
            const order = await this.prisma.repairOrder.findUnique({
                where: { id: dto.repairOrderId },
            });
            if (!order) {
                throw new common_1.NotFoundException("La orden de reparación indicada no existe");
            }
            if (order.customerId !== dto.customerId) {
                throw new common_1.BadRequestException("La orden de reparación indicada no pertenece a este cliente");
            }
            category = "Reparaciones";
        }
        if (dto.saleId) {
            const sale = await this.prisma.sale.findUnique({ where: { id: dto.saleId } });
            if (!sale) {
                throw new common_1.NotFoundException("La venta indicada no existe");
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
    findAll(params) {
        const where = {};
        if (params.customerId)
            where.customerId = params.customerId;
        if (params.repairOrderId)
            where.repairOrderId = params.repairOrderId;
        if (params.saleId)
            where.saleId = params.saleId;
        return this.prisma.payment.findMany({
            where,
            include: { user: { select: { id: true, fullName: true } } },
            orderBy: { date: "desc" },
            take: 100,
        });
    }
    async findOne(id) {
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
            throw new common_1.NotFoundException("Pago no encontrado");
        }
        return payment;
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        cash_service_1.CashService])
], PaymentsService);
