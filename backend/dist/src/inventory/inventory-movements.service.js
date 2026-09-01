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
exports.InventoryMovementsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
let InventoryMovementsService = class InventoryMovementsService {
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    /**
     * El único lugar del sistema donde `Product.stock` se escribe (Regla 2
     * del brief: el inventario nunca se edita directo, solo por movimientos).
     * Valida que el stock resultante nunca quede negativo.
     */
    async applyMovement(tx, params) {
        const product = await tx.product.findUnique({ where: { id: params.productId } });
        if (!product) {
            throw new common_1.NotFoundException("Producto no encontrado");
        }
        const newStock = product.stock + params.quantity;
        if (newStock < 0) {
            throw new common_1.BadRequestException(`Stock insuficiente para "${product.description}" (disponible: ${product.stock}, se intentó descontar: ${Math.abs(params.quantity)})`);
        }
        const movement = await tx.inventoryMovement.create({
            data: {
                productId: params.productId,
                type: params.type,
                quantity: params.quantity,
                unitCost: params.unitCost,
                repairOrderId: params.repairOrderId,
                purchaseId: params.purchaseId,
                saleId: params.saleId,
                userId: params.userId,
                notes: params.notes,
            },
        });
        await tx.product.update({
            where: { id: params.productId },
            data: { stock: newStock },
        });
        return movement;
    }
    async createManual(dto, actingUserId) {
        const movement = await this.prisma.$transaction((tx) => this.applyMovement(tx, {
            productId: dto.productId,
            type: dto.type,
            quantity: dto.quantity,
            unitCost: dto.unitCost,
            userId: actingUserId,
            notes: dto.notes,
        }));
        await this.audit.log({
            userId: actingUserId,
            action: "CREATE",
            entityType: "InventoryMovement",
            entityId: movement.id,
            newValue: { productId: dto.productId, type: dto.type, quantity: dto.quantity },
        });
        return movement;
    }
    findAllForProduct(productId) {
        return this.prisma.inventoryMovement.findMany({
            where: { productId },
            include: { user: { select: { id: true, fullName: true } } },
            orderBy: { createdAt: "desc" },
        });
    }
};
exports.InventoryMovementsService = InventoryMovementsService;
exports.InventoryMovementsService = InventoryMovementsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], InventoryMovementsService);
