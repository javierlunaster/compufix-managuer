"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttachmentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const multer_config_1 = require("./multer.config");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let AttachmentsService = class AttachmentsService {
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
     * Fotos generales de la orden (ej. estado físico del equipo al recibirlo
     * — sección 6/22 del brief). `repairLogId` queda en null a propósito:
     * es lo que distingue "foto general de la orden" de "foto de un paso
     * puntual de la bitácora" al consultarlas después.
     */
    async uploadForOrder(orderId, files, dto, actingUserId) {
        await this.ensureOrderExists(orderId);
        return this.saveFiles(files, { repairOrderId: orderId }, dto, actingUserId);
    }
    /**
     * Fotos de una entrada de bitácora puntual. Se guarda también
     * `repairOrderId` (no solo `repairLogId`) para que la foto siga
     * apareciendo si alguna vez se consulta la galería completa de la orden
     * sin filtrar por log — una foto de un paso de la reparación sigue
     * siendo, a fin de cuentas, una foto de esa orden.
     */
    async uploadForLog(orderId, logId, files, dto, actingUserId) {
        const log = await this.prisma.repairLog.findUnique({ where: { id: logId } });
        if (!log || log.repairOrderId !== orderId) {
            throw new common_1.NotFoundException("Entrada de bitácora no encontrada en esta orden");
        }
        return this.saveFiles(files, { repairOrderId: orderId, repairLogId: logId }, dto, actingUserId);
    }
    async saveFiles(files, ids, dto, actingUserId) {
        if (!files || files.length === 0) {
            throw new common_1.BadRequestException("Sube al menos una foto");
        }
        const created = await this.prisma.$transaction(files.map((file) => this.prisma.attachment.create({
            data: {
                repairOrderId: ids.repairOrderId,
                repairLogId: ids.repairLogId,
                diagnosticId: ids.diagnosticId,
                fileUrl: `/uploads/${file.filename}`,
                fileType: file.mimetype,
                category: dto.category,
                description: dto.description,
                uploadedById: actingUserId,
            },
        })));
        await this.audit.log({
            userId: actingUserId,
            action: "UPLOAD",
            entityType: "Attachment",
            entityId: ids.repairOrderId,
            newValue: { count: created.length, repairLogId: ids.repairLogId },
        });
        return created;
    }
    /**
     * Fotos de un diagnóstico puntual: evidencia del trabajo realizado y el
     * estado final del equipo. A diferencia de las de bitácora, estas SÍ
     * llegan al portal del cliente (ver customer-portal.service.ts, que
     * solo excluye las ligadas a un log) — son justo el tipo de foto que
     * un cliente esperaría ver: qué se hizo y cómo quedó.
     */
    async uploadForDiagnostic(orderId, diagnosticId, files, dto, actingUserId) {
        const diagnostic = await this.prisma.repairDiagnostic.findUnique({ where: { id: diagnosticId } });
        if (!diagnostic || diagnostic.repairOrderId !== orderId) {
            throw new common_1.NotFoundException("Diagnóstico no encontrado en esta orden");
        }
        return this.saveFiles(files, { repairOrderId: orderId, diagnosticId }, dto, actingUserId);
    }
    findGeneralPhotosForOrder(orderId) {
        return this.prisma.attachment.findMany({
            // Ni de bitácora ni de un diagnóstico puntual — esas ya se ven
            // dentro de su propia entrada/tarjeta; esta galería es solo para
            // fotos que no pertenecen a ningún paso específico (ej. estado del
            // equipo al recibirlo).
            where: { repairOrderId: orderId, repairLogId: null, diagnosticId: null },
            orderBy: { uploadedAt: "desc" },
            include: { uploadedBy: { select: { id: true, fullName: true } } },
        });
    }
    /**
     * Borrado físico del archivo Y del registro — a diferencia de casi todo
     * el resto del sistema, una foto subida por error (desenfocada, del
     * equipo equivocado) no tiene valor histórico que preservar. Se elimina
     * también el archivo en disco para no dejar basura acumulándose.
     */
    async remove(attachmentId, actingUserId) {
        const attachment = await this.prisma.attachment.findUnique({ where: { id: attachmentId } });
        if (!attachment) {
            throw new common_1.NotFoundException("Foto no encontrada");
        }
        await this.prisma.attachment.delete({ where: { id: attachmentId } });
        const filePath = path.join(multer_config_1.UPLOADS_DIR, path.basename(attachment.fileUrl));
        fs.unlink(filePath, () => {
            // Si el archivo ya no existe en disco por algún motivo, no hay nada
            // más que hacer — el registro en base de datos ya se borró, que es
            // lo que importa para que deje de aparecer en la interfaz.
        });
        await this.audit.log({
            userId: actingUserId,
            action: "DELETE",
            entityType: "Attachment",
            entityId: attachmentId,
        });
        return { message: "Foto eliminada" };
    }
};
exports.AttachmentsService = AttachmentsService;
exports.AttachmentsService = AttachmentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], AttachmentsService);
