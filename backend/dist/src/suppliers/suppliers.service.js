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
exports.SuppliersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
let SuppliersService = class SuppliersService {
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async create(dto, actingUserId) {
        const supplier = await this.prisma.supplier.create({ data: dto });
        await this.audit.log({
            userId: actingUserId,
            action: "CREATE",
            entityType: "Supplier",
            entityId: supplier.id,
            newValue: { name: supplier.name },
        });
        return supplier;
    }
    findAll(search) {
        return this.prisma.supplier.findMany({
            where: {
                status: "ACTIVE",
                ...(search
                    ? { name: { contains: search, mode: "insensitive" } }
                    : {}),
            },
            orderBy: { name: "asc" },
        });
    }
    async findOne(id) {
        const supplier = await this.prisma.supplier.findUnique({
            where: { id },
            include: {
                // Historial de compras (sección 14: "Historial de compras, Saldo
                // pendiente") — el saldo pendiente se calcula a partir de estas,
                // no se almacena por separado.
                purchases: { orderBy: { date: "desc" }, take: 20 },
            },
        });
        if (!supplier) {
            throw new common_1.NotFoundException("Proveedor no encontrado");
        }
        return supplier;
    }
    async update(id, dto, actingUserId) {
        await this.findOne(id);
        const supplier = await this.prisma.supplier.update({ where: { id }, data: dto });
        await this.audit.log({
            userId: actingUserId,
            action: "UPDATE",
            entityType: "Supplier",
            entityId: id,
            newValue: dto,
        });
        return supplier;
    }
    async deactivate(id, actingUserId) {
        await this.findOne(id);
        const supplier = await this.prisma.supplier.update({
            where: { id },
            data: { status: "INACTIVE" },
        });
        await this.audit.log({
            userId: actingUserId,
            action: "DEACTIVATE",
            entityType: "Supplier",
            entityId: id,
        });
        return supplier;
    }
};
exports.SuppliersService = SuppliersService;
exports.SuppliersService = SuppliersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], SuppliersService);
