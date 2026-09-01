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
exports.CashService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
let CashService = class CashService {
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    /**
     * Solo puede haber UNA caja abierta a la vez en todo el sistema — el
     * brief describe apertura/cierre/arqueo como un proceso diario único del
     * taller, no una caja por usuario o por turno simultáneo.
     */
    async open(dto, actingUserId) {
        const existingOpen = await this.prisma.cashRegister.findFirst({
            where: { status: "OPEN" },
        });
        if (existingOpen) {
            throw new common_1.BadRequestException(`Ya hay una caja abierta (#${existingOpen.id}, abierta ${existingOpen.openedAt.toISOString()}). Ciérrala antes de abrir una nueva.`);
        }
        const register = await this.prisma.cashRegister.create({
            data: {
                openingAmount: dto.openingAmount,
                openedById: actingUserId,
            },
        });
        await this.audit.log({
            userId: actingUserId,
            action: "OPEN",
            entityType: "CashRegister",
            entityId: register.id,
            newValue: { openingAmount: dto.openingAmount },
        });
        return register;
    }
    /**
     * Cierra la caja abierta y calcula el arqueo: monto esperado = apertura +
     * ingresos - egresos registrados durante el turno; diferencia = lo que
     * contaron físicamente menos lo esperado (positivo = sobra, negativo =
     * falta) — tal como pide la sección 19 del brief.
     */
    async close(id, dto, actingUserId) {
        const register = await this.prisma.cashRegister.findUnique({
            where: { id },
            include: { movements: true },
        });
        if (!register) {
            throw new common_1.NotFoundException("Caja no encontrada");
        }
        if (register.status === "CLOSED") {
            throw new common_1.BadRequestException("Esta caja ya está cerrada");
        }
        const income = register.movements
            .filter((m) => m.type === client_1.CashMovementType.INCOME)
            .reduce((sum, m) => sum + Number(m.amount), 0);
        const expense = register.movements
            .filter((m) => m.type === client_1.CashMovementType.EXPENSE)
            .reduce((sum, m) => sum + Number(m.amount), 0);
        const expectedAmount = Number(register.openingAmount) + income - expense;
        const difference = dto.closingAmount - expectedAmount;
        const closed = await this.prisma.cashRegister.update({
            where: { id },
            data: {
                status: "CLOSED",
                closedAt: new Date(),
                closedById: actingUserId,
                closingAmount: dto.closingAmount,
                expectedAmount,
                difference,
            },
        });
        await this.audit.log({
            userId: actingUserId,
            action: "CLOSE",
            entityType: "CashRegister",
            entityId: id,
            newValue: { closingAmount: dto.closingAmount, expectedAmount, difference },
        });
        return closed;
    }
    findCurrent() {
        return this.prisma.cashRegister.findFirst({
            where: { status: "OPEN" },
            include: {
                movements: {
                    orderBy: { date: "desc" },
                    include: { user: { select: { id: true, fullName: true } } },
                },
                openedBy: { select: { id: true, fullName: true } },
            },
        });
    }
    findAll() {
        return this.prisma.cashRegister.findMany({
            orderBy: { openedAt: "desc" },
            include: {
                openedBy: { select: { id: true, fullName: true } },
                closedBy: { select: { id: true, fullName: true } },
            },
            take: 60,
        });
    }
    async findOne(id) {
        const register = await this.prisma.cashRegister.findUnique({
            where: { id },
            include: {
                movements: {
                    orderBy: { date: "desc" },
                    include: { user: { select: { id: true, fullName: true } } },
                },
                openedBy: { select: { id: true, fullName: true } },
                closedBy: { select: { id: true, fullName: true } },
            },
        });
        if (!register) {
            throw new common_1.NotFoundException("Caja no encontrada");
        }
        return register;
    }
    /**
     * Registro manual de un movimiento (ej. un gasto de envío, una compra en
     * efectivo). Requiere que haya una caja abierta.
     */
    async createMovement(dto, actingUserId) {
        const current = await this.prisma.cashRegister.findFirst({
            where: { status: "OPEN" },
        });
        if (!current) {
            throw new common_1.BadRequestException("No hay una caja abierta — ábrela antes de registrar movimientos");
        }
        const movement = await this.prisma.cashMovement.create({
            data: {
                cashRegisterId: current.id,
                type: dto.type,
                category: dto.category,
                amount: dto.amount,
                description: dto.description,
                userId: actingUserId,
            },
        });
        await this.audit.log({
            userId: actingUserId,
            action: "CREATE",
            entityType: "CashMovement",
            entityId: movement.id,
            newValue: dto,
        });
        return movement;
    }
    /**
     * Integración automática con Pagos (ver PaymentsService): si hay una
     * caja abierta al momento de registrar un abono, se refleja como ingreso
     * de caja en la misma transacción — sin bloquear el pago si no hay caja
     * abierta (se decidió que el registro del pago no debe depender de la
     * disciplina de caja del día; queda como "mejor esfuerzo").
     */
    async recordIncomeIfRegisterOpen(tx, params) {
        const current = await tx.cashRegister.findFirst({ where: { status: "OPEN" } });
        if (!current) {
            return null;
        }
        return tx.cashMovement.create({
            data: {
                cashRegisterId: current.id,
                type: client_1.CashMovementType.INCOME,
                category: params.category,
                amount: params.amount,
                paymentId: params.paymentId,
                description: params.description,
                userId: params.userId,
            },
        });
    }
};
exports.CashService = CashService;
exports.CashService = CashService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], CashService);
