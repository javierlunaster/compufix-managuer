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
exports.QuotationsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const repair_parts_service_1 = require("../repair-parts/repair-parts.service");
const normalize_name_util_1 = require("../common/utils/normalize-name.util");
const QUOTATION_DETAIL_INCLUDE = {
    customer: { select: { id: true, fullName: true, phone: true } },
    sourceOrder: { select: { id: true, orderCode: true, status: true } },
    items: {
        include: {
            product: { select: { id: true, sku: true, description: true } },
            service: { select: { id: true, code: true, name: true } },
        },
    },
};
function computeTotals(items, discount = 0, tax = 0, shipping = 0) {
    const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const total = subtotal - discount + tax + shipping;
    return { subtotal, total };
}
let QuotationsService = class QuotationsService {
    constructor(prisma, audit, repairParts) {
        this.prisma = prisma;
        this.audit = audit;
        this.repairParts = repairParts;
    }
    async create(dto, actingUserId) {
        const customer = await this.prisma.customer.findUnique({
            where: { id: dto.customerId },
        });
        if (!customer) {
            throw new common_1.NotFoundException("El cliente indicado no existe");
        }
        if (dto.sourceOrderId) {
            const order = await this.prisma.repairOrder.findUnique({
                where: { id: dto.sourceOrderId },
            });
            if (!order) {
                throw new common_1.NotFoundException("La orden de reparación indicada no existe");
            }
            if (order.customerId !== dto.customerId) {
                throw new common_1.BadRequestException("La orden de reparación indicada no pertenece a este cliente");
            }
        }
        const itemsForTotals = dto.items.map((i) => ({
            unitPrice: i.unitPrice,
            quantity: i.quantity ?? 1,
        }));
        const { subtotal, total } = computeTotals(itemsForTotals, dto.discount, dto.tax, dto.shipping);
        const quotation = await this.prisma.$transaction(async (tx) => {
            // Igual patrón que orderCode: se crea con un número temporal y se
            // corrige al 'COT' + id dentro de la misma transacción.
            const created = await tx.customerQuotation.create({
                data: {
                    quotationNumber: `TEMP-${Date.now()}`,
                    customerId: dto.customerId,
                    sourceOrderId: dto.sourceOrderId,
                    subtotal,
                    discount: dto.discount ?? 0,
                    tax: dto.tax ?? 0,
                    shipping: dto.shipping ?? 0,
                    total,
                    validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
                    notes: dto.notes,
                    items: {
                        create: dto.items.map((i) => ({
                            type: i.type,
                            productId: i.productId,
                            serviceId: i.serviceId,
                            description: i.description,
                            quantity: i.quantity ?? 1,
                            unitPrice: i.unitPrice,
                            subtotal: i.unitPrice * (i.quantity ?? 1),
                        })),
                    },
                },
            });
            return tx.customerQuotation.update({
                where: { id: created.id },
                data: { quotationNumber: `COT${created.id}` },
            });
        });
        await this.audit.log({
            userId: actingUserId,
            action: "CREATE",
            entityType: "CustomerQuotation",
            entityId: quotation.id,
            newValue: { quotationNumber: quotation.quotationNumber, total },
        });
        return this.findOne(quotation.id);
    }
    async findAll(params) {
        const where = {};
        if (params.status) {
            where.status = params.status;
        }
        if (params.customerId) {
            where.customerId = params.customerId;
        }
        if (params.search) {
            const normalizedTerm = (0, normalize_name_util_1.normalizeName)(params.search);
            where.OR = [
                { quotationNumber: { contains: params.search, mode: "insensitive" } },
                { customer: { normalizedName: { contains: normalizedTerm } } },
            ];
        }
        return this.prisma.customerQuotation.findMany({
            where,
            include: {
                customer: { select: { id: true, fullName: true } },
                sourceOrder: { select: { id: true, orderCode: true } },
            },
            orderBy: { date: "desc" },
            take: 100,
        });
    }
    async findOne(id) {
        const quotation = await this.prisma.customerQuotation.findUnique({
            where: { id },
            include: QUOTATION_DETAIL_INCLUDE,
        });
        if (!quotation) {
            throw new common_1.NotFoundException("Cotización no encontrada");
        }
        return quotation;
    }
    async ensureDraft(id) {
        const quotation = await this.prisma.customerQuotation.findUnique({ where: { id } });
        if (!quotation) {
            throw new common_1.NotFoundException("Cotización no encontrada");
        }
        if (quotation.status !== client_1.QuotationStatus.DRAFT) {
            throw new common_1.BadRequestException("Solo se pueden editar cotizaciones en estado Borrador — cambia su estado de vuelta a Borrador si necesitas modificarla");
        }
        return quotation;
    }
    async update(id, dto, actingUserId) {
        await this.ensureDraft(id);
        const items = await this.prisma.quotationItem.findMany({ where: { quotationId: id } });
        const { subtotal, total } = computeTotals(items.map((i) => ({ unitPrice: Number(i.unitPrice), quantity: i.quantity })), dto.discount, dto.tax, dto.shipping);
        const quotation = await this.prisma.customerQuotation.update({
            where: { id },
            data: {
                discount: dto.discount,
                tax: dto.tax,
                shipping: dto.shipping,
                validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
                notes: dto.notes,
                subtotal,
                total,
            },
        });
        await this.audit.log({
            userId: actingUserId,
            action: "UPDATE",
            entityType: "CustomerQuotation",
            entityId: id,
            newValue: dto,
        });
        return this.findOne(quotation.id);
    }
    async addItem(quotationId, dto, actingUserId) {
        await this.ensureDraft(quotationId);
        const quantity = dto.quantity ?? 1;
        await this.prisma.quotationItem.create({
            data: {
                quotationId,
                type: dto.type,
                productId: dto.productId,
                serviceId: dto.serviceId,
                description: dto.description,
                quantity,
                unitPrice: dto.unitPrice,
                subtotal: dto.unitPrice * quantity,
            },
        });
        await this.recalculateTotals(quotationId);
        await this.audit.log({
            userId: actingUserId,
            action: "ADD_ITEM",
            entityType: "CustomerQuotation",
            entityId: quotationId,
            newValue: dto,
        });
        return this.findOne(quotationId);
    }
    async removeItem(quotationId, itemId, actingUserId) {
        await this.ensureDraft(quotationId);
        const item = await this.prisma.quotationItem.findUnique({ where: { id: itemId } });
        if (!item || item.quotationId !== quotationId) {
            throw new common_1.NotFoundException("Ítem no encontrado en esta cotización");
        }
        await this.prisma.quotationItem.delete({ where: { id: itemId } });
        await this.recalculateTotals(quotationId);
        await this.audit.log({
            userId: actingUserId,
            action: "REMOVE_ITEM",
            entityType: "CustomerQuotation",
            entityId: quotationId,
            previousValue: item,
        });
        return this.findOne(quotationId);
    }
    async recalculateTotals(quotationId) {
        const quotation = await this.prisma.customerQuotation.findUniqueOrThrow({
            where: { id: quotationId },
        });
        const items = await this.prisma.quotationItem.findMany({ where: { quotationId } });
        const { subtotal, total } = computeTotals(items.map((i) => ({ unitPrice: Number(i.unitPrice), quantity: i.quantity })), Number(quotation.discount), Number(quotation.tax), Number(quotation.shipping));
        await this.prisma.customerQuotation.update({
            where: { id: quotationId },
            data: { subtotal, total },
        });
    }
    async updateStatus(id, dto, actingUserId) {
        const quotation = await this.prisma.customerQuotation.findUnique({ where: { id } });
        if (!quotation) {
            throw new common_1.NotFoundException("Cotización no encontrada");
        }
        if (quotation.status === client_1.QuotationStatus.CONVERTED) {
            throw new common_1.BadRequestException("Esta cotización ya fue convertida en una orden de reparación y no se puede cambiar de estado");
        }
        const updated = await this.prisma.customerQuotation.update({
            where: { id },
            data: { status: dto.newStatus },
        });
        await this.audit.log({
            userId: actingUserId,
            action: "STATUS_CHANGE",
            entityType: "CustomerQuotation",
            entityId: id,
            previousValue: { status: quotation.status },
            newValue: { status: updated.status },
        });
        return this.findOne(id);
    }
    /**
     * Convierte una cotización APROBADA en la reparación real (sección 10 del
     * brief: "una cotización aprobada puede convertirse directamente en una
     * orden de reparación"). Requiere que la cotización tenga `sourceOrderId`
     * — solo tiene sentido convertir una cotización que nació del diagnóstico
     * de una orden que ya existe y ya tiene un equipo asociado; una
     * cotización "suelta" (sin orden de origen) no se puede convertir
     * automáticamente porque no hay a qué equipo asociarla.
     *
     * Todo ocurre en UNA transacción: consumir cada repuesto de inventario
     * (vía RepairPartsService.createWithTx, reutilizando exactamente la misma
     * lógica de la Fase 6 — nunca se duplica el descuento de stock), crear
     * los servicios cotizados como RepairService, actualizar el total y el
     * estado de la orden, y marcar la cotización como CONVERTED. Si algo
     * falla a mitad de camino (ej. no hay suficiente stock de un repuesto),
     * TODO se revierte — no queda una conversión a medias.
     */
    async convert(id, actingUserId) {
        const quotation = await this.prisma.customerQuotation.findUnique({
            where: { id },
            include: { items: true },
        });
        if (!quotation) {
            throw new common_1.NotFoundException("Cotización no encontrada");
        }
        if (quotation.status !== client_1.QuotationStatus.APPROVED) {
            throw new common_1.BadRequestException("Solo se puede convertir una cotización en estado Aprobada");
        }
        if (!quotation.sourceOrderId) {
            throw new common_1.BadRequestException("Esta cotización no está asociada a una orden de reparación (sourceOrderId), así que no se puede convertir automáticamente. Créala de nuevo indicando sourceOrderId, o crea la orden manualmente.");
        }
        const orderId = quotation.sourceOrderId;
        await this.prisma.$transaction(async (tx) => {
            const order = await tx.repairOrder.findUniqueOrThrow({ where: { id: orderId } });
            for (const item of quotation.items) {
                if (item.type === "PART" && item.productId) {
                    const product = await tx.product.findUniqueOrThrow({
                        where: { id: item.productId },
                    });
                    await this.repairParts.createWithTx(tx, orderId, product, item.quantity, Number(item.unitPrice), actingUserId);
                }
                else if (item.type === "SERVICE" && item.serviceId) {
                    await tx.repairService.create({
                        data: {
                            repairOrderId: orderId,
                            serviceId: item.serviceId,
                            price: Number(item.unitPrice) * item.quantity,
                        },
                    });
                }
                // LABOR y OTHER: no tienen tabla propia en esta fase — su valor ya
                // está incluido en quotation.total, que se asigna directo abajo a
                // order.totalValue. Ver nota de simplificación en el README.
            }
            await tx.repairOrder.update({
                where: { id: orderId },
                data: { totalValue: quotation.total, status: client_1.RepairStatus.APPROVED },
            });
            await tx.repairStatusHistory.create({
                data: {
                    repairOrderId: orderId,
                    previousStatus: order.status,
                    newStatus: client_1.RepairStatus.APPROVED,
                    userId: actingUserId,
                    notes: `Cotización ${quotation.quotationNumber} aprobada y convertida`,
                },
            });
            await tx.customerQuotation.update({
                where: { id },
                data: { status: client_1.QuotationStatus.CONVERTED },
            });
        });
        await this.audit.log({
            userId: actingUserId,
            action: "CONVERT",
            entityType: "CustomerQuotation",
            entityId: id,
            newValue: { convertedToOrderId: orderId },
        });
        return this.findOne(id);
    }
};
exports.QuotationsService = QuotationsService;
exports.QuotationsService = QuotationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        repair_parts_service_1.RepairPartsService])
], QuotationsService);
