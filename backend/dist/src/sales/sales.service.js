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
exports.SalesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const inventory_movements_service_1 = require("../inventory/inventory-movements.service");
let SalesService = class SalesService {
    constructor(prisma, audit, movements) {
        this.prisma = prisma;
        this.audit = audit;
        this.movements = movements;
    }
    /**
     * Venta rápida tipo POS (sección 15 del brief): cliente (opcional) →
     * productos → cantidad → precio → descuento → pago → salida de
     * inventario, todo en un solo paso. Cada ítem descuenta stock vía
     * InventoryMovement tipo SALE — si no hay suficiente stock de algún
     * producto, toda la venta se cancela (transacción), no se vende "a
     * medias".
     */
    async create(dto, actingUserId) {
        if (dto.customerId) {
            const customer = await this.prisma.customer.findUnique({
                where: { id: dto.customerId },
            });
            if (!customer) {
                throw new common_1.NotFoundException("El cliente indicado no existe");
            }
        }
        const resolvedItems = [];
        for (const item of dto.items) {
            const product = await this.prisma.product.findUnique({
                where: { id: item.productId },
            });
            if (!product) {
                throw new common_1.NotFoundException(`Producto ${item.productId} no encontrado`);
            }
            resolvedItems.push({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice ?? Number(product.salePrice),
                discount: item.discount ?? 0,
            });
        }
        const subtotal = resolvedItems.reduce((sum, i) => sum + (i.unitPrice - i.discount) * i.quantity, 0);
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
                    type: client_1.InventoryMovementType.SALE,
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
    async findAll(params) {
        const where = { status: "ACTIVE" };
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
    async findOne(id) {
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
            throw new common_1.NotFoundException("Venta no encontrada");
        }
        return sale;
    }
    /**
     * Cancela una venta: restituye el stock de cada ítem (vía un movimiento
     * compensatorio, nunca editando `stock` a mano) y marca la venta como
     * INACTIVE — nunca se borra (Regla 1), es un documento financiero.
     */
    async cancel(id, actingUserId) {
        const sale = await this.prisma.sale.findUnique({
            where: { id },
            include: { items: true },
        });
        if (!sale) {
            throw new common_1.NotFoundException("Venta no encontrada");
        }
        if (sale.status === "INACTIVE") {
            throw new common_1.NotFoundException("Esta venta ya está cancelada");
        }
        await this.prisma.$transaction(async (tx) => {
            for (const item of sale.items) {
                await this.movements.applyMovement(tx, {
                    productId: item.productId,
                    type: client_1.InventoryMovementType.SALE,
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
};
exports.SalesService = SalesService;
exports.SalesService = SalesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        inventory_movements_service_1.InventoryMovementsService])
], SalesService);
