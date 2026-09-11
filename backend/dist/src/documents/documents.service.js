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
exports.DocumentsService = void 0;
const common_1 = require("@nestjs/common");
const path = __importStar(require("path"));
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const repair_orders_service_1 = require("../repair-orders/repair-orders.service");
const pdf_builder_util_1 = require("../common/pdf/pdf-builder.util");
const multer_config_1 = require("../attachments/multer.config");
const format_util_1 = require("../common/utils/format.util");
const repair_status_labels_util_1 = require("../common/utils/repair-status-labels.util");
let DocumentsService = class DocumentsService {
    constructor(prisma, audit, repairOrders) {
        this.prisma = prisma;
        this.audit = audit;
        this.repairOrders = repairOrders;
    }
    /**
     * El botón "GENERAR INFORME TÉCNICO" de la sección 24 del brief. Reutiliza
     * RepairOrdersService.findOne() —el mismo expediente técnico que ya arma
     * el backend desde la Fase 4 en adelante— en vez de escribir de nuevo las
     * consultas de diagnósticos, bitácora, repuestos y garantías.
     */
    async generateTechnicalReport(orderId, actingUserId) {
        const order = await this.repairOrders.findOne(orderId);
        const pdf = new pdf_builder_util_1.PdfBuilder();
        pdf.header({
            docTitle: "Informe técnico",
            docSubtitle: `Orden ${order.orderCode} · Generado el ${(0, format_util_1.formatDateTime)(new Date())}`,
        });
        pdf.sectionTitle("Datos del cliente").keyValueGrid([
            ["Cliente", order.customer.fullName],
            ["Teléfono", order.customer.phone],
            ["Documento", order.customer.documentId],
        ]);
        pdf.sectionTitle("Datos del equipo").keyValueGrid([
            ["Tipo", order.device.deviceType?.name],
            ["Marca / Modelo", `${order.device.brand?.name ?? ""} ${order.device.model ?? ""}`.trim()],
            ["Número de serie", order.device.serialNumber],
            ["Código de orden", order.orderCode],
        ]);
        pdf.sectionTitle("Síntoma reportado por el cliente").paragraph(order.reportedIssue);
        if (order.diagnostics.length > 0) {
            pdf.sectionTitle("Diagnóstico");
            for (const d of order.diagnostics) {
                const summary = [
                    d.boardReference ? `Placa: ${d.boardReference}` : null,
                    d.initialSymptom ? `Síntoma inicial: ${d.initialSymptom}` : null,
                    d.componentSuspected ? `Componente sospechoso: ${d.componentSuspected}` : null,
                    d.componentReplaced ? `Componente reemplazado: ${d.componentReplaced}` : null,
                ]
                    .filter(Boolean)
                    .join(" · ");
                if (summary)
                    pdf.paragraph(summary);
                if (d.measurements.length > 0) {
                    pdf.table(["Punto", "Esperado", "Medido", "Unidad", "Estado"], d.measurements.map((m) => [
                        m.pointName,
                        m.expectedValue ?? "—",
                        m.measuredValue ?? "—",
                        m.unit ?? "",
                        m.status ?? "—",
                    ]));
                }
                if (d.result)
                    pdf.paragraph(`Resultado del diagnóstico: ${d.result}`);
                // Las fotos subidas desde la pestaña Diagnóstico ("trabajo
                // realizado y estado final") nunca se estaban incluyendo aquí —
                // solo las de las dos galerías de la pestaña Información
                // (estado de ingreso/entrega). Se agregan junto a su propio
                // diagnóstico, no en una sección aparte, porque documentan
                // específicamente ese paso técnico.
                if (d.photos.length > 0) {
                    pdf.photoGrid(d.photos.map((p) => ({
                        path: path.join(multer_config_1.UPLOADS_DIR, path.basename(p.fileUrl)),
                        caption: (0, format_util_1.formatDate)(p.uploadedAt),
                    })));
                }
            }
        }
        if (order.procedures.length > 0 || order.logs.length > 0) {
            pdf.sectionTitle("Procedimientos realizados");
            const rows = [
                ...order.procedures.map((p) => [(0, format_util_1.formatDate)(p.performedAt), p.description]),
                ...order.logs.map((l) => [(0, format_util_1.formatDate)(l.date), [l.procedure, l.result].filter(Boolean).join(" -- ")]),
            ].sort((a, b) => a[0].localeCompare(b[0]));
            pdf.table(["Fecha", "Procedimiento"], rows, [100, 400]);
        }
        if (order.partsUsed.length > 0) {
            pdf.sectionTitle("Repuestos utilizados");
            pdf.table(["Producto", "Cantidad", "Precio"], order.partsUsed.map((p) => [p.product.description, String(p.quantity), (0, format_util_1.formatCurrency)(p.unitPrice)]));
        }
        // El schema no tiene un campo dedicado de "recomendaciones" (sección 24
        // del brief lo pide, pero no se modeló como columna propia — ver README
        // de esta fase). Antes esta sección repetía el resultado del último
        // diagnóstico, que YA se imprime arriba dentro de "Diagnóstico" — el
        // mismo párrafo aparecía dos veces con encabezados distintos. Ahora
        // solo muestra las notas generales de la orden (Editar información →
        // "Notas generales"), que es información realmente distinta al
        // resultado técnico del diagnóstico.
        pdf
            .sectionTitle("Recomendaciones y notas generales")
            .paragraph(order.notes || "Sin observaciones adicionales.");
        // Evidencia fotográfica: separada en dos momentos distintos porque
        // responde a la pregunta que motivó esta sección — dejar constancia
        // de en qué estado llegó el equipo (protege al taller de un reclamo
        // por un daño previo) y en qué estado se entrega (protege al cliente,
        // confirma que el trabajo se hizo). "equipo_recibido" y sin categoría
        // (fotos subidas antes de esta separación) cuentan como ingreso.
        const intakePhotos = order.photos.filter((p) => p.category !== "resultado_final");
        const deliveryPhotos = order.photos.filter((p) => p.category === "resultado_final");
        if (intakePhotos.length > 0) {
            pdf.sectionTitle("Evidencia fotográfica — estado de ingreso");
            pdf.photoGrid(intakePhotos.map((p) => ({
                path: path.join(multer_config_1.UPLOADS_DIR, path.basename(p.fileUrl)),
                caption: (0, format_util_1.formatDate)(p.uploadedAt),
            })));
        }
        if (deliveryPhotos.length > 0) {
            pdf.sectionTitle("Evidencia fotográfica — estado de entrega");
            pdf.photoGrid(deliveryPhotos.map((p) => ({
                path: path.join(multer_config_1.UPLOADS_DIR, path.basename(p.fileUrl)),
                caption: (0, format_util_1.formatDate)(p.uploadedAt),
            })));
        }
        pdf.sectionTitle("Garantía");
        if (order.warranties.length > 0) {
            const w = order.warranties[0];
            pdf.keyValueGrid([
                ["Cobertura", w.coverageDescription],
                ["Vigente hasta", (0, format_util_1.formatDate)(w.warrantyEndDate)],
            ]);
        }
        else {
            pdf.paragraph("Sin garantía registrada para esta orden.");
        }
        pdf.spacer(30);
        pdf.keyValueGrid([
            ["Técnico responsable", order.technician?.fullName],
            ["Estado final", repair_status_labels_util_1.REPAIR_STATUS_LABELS[order.status]],
            ["Fecha del informe", (0, format_util_1.formatDate)(new Date())],
        ]);
        pdf.signatureLine("Firma del técnico responsable");
        pdf.footer(`COMPufix Manager · Informe técnico · Orden ${order.orderCode}`);
        const buffer = await pdf.build();
        await this.audit.log({
            userId: actingUserId,
            action: "GENERATE_TECHNICAL_REPORT",
            entityType: "RepairOrder",
            entityId: orderId,
        });
        return { buffer, filename: `informe-tecnico-${order.orderCode}.pdf` };
    }
    /** Comprobante de ingreso (sección 6/23 del brief). */
    async generateIntakeReceipt(orderId) {
        const order = await this.repairOrders.findOne(orderId);
        const pdf = new pdf_builder_util_1.PdfBuilder();
        pdf.header({
            docTitle: "Comprobante de ingreso",
            docSubtitle: `Orden ${order.orderCode} · ${(0, format_util_1.formatDate)(order.entryDate)}`,
        });
        pdf.sectionTitle("Cliente").keyValueGrid([
            ["Nombre", order.customer.fullName],
            ["Teléfono", order.customer.phone],
        ]);
        pdf.sectionTitle("Equipo").keyValueGrid([
            ["Tipo", order.device.deviceType?.name],
            ["Marca / Modelo", `${order.device.brand?.name ?? ""} ${order.device.model ?? ""}`.trim()],
            ["Serial", order.device.serialNumber],
            ["Estado físico", order.physicalCondition],
        ]);
        pdf.sectionTitle("Accesorios recibidos").paragraph([
            order.chargerReceived && "Cargador",
            order.batteryReceived && "Batería",
            order.keyboardReceived && "Teclado",
            order.mouseReceived && "Mouse",
        ]
            .filter(Boolean)
            .join(", ") || "Ninguno");
        pdf.sectionTitle("Falla reportada").paragraph(order.reportedIssue);
        // La contraseña del equipo NUNCA aparece en un documento impreso — es
        // un dato sensible (sección 32 del brief) que solo se consulta desde
        // el endpoint restringido de la Fase 4, nunca se exporta a papel.
        pdf.spacer(40);
        pdf.signatureLine("Firma del cliente");
        pdf.signatureLine("Recibido por (taller)");
        pdf.footer(`COMPufix Manager · Comprobante de ingreso · Orden ${order.orderCode}`);
        const buffer = await pdf.build();
        return { buffer, filename: `comprobante-ingreso-${order.orderCode}.pdf` };
    }
    /** Comprobante de entrega (sección 23 del brief). */
    async generateDeliveryReceipt(orderId) {
        const order = await this.repairOrders.findOne(orderId);
        const pdf = new pdf_builder_util_1.PdfBuilder();
        pdf.header({
            docTitle: "Comprobante de entrega",
            docSubtitle: `Orden ${order.orderCode}`,
        });
        pdf.sectionTitle("Cliente y equipo").keyValueGrid([
            ["Cliente", order.customer.fullName],
            ["Equipo", `${order.device.brand?.name ?? ""} ${order.device.model ?? ""}`.trim()],
            ["Fecha de entrega", order.deliveryDate ? (0, format_util_1.formatDate)(order.deliveryDate) : (0, format_util_1.formatDate)(new Date())],
        ]);
        pdf.sectionTitle("Resumen financiero").keyValueGrid([
            ["Total", (0, format_util_1.formatCurrency)(order.totalValue)],
            ["Abonado", (0, format_util_1.formatCurrency)(order.paidAmount)],
            ["Saldo", (0, format_util_1.formatCurrency)(order.balance)],
        ]);
        pdf.sectionTitle("Garantía");
        if (order.warranties.length > 0) {
            const w = order.warranties[0];
            pdf.keyValueGrid([
                ["Cobertura", w.coverageDescription],
                ["Vigente hasta", (0, format_util_1.formatDate)(w.warrantyEndDate)],
            ]);
        }
        else {
            pdf.paragraph("Este servicio no incluye garantía registrada.");
        }
        pdf.spacer(40);
        pdf.signatureLine("Firma de recibido a satisfacción — Cliente");
        pdf.footer(`COMPufix Manager · Comprobante de entrega · Orden ${order.orderCode}`);
        const buffer = await pdf.build();
        return { buffer, filename: `comprobante-entrega-${order.orderCode}.pdf` };
    }
    /** Certificado de garantía imprimible (sección 17/23 del brief). */
    async generateWarrantyCertificate(warrantyId) {
        const warranty = await this.prisma.warranty.findUnique({
            where: { id: warrantyId },
            include: {
                repairOrder: {
                    include: {
                        customer: true,
                        device: { include: { brand: true, deviceType: true } },
                    },
                },
            },
        });
        if (!warranty) {
            throw new common_1.NotFoundException("Garantía no encontrada");
        }
        const order = warranty.repairOrder;
        const pdf = new pdf_builder_util_1.PdfBuilder();
        pdf.header({ docTitle: "Certificado de garantía", docSubtitle: `Orden ${order.orderCode}` });
        pdf.keyValueGrid([
            ["Cliente", order.customer.fullName],
            ["Equipo", `${order.device.brand?.name ?? ""} ${order.device.model ?? ""}`.trim()],
            ["Cobertura", warranty.coverageDescription],
            ["Inicio de garantía", (0, format_util_1.formatDate)(warranty.warrantyStartDate)],
            ["Vigente hasta", (0, format_util_1.formatDate)(warranty.warrantyEndDate)],
            ["Estado", { ACTIVE: "Vigente", EXPIRED: "Vencida", CLAIMED: "Reclamada" }[warranty.status]],
        ]);
        pdf.spacer(20).paragraph("Esta garantía cubre exclusivamente el componente o servicio descrito arriba. " +
            "No cubre daños por mal uso, líquidos, caídas, o intervención de terceros no autorizados.");
        pdf.footer(`COMPufix Manager · Certificado de garantía · Orden ${order.orderCode}`);
        const buffer = await pdf.build();
        return { buffer, filename: `garantia-${order.orderCode}.pdf` };
    }
    /**
     * Cotización lista para enviar al cliente (sección 10/23 del brief).
     * A diferencia de los demás documentos de esta fase, no reutiliza
     * RepairOrdersService — la cotización es su propia entidad (Fase 7),
     * así que se consulta directo con Prisma con el detalle que hace falta
     * para el documento (cliente, orden de origen si existe, ítems).
     */
    async generateQuotationPdf(quotationId, actingUserId) {
        const quotation = await this.prisma.customerQuotation.findUnique({
            where: { id: quotationId },
            include: {
                customer: true,
                sourceOrder: { select: { orderCode: true, device: { include: { brand: true } } } },
                items: {
                    include: {
                        product: { select: { description: true } },
                        service: { select: { name: true } },
                    },
                },
            },
        });
        if (!quotation) {
            throw new common_1.NotFoundException("Cotización no encontrada");
        }
        const pdf = new pdf_builder_util_1.PdfBuilder();
        pdf.header({
            docTitle: "Cotización",
            docSubtitle: `${quotation.quotationNumber} · ${(0, format_util_1.formatDate)(quotation.date)}`,
        });
        pdf.sectionTitle("Cliente").keyValueGrid([
            ["Nombre", quotation.customer.fullName],
            ["Teléfono", quotation.customer.phone],
        ]);
        if (quotation.sourceOrder) {
            pdf.sectionTitle("Equipo").keyValueGrid([
                ["Orden de reparación", quotation.sourceOrder.orderCode],
                ["Equipo", `${quotation.sourceOrder.device.brand?.name ?? ""} ${quotation.sourceOrder.device.model ?? ""}`.trim()],
            ]);
        }
        pdf.sectionTitle("Detalle");
        pdf.table(["Descripción", "Cant.", "Precio unit.", "Subtotal"], quotation.items.map((item) => [
            item.description,
            String(item.quantity),
            (0, format_util_1.formatCurrency)(item.unitPrice),
            (0, format_util_1.formatCurrency)(item.subtotal),
        ]), [260, 50, 90, 90]);
        pdf.spacer(10);
        pdf.keyValueGrid([
            ["Subtotal", (0, format_util_1.formatCurrency)(quotation.subtotal)],
            ["Descuento", (0, format_util_1.formatCurrency)(quotation.discount)],
        ]);
        pdf.keyValueGrid([
            ["Impuesto", (0, format_util_1.formatCurrency)(quotation.tax)],
            ["Envío", (0, format_util_1.formatCurrency)(quotation.shipping)],
        ]);
        pdf.spacer(10);
        pdf.doc.fontSize(14).fillColor("#111827").text(`Total: ${(0, format_util_1.formatCurrency)(quotation.total)}`, {
            align: "right",
        });
        if (quotation.validUntil) {
            pdf
                .spacer(15)
                .paragraph(`Esta cotización es válida hasta el ${(0, format_util_1.formatDate)(quotation.validUntil)}.`);
        }
        if (quotation.notes) {
            pdf.sectionTitle("Observaciones").paragraph(quotation.notes);
        }
        pdf.spacer(30);
        pdf.paragraph("Precios sujetos a disponibilidad de repuestos al momento de la aprobación. " +
            "Para aprobar esta cotización, comunícate con el taller.");
        pdf.footer(`COMPufix Manager · Cotización ${quotation.quotationNumber}`);
        const buffer = await pdf.build();
        await this.audit.log({
            userId: actingUserId,
            action: "GENERATE_QUOTATION_PDF",
            entityType: "CustomerQuotation",
            entityId: quotationId,
        });
        return { buffer, filename: `cotizacion-${quotation.quotationNumber}.pdf` };
    }
};
exports.DocumentsService = DocumentsService;
exports.DocumentsService = DocumentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        repair_orders_service_1.RepairOrdersService])
], DocumentsService);
