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
exports.ServicesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
let ServicesService = class ServicesService {
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async create(dto, actingUserId) {
        if (dto.code) {
            const existing = await this.prisma.service.findUnique({ where: { code: dto.code } });
            if (existing) {
                throw new common_1.ConflictException("Ya existe un servicio con ese código");
            }
        }
        const service = await this.prisma.service.create({ data: dto });
        await this.audit.log({
            userId: actingUserId,
            action: "CREATE",
            entityType: "Service",
            entityId: service.id,
            newValue: { code: service.code, name: service.name },
        });
        return service;
    }
    findAll(search) {
        return this.prisma.service.findMany({
            where: {
                status: "ACTIVE",
                ...(search
                    ? {
                        OR: [
                            { name: { contains: search, mode: "insensitive" } },
                            { code: { contains: search, mode: "insensitive" } },
                        ],
                    }
                    : {}),
            },
            orderBy: { name: "asc" },
        });
    }
    async findOne(id) {
        const service = await this.prisma.service.findUnique({ where: { id } });
        if (!service) {
            throw new common_1.NotFoundException("Servicio no encontrado");
        }
        return service;
    }
    async update(id, dto, actingUserId) {
        await this.findOne(id);
        const service = await this.prisma.service.update({ where: { id }, data: dto });
        await this.audit.log({
            userId: actingUserId,
            action: "UPDATE",
            entityType: "Service",
            entityId: id,
            newValue: dto,
        });
        return service;
    }
    async deactivate(id, actingUserId) {
        await this.findOne(id);
        const service = await this.prisma.service.update({
            where: { id },
            data: { status: "INACTIVE" },
        });
        await this.audit.log({
            userId: actingUserId,
            action: "DEACTIVATE",
            entityType: "Service",
            entityId: id,
        });
        return service;
    }
    async reactivate(id, actingUserId) {
        await this.findOne(id);
        const service = await this.prisma.service.update({
            where: { id },
            data: { status: "ACTIVE" },
        });
        await this.audit.log({
            userId: actingUserId,
            action: "REACTIVATE",
            entityType: "Service",
            entityId: id,
        });
        return service;
    }
};
exports.ServicesService = ServicesService;
exports.ServicesService = ServicesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], ServicesService);
