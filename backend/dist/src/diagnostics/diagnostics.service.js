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
exports.DiagnosticsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
let DiagnosticsService = class DiagnosticsService {
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
     * Una orden puede tener MÚLTIPLES diagnósticos (Regla 3 del brief): por
     * ejemplo, un primer diagnóstico que concluye "posible falla de fuente" y,
     * tras reemplazar el componente, un segundo diagnóstico de verificación.
     * No hay límite ni se reemplaza el anterior.
     */
    async create(orderId, dto, actingUserId) {
        await this.ensureOrderExists(orderId);
        const diagnostic = await this.prisma.repairDiagnostic.create({
            data: {
                repairOrderId: orderId,
                technicianId: dto.technicianId ?? actingUserId,
                boardReference: dto.boardReference,
                chargerIc: dto.chargerIc,
                initialSymptom: dto.initialSymptom,
                componentSuspected: dto.componentSuspected,
                componentReplaced: dto.componentReplaced,
                biosReprogrammed: dto.biosReprogrammed ?? false,
                ecReviewed: dto.ecReviewed ?? false,
                ecReprogrammed: dto.ecReprogrammed ?? false,
                proceduresPerformed: dto.proceduresPerformed,
                result: dto.result,
            },
        });
        await this.audit.log({
            userId: actingUserId,
            action: "CREATE",
            entityType: "RepairDiagnostic",
            entityId: diagnostic.id,
            newValue: { repairOrderId: orderId },
        });
        return diagnostic;
    }
    findAllForOrder(orderId) {
        return this.prisma.repairDiagnostic.findMany({
            where: { repairOrderId: orderId },
            include: {
                measurements: true,
                technician: { select: { id: true, fullName: true } },
                photos: { orderBy: { uploadedAt: "asc" } },
            },
            orderBy: { createdAt: "desc" },
        });
    }
    async findOne(id) {
        const diagnostic = await this.prisma.repairDiagnostic.findUnique({
            where: { id },
            include: {
                measurements: true,
                technician: { select: { id: true, fullName: true } },
                photos: { orderBy: { uploadedAt: "asc" } },
            },
        });
        if (!diagnostic) {
            throw new common_1.NotFoundException("Diagnóstico no encontrado");
        }
        return diagnostic;
    }
    async update(id, dto, actingUserId) {
        await this.findOne(id);
        const diagnostic = await this.prisma.repairDiagnostic.update({
            where: { id },
            data: dto,
        });
        await this.audit.log({
            userId: actingUserId,
            action: "UPDATE",
            entityType: "RepairDiagnostic",
            entityId: id,
            newValue: dto,
        });
        return diagnostic;
    }
    // --- Mediciones (tabla libre de puntos, sección 8 del brief) -----------
    async addMeasurement(diagnosticId, dto, actingUserId) {
        await this.findOne(diagnosticId);
        const measurement = await this.prisma.diagnosticMeasurement.create({
            data: { diagnosticId, ...dto },
        });
        await this.audit.log({
            userId: actingUserId,
            action: "CREATE",
            entityType: "DiagnosticMeasurement",
            entityId: measurement.id,
            newValue: dto,
        });
        return measurement;
    }
    /**
     * Carga varias mediciones de una vez — útil cuando el técnico ya tiene
     * la tabla completa de puntos de una placa conocida y quiere registrarla
     * de un solo golpe en vez de fila por fila.
     */
    async bulkAddMeasurements(diagnosticId, dto, actingUserId) {
        await this.findOne(diagnosticId);
        const created = await this.prisma.$transaction(dto.measurements.map((m) => this.prisma.diagnosticMeasurement.create({
            data: { diagnosticId, ...m },
        })));
        await this.audit.log({
            userId: actingUserId,
            action: "BULK_CREATE",
            entityType: "DiagnosticMeasurement",
            entityId: diagnosticId,
            newValue: { count: created.length },
        });
        return created;
    }
    async updateMeasurement(measurementId, dto, actingUserId) {
        const existing = await this.prisma.diagnosticMeasurement.findUnique({
            where: { id: measurementId },
        });
        if (!existing) {
            throw new common_1.NotFoundException("Medición no encontrada");
        }
        const measurement = await this.prisma.diagnosticMeasurement.update({
            where: { id: measurementId },
            data: dto,
        });
        await this.audit.log({
            userId: actingUserId,
            action: "UPDATE",
            entityType: "DiagnosticMeasurement",
            entityId: measurementId,
            previousValue: { measuredValue: existing.measuredValue, status: existing.status },
            newValue: dto,
        });
        return measurement;
    }
    /**
     * Las mediciones sí se pueden borrar físicamente (a diferencia del resto
     * del sistema, Regla 1): son datos técnicos puntuales sin impacto
     * financiero ni legal, y el caso de uso real es corregir una fila
     * capturada por error durante la revisión. El borrado queda auditado.
     */
    async deleteMeasurement(measurementId, actingUserId) {
        const existing = await this.prisma.diagnosticMeasurement.findUnique({
            where: { id: measurementId },
        });
        if (!existing) {
            throw new common_1.NotFoundException("Medición no encontrada");
        }
        await this.prisma.diagnosticMeasurement.delete({ where: { id: measurementId } });
        await this.audit.log({
            userId: actingUserId,
            action: "DELETE",
            entityType: "DiagnosticMeasurement",
            entityId: measurementId,
            previousValue: existing,
        });
        return { message: "Medición eliminada" };
    }
};
exports.DiagnosticsService = DiagnosticsService;
exports.DiagnosticsService = DiagnosticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], DiagnosticsService);
