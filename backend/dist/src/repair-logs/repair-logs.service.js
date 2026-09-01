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
exports.RepairLogsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
let RepairLogsService = class RepairLogsService {
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async ensureOrderExists(orderId) {
        const order = await this.prisma.repairOrder.findUnique({ where: { id: orderId } });
        if (!order) {
            throw new common_1.NotFoundException("Orden de reparación no encontrada");
        }
        return order;
    }
    /**
     * Una orden puede tener múltiples entradas de bitácora (Regla 3 del
     * brief). Cada entrada es un renglón cronológico: qué se hizo, qué se
     * midió, en qué componente, con qué resultado — el ejemplo de la sección
     * 9 del brief (medición de señales → sin PLTRST ni PCH_PWROK →
     * reprogramación BIOS → sin cambio) es literalmente una secuencia de
     * entradas como estas.
     */
    async create(orderId, dto, actingUserId) {
        await this.ensureOrderExists(orderId);
        const log = await this.prisma.repairLog.create({
            data: {
                repairOrderId: orderId,
                technicianId: dto.technicianId ?? actingUserId,
                date: dto.date ? new Date(dto.date) : undefined,
                procedure: dto.procedure,
                measurement: dto.measurement,
                component: dto.component,
                reference: dto.reference,
                result: dto.result,
                notes: dto.notes,
            },
        });
        await this.audit.log({
            userId: actingUserId,
            action: "CREATE",
            entityType: "RepairLog",
            entityId: log.id,
            newValue: { repairOrderId: orderId },
        });
        return log;
    }
    findAllForOrder(orderId) {
        return this.prisma.repairLog.findMany({
            where: { repairOrderId: orderId },
            include: {
                technician: { select: { id: true, fullName: true } },
                photos: { orderBy: { uploadedAt: "asc" } },
            },
            orderBy: { date: "asc" }, // cronológico, tal como pide la sección 9
        });
    }
    async findOne(id) {
        const log = await this.prisma.repairLog.findUnique({
            where: { id },
            include: { technician: { select: { id: true, fullName: true } } },
        });
        if (!log) {
            throw new common_1.NotFoundException("Entrada de bitácora no encontrada");
        }
        return log;
    }
    /**
     * No existe endpoint de borrado a propósito: la bitácora es información
     * histórica importante (Regla 1). Si una entrada se capturó mal, se
     * corrige por edición (queda auditado el cambio), nunca desaparece.
     */
    async update(id, dto, actingUserId) {
        const before = await this.findOne(id);
        const log = await this.prisma.repairLog.update({
            where: { id },
            data: {
                ...dto,
                date: dto.date ? new Date(dto.date) : undefined,
            },
        });
        await this.audit.log({
            userId: actingUserId,
            action: "UPDATE",
            entityType: "RepairLog",
            entityId: id,
            previousValue: { result: before.result, notes: before.notes },
            newValue: dto,
        });
        return log;
    }
};
exports.RepairLogsService = RepairLogsService;
exports.RepairLogsService = RepairLogsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], RepairLogsService);
