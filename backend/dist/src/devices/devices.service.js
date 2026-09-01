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
exports.DevicesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
let DevicesService = class DevicesService {
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async create(dto, actingUserId) {
        const customer = await this.prisma.customer.findUnique({
            where: { id: dto.customerId },
        });
        if (!customer) {
            throw new common_1.NotFoundException("El cliente indicado no existe");
        }
        const device = await this.prisma.device.create({
            data: dto,
            include: { deviceType: true, brand: true },
        });
        await this.audit.log({
            userId: actingUserId,
            action: "CREATE",
            entityType: "Device",
            entityId: device.id,
            newValue: { customerId: device.customerId, serialNumber: device.serialNumber },
        });
        return device;
    }
    findByCustomer(customerId) {
        return this.prisma.device.findMany({
            where: { customerId, status: "ACTIVE" },
            include: { deviceType: true, brand: true },
            orderBy: { createdAt: "desc" },
        });
    }
    /**
     * Busca por número de serie sin importar el cliente — útil en recepción
     * para detectar si un equipo ya pasó antes por el taller (a veces bajo
     * otro cliente: reventa, préstamo, error de captura del nombre).
     */
    async findBySerial(serialNumber) {
        return this.prisma.device.findMany({
            where: { serialNumber, status: "ACTIVE" },
            include: { customer: { select: { id: true, fullName: true, phone: true } } },
        });
    }
    async findOne(id) {
        const device = await this.prisma.device.findUnique({
            where: { id },
            include: {
                deviceType: true,
                brand: true,
                customer: { select: { id: true, fullName: true, phone: true } },
                // El historial de reparaciones de este equipo (Regla 6) se llena a
                // partir de la Fase 4, cuando exista el módulo de recepción; la
                // relación ya está lista para traerlo apenas haya datos.
                repairOrders: {
                    select: { id: true, orderCode: true, status: true, entryDate: true },
                    orderBy: { entryDate: "desc" },
                },
            },
        });
        if (!device) {
            throw new common_1.NotFoundException("Equipo no encontrado");
        }
        return device;
    }
    async update(id, dto, actingUserId) {
        await this.findOne(id);
        const device = await this.prisma.device.update({
            where: { id },
            data: dto,
            include: { deviceType: true, brand: true },
        });
        await this.audit.log({
            userId: actingUserId,
            action: "UPDATE",
            entityType: "Device",
            entityId: id,
            newValue: dto,
        });
        return device;
    }
    async deactivate(id, actingUserId) {
        await this.findOne(id);
        const device = await this.prisma.device.update({
            where: { id },
            data: { status: "INACTIVE" },
        });
        await this.audit.log({
            userId: actingUserId,
            action: "DEACTIVATE",
            entityType: "Device",
            entityId: id,
        });
        return device;
    }
};
exports.DevicesService = DevicesService;
exports.DevicesService = DevicesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], DevicesService);
