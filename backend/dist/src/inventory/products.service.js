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
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const inventory_movements_service_1 = require("./inventory-movements.service");
let ProductsService = class ProductsService {
    constructor(prisma, audit, movements) {
        this.prisma = prisma;
        this.audit = audit;
        this.movements = movements;
    }
    async create(dto, actingUserId) {
        const existingSku = await this.prisma.product.findUnique({ where: { sku: dto.sku } });
        if (existingSku) {
            throw new common_1.ConflictException("Ya existe un producto con ese SKU");
        }
        const category = await this.prisma.productCategory.findUnique({
            where: { id: dto.categoryId },
        });
        if (!category) {
            throw new common_1.NotFoundException("La categoría indicada no existe");
        }
        const product = await this.prisma.$transaction(async (tx) => {
            const created = await tx.product.create({
                data: {
                    sku: dto.sku,
                    internalCode: dto.internalCode,
                    categoryId: dto.categoryId,
                    brandId: dto.brandId,
                    description: dto.description,
                    cost: dto.cost ?? 0,
                    salePrice: dto.salePrice ?? 0,
                    minStock: dto.minStock ?? 0,
                    location: dto.location,
                    warrantyMonths: dto.warrantyMonths,
                },
            });
            if (dto.initialStock && dto.initialStock > 0) {
                await this.movements.applyMovement(tx, {
                    productId: created.id,
                    type: client_1.InventoryMovementType.ADJUSTMENT,
                    quantity: dto.initialStock,
                    unitCost: dto.cost,
                    userId: actingUserId,
                    notes: "Existencia inicial al registrar el producto",
                });
            }
            return created;
        });
        await this.audit.log({
            userId: actingUserId,
            action: "CREATE",
            entityType: "Product",
            entityId: product.id,
            newValue: { sku: product.sku, description: product.description },
        });
        return this.findOne(product.id);
    }
    async findAll(params) {
        const where = { status: "ACTIVE" };
        if (params.categoryId) {
            where.categoryId = params.categoryId;
        }
        if (params.search) {
            where.OR = [
                { sku: { contains: params.search, mode: "insensitive" } },
                { internalCode: { contains: params.search, mode: "insensitive" } },
                { description: { contains: params.search, mode: "insensitive" } },
            ];
        }
        const products = await this.prisma.product.findMany({
            where,
            include: { category: true, brand: true },
            orderBy: { description: "asc" },
            take: 200,
        });
        // stock <= minStock: se filtra en memoria porque Prisma no permite
        // comparar dos columnas de la misma tabla directamente en `where` sin
        // una consulta cruda — con un catálogo de este tamaño no hay problema
        // de rendimiento; si el inventario crece mucho, esto se mueve a SQL.
        return params.lowStockOnly
            ? products.filter((p) => p.stock <= p.minStock)
            : products;
    }
    async findOne(id) {
        const product = await this.prisma.product.findUnique({
            where: { id },
            include: {
                category: true,
                brand: true,
                supplierRefs: { include: { supplier: true } },
            },
        });
        if (!product) {
            throw new common_1.NotFoundException("Producto no encontrado");
        }
        return product;
    }
    async update(id, dto, actingUserId) {
        await this.findOne(id);
        const product = await this.prisma.product.update({
            where: { id },
            data: dto,
        });
        await this.audit.log({
            userId: actingUserId,
            action: "UPDATE",
            entityType: "Product",
            entityId: id,
            newValue: dto,
        });
        return this.findOne(product.id);
    }
    async deactivate(id, actingUserId) {
        await this.findOne(id);
        const product = await this.prisma.product.update({
            where: { id },
            data: { status: "INACTIVE" },
        });
        await this.audit.log({
            userId: actingUserId,
            action: "DEACTIVATE",
            entityType: "Product",
            entityId: id,
        });
        return product;
    }
    async reactivate(id, actingUserId) {
        await this.findOne(id);
        const product = await this.prisma.product.update({
            where: { id },
            data: { status: "ACTIVE" },
        });
        await this.audit.log({
            userId: actingUserId,
            action: "REACTIVATE",
            entityType: "Product",
            entityId: id,
        });
        return product;
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        inventory_movements_service_1.InventoryMovementsService])
], ProductsService);
