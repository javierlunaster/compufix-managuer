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
exports.WarrantiesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const repair_orders_service_1 = require("../repair-orders/repair-orders.service");
let WarrantiesService = class WarrantiesService {
    constructor(prisma, audit, repairOrders) {
        this.prisma = prisma;
        this.audit = audit;
        this.repairOrders = repairOrders;
    }
    async ensureOrderExists(orderId) {
        const order = await this.prisma.repairOrder.findUnique({ where: { id: orderId } });
        if (!order) {
            throw new common_1.NotFoundException("Orden de reparación no encontrada");
        }
        return order;
    }
    /**
     * Genera la garantía al entregar un equipo (sección 17 del brief). La
     * fecha de inicio es la de entrega; la fecha de fin se calcula sumando
     * los meses de cobertura — así quien entrega el equipo piensa en "3
     * meses en la pantalla", no en una fecha exacta que tendría que calcular
     * a mano.
     */
    async create(orderId, dto, actingUserId) {
        const order = await this.ensureOrderExists(orderId);
        const deliveryDate = dto.deliveryDate ? new Date(dto.deliveryDate) : new Date();
        const warrantyEndDate = new Date(deliveryDate);
        warrantyEndDate.setMonth(warrantyEndDate.getMonth() + dto.warrantyMonths);
        const warranty = await this.prisma.warranty.create({
            data: {
                repairOrderId: orderId,
                deliveryDate,
                warrantyStartDate: deliveryDate,
                warrantyEndDate,
                coverageDescription: dto.coverageDescription,
                status: client_1.WarrantyStatus.ACTIVE,
            },
        });
        await this.audit.log({
            userId: actingUserId,
            action: "CREATE",
            entityType: "Warranty",
            entityId: warranty.id,
            newValue: { repairOrderId: orderId, warrantyEndDate },
        });
        return warranty;
    }
    findAllForOrder(orderId) {
        return this.prisma.warranty.findMany({
            where: { repairOrderId: orderId },
            orderBy: { deliveryDate: "desc" },
        });
    }
    /**
     * `expiringWithinDays` cubre por adelantado la alerta "garantía próxima
     * a vencer" del Dashboard (sección 4 del brief) — el Dashboard como
     * pantalla agregada llega en una fase posterior, pero la consulta que lo
     * alimentará ya puede existir y probarse desde ya.
     */
    async findAll(params) {
        const where = {};
        if (params.status) {
            where.status = params.status;
        }
        if (params.expiringWithinDays !== undefined) {
            const limit = new Date();
            limit.setDate(limit.getDate() + params.expiringWithinDays);
            where.status = client_1.WarrantyStatus.ACTIVE;
            where.warrantyEndDate = { lte: limit, gte: new Date() };
        }
        return this.prisma.warranty.findMany({
            where,
            include: {
                repairOrder: {
                    select: {
                        id: true,
                        orderCode: true,
                        customer: { select: { id: true, fullName: true, phone: true } },
                    },
                },
            },
            orderBy: { warrantyEndDate: "asc" },
            take: 100,
        });
    }
    async findOne(id) {
        const warranty = await this.prisma.warranty.findUnique({
            where: { id },
            include: {
                repairOrder: {
                    select: {
                        id: true,
                        orderCode: true,
                        customerId: true,
                        deviceId: true,
                        customer: { select: { id: true, fullName: true, phone: true } },
                    },
                },
                claimingCustomer: { select: { id: true, fullName: true } },
            },
        });
        if (!warranty) {
            throw new common_1.NotFoundException("Garantía no encontrada");
        }
        return warranty;
    }
    async update(id, dto, actingUserId) {
        await this.findOne(id);
        const warranty = await this.prisma.warranty.update({
            where: { id },
            data: {
                coverageDescription: dto.coverageDescription,
                warrantyEndDate: dto.warrantyEndDate ? new Date(dto.warrantyEndDate) : undefined,
            },
        });
        await this.audit.log({
            userId: actingUserId,
            action: "UPDATE",
            entityType: "Warranty",
            entityId: id,
            newValue: dto,
        });
        return warranty;
    }
    /**
     * Reclamo de garantía (sección 17 del brief: "si un cliente vuelve por
     * garantía, debe poder relacionarse con la reparación original"). En vez
     * de duplicar la lógica de creación de órdenes, reutiliza
     * RepairOrdersService — la nueva orden nace para el MISMO equipo
     * (Device), que es justamente lo que permite rastrear el historial
     * completo de ese equipo (Regla 6, ya soportada desde la Fase 3): la
     * relación no es un campo nuevo, es el mismo `deviceId` compartido entre
     * ambas órdenes.
     */
    async claim(id, dto, actingUserId) {
        const warranty = await this.prisma.warranty.findUnique({
            where: { id },
            include: { repairOrder: true },
        });
        if (!warranty) {
            throw new common_1.NotFoundException("Garantía no encontrada");
        }
        if (warranty.status === client_1.WarrantyStatus.CLAIMED) {
            throw new common_1.BadRequestException("Esta garantía ya fue reclamada anteriormente");
        }
        if (warranty.status === client_1.WarrantyStatus.EXPIRED || warranty.warrantyEndDate < new Date()) {
            throw new common_1.BadRequestException(`Esta garantía venció el ${warranty.warrantyEndDate.toISOString().slice(0, 10)}`);
        }
        const originalOrder = warranty.repairOrder;
        // Reutiliza el flujo normal de recepción (genera código C#####,
        // historial de estado inicial, todo dentro de su propia transacción).
        const claimOrder = await this.repairOrders.create({
            customerId: dto.claimingCustomerId ?? originalOrder.customerId,
            deviceId: originalOrder.deviceId,
            reportedIssue: dto.reportedIssue,
            entryReason: `Reclamo de garantía #${warranty.id} (orden original ${originalOrder.orderCode})`,
        }, actingUserId);
        // Mueve la nueva orden directo a estado "En garantía" — reutiliza
        // updateStatus() en vez de escribir el estado a mano, así queda su
        // propia entrada en RepairStatusHistory igual que cualquier otro
        // cambio de estado.
        await this.repairOrders.updateStatus(claimOrder.id, { newStatus: client_1.RepairStatus.WARRANTY, notes: `Reclamo de garantía #${warranty.id}` }, actingUserId);
        const updatedWarranty = await this.prisma.warranty.update({
            where: { id },
            data: {
                status: client_1.WarrantyStatus.CLAIMED,
                claimingCustomerId: dto.claimingCustomerId ?? originalOrder.customerId,
                claimNotes: dto.claimNotes,
            },
        });
        await this.audit.log({
            userId: actingUserId,
            action: "CLAIM",
            entityType: "Warranty",
            entityId: id,
            newValue: { claimOrderId: claimOrder.id },
        });
        return { warranty: updatedWarranty, claimOrder };
    }
};
exports.WarrantiesService = WarrantiesService;
exports.WarrantiesService = WarrantiesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        repair_orders_service_1.RepairOrdersService])
], WarrantiesService);
