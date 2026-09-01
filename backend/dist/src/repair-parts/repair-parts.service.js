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
exports.RepairPartsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const inventory_movements_service_1 = require("../inventory/inventory-movements.service");
let RepairPartsService = class RepairPartsService {
    constructor(prisma, audit, movements) {
        this.prisma = prisma;
        this.audit = audit;
        this.movements = movements;
    }
    async ensureOrderExists(orderId) {
        const order = await this.prisma.repairOrder.findUnique({ where: { id: orderId } });
        if (!order) {
            throw new common_1.NotFoundException("Orden de reparación no encontrada");
        }
        return order;
    }
    /**
     * Núcleo de "consumir un repuesto", sin abrir su propia transacción —
     * para poder invocarse tanto desde `create()` (transacción propia) como
     * desde otro servicio que ya está dentro de una transacción (ver
     * QuotationsService.convert()).
     */
    async createWithTx(tx, orderId, product, quantity, unitPrice, actingUserId) {
        await this.movements.applyMovement(tx, {
            productId: product.id,
            type: client_1.InventoryMovementType.USED_IN_REPAIR,
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
    async create(orderId, dto, actingUserId) {
        await this.ensureOrderExists(orderId);
        const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
        if (!product) {
            throw new common_1.NotFoundException("Producto no encontrado");
        }
        const unitPrice = dto.unitPrice ?? Number(product.salePrice);
        const repairPart = await this.prisma.$transaction((tx) => this.createWithTx(tx, orderId, product, dto.quantity, unitPrice, actingUserId));
        await this.audit.log({
            userId: actingUserId,
            action: "CREATE",
            entityType: "RepairPart",
            entityId: repairPart.id,
            newValue: { repairOrderId: orderId, productId: dto.productId, quantity: dto.quantity },
        });
        return repairPart;
    }
    findAllForOrder(orderId) {
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
    async remove(orderId, partId, actingUserId) {
        const part = await this.prisma.repairPart.findUnique({ where: { id: partId } });
        if (!part || part.repairOrderId !== orderId) {
            throw new common_1.NotFoundException("Repuesto no encontrado en esta orden");
        }
        await this.prisma.$transaction(async (tx) => {
            await this.movements.applyMovement(tx, {
                productId: part.productId,
                type: client_1.InventoryMovementType.USED_IN_REPAIR,
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
    async costSummary(orderId) {
        const order = await this.ensureOrderExists(orderId);
        const parts = await this.findAllForOrder(orderId);
        const partsCost = parts.reduce((sum, p) => sum + Number(p.unitCost) * p.quantity, 0);
        const partsRevenue = parts.reduce((sum, p) => sum + Number(p.unitPrice) * p.quantity, 0);
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
};
exports.RepairPartsService = RepairPartsService;
exports.RepairPartsService = RepairPartsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        inventory_movements_service_1.InventoryMovementsService])
], RepairPartsService);
