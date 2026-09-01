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
exports.CustomersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const normalize_name_util_1 = require("../common/utils/normalize-name.util");
let CustomersService = class CustomersService {
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    /**
     * Antes de crear, busca clientes activos con el mismo nombre normalizado
     * (misma regla usada en el plan de migración del Excel, sección H). Si
     * encuentra coincidencias y el llamador no confirmó explícitamente que
     * quiere crear de todas formas, devuelve 409 con la lista de posibles
     * duplicados para que la interfaz le pregunte al usuario "¿es este mismo
     * cliente?" en vez de crear un registro nuevo silenciosamente.
     */
    async create(dto, actingUserId) {
        const normalizedName = (0, normalize_name_util_1.normalizeName)(dto.fullName);
        if (!dto.confirmCreateDespiteDuplicate) {
            const possibleDuplicates = await this.prisma.customer.findMany({
                where: { normalizedName, status: "ACTIVE" },
                select: { id: true, fullName: true, phone: true, documentId: true },
            });
            if (possibleDuplicates.length > 0) {
                throw new common_1.ConflictException({
                    message: "Ya existe al menos un cliente con un nombre muy similar. Si es una persona distinta, reenvía la creación con confirmCreateDespiteDuplicate=true.",
                    possibleDuplicates,
                });
            }
        }
        const customer = await this.prisma.customer.create({
            data: {
                fullName: dto.fullName,
                normalizedName,
                customerType: dto.customerType,
                documentId: dto.documentId,
                phone: dto.phone,
                whatsapp: dto.whatsapp,
                email: dto.email,
                address: dto.address,
                city: dto.city,
                notes: dto.notes,
            },
        });
        await this.audit.log({
            userId: actingUserId,
            action: "CREATE",
            entityType: "Customer",
            entityId: customer.id,
            newValue: { fullName: customer.fullName, phone: customer.phone },
        });
        return customer;
    }
    /**
     * Búsqueda rápida por nombre, teléfono o documento (sección 5 del brief).
     * El nombre se compara contra normalizedName para que sea insensible a
     * mayúsculas y tildes, igual que la lógica de detección de duplicados.
     */
    async search(term) {
        if (!term || term.trim().length === 0) {
            return this.prisma.customer.findMany({
                where: { status: "ACTIVE" },
                orderBy: { fullName: "asc" },
                take: 50,
            });
        }
        const normalizedTerm = (0, normalize_name_util_1.normalizeName)(term);
        return this.prisma.customer.findMany({
            where: {
                status: "ACTIVE",
                OR: [
                    { normalizedName: { contains: normalizedTerm } },
                    { phone: { contains: term } },
                    { whatsapp: { contains: term } },
                    { documentId: { contains: term } },
                ],
            },
            orderBy: { fullName: "asc" },
            take: 50,
        });
    }
    async findOne(id) {
        const customer = await this.prisma.customer.findUnique({
            where: { id },
            include: {
                devices: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" } },
            },
        });
        if (!customer) {
            throw new common_1.NotFoundException("Cliente no encontrado");
        }
        return customer;
    }
    async update(id, dto, actingUserId) {
        const before = await this.findOne(id);
        const data = { ...dto };
        if (dto.fullName) {
            data.normalizedName = (0, normalize_name_util_1.normalizeName)(dto.fullName);
        }
        const customer = await this.prisma.customer.update({
            where: { id },
            data,
        });
        await this.audit.log({
            userId: actingUserId,
            action: "UPDATE",
            entityType: "Customer",
            entityId: id,
            previousValue: { fullName: before.fullName, phone: before.phone },
            newValue: { fullName: customer.fullName, phone: customer.phone },
        });
        return customer;
    }
    async deactivate(id, actingUserId) {
        await this.findOne(id);
        const customer = await this.prisma.customer.update({
            where: { id },
            data: { status: "INACTIVE" },
        });
        await this.audit.log({
            userId: actingUserId,
            action: "DEACTIVATE",
            entityType: "Customer",
            entityId: id,
        });
        return customer;
    }
    async reactivate(id, actingUserId) {
        await this.findOne(id);
        const customer = await this.prisma.customer.update({
            where: { id },
            data: { status: "ACTIVE" },
        });
        await this.audit.log({
            userId: actingUserId,
            action: "REACTIVATE",
            entityType: "Customer",
            entityId: id,
        });
        return customer;
    }
};
exports.CustomersService = CustomersService;
exports.CustomersService = CustomersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], CustomersService);
