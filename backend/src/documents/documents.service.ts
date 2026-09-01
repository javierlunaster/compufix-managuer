import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { RepairOrdersService } from "../repair-orders/repair-orders.service";
import { PdfBuilder } from "../common/pdf/pdf-builder.util";
import { formatCurrency, formatDate, formatDateTime } from "../common/utils/format.util";
import { REPAIR_STATUS_LABELS } from "../common/utils/repair-status-labels.util";

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private repairOrders: RepairOrdersService,
  ) {}

  /**
   * El botón "GENERAR INFORME TÉCNICO" de la sección 24 del brief. Reutiliza
   * RepairOrdersService.findOne() —el mismo expediente técnico que ya arma
   * el backend desde la Fase 4 en adelante— en vez de escribir de nuevo las
   * consultas de diagnósticos, bitácora, repuestos y garantías.
   */
  async generateTechnicalReport(orderId: number, actingUserId: number) {
    const order = await this.repairOrders.findOne(orderId);

    const pdf = new PdfBuilder();
    pdf.header({
      docTitle: "Informe técnico",
      docSubtitle: `Orden ${order.orderCode} · Generado el ${formatDateTime(new Date())}`,
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
        if (summary) pdf.paragraph(summary);

        if (d.measurements.length > 0) {
          pdf.table(
            ["Punto", "Esperado", "Medido", "Unidad", "Estado"],
            d.measurements.map((m) => [
              m.pointName,
              m.expectedValue ?? "—",
              m.measuredValue ?? "—",
              m.unit ?? "",
              m.status ?? "—",
            ]),
          );
        }
        if (d.result) pdf.paragraph(`Resultado del diagnóstico: ${d.result}`);
      }
    }

    if (order.procedures.length > 0 || order.logs.length > 0) {
      pdf.sectionTitle("Procedimientos realizados");
      const rows = [
        ...order.procedures.map((p) => [formatDate(p.performedAt), p.description]),
        ...order.logs.map((l) => [formatDate(l.date), [l.procedure, l.result].filter(Boolean).join(" -- ")]),
      ].sort((a, b) => a[0].localeCompare(b[0]));
      pdf.table(["Fecha", "Procedimiento"], rows, [100, 400]);
    }

    if (order.partsUsed.length > 0) {
      pdf.sectionTitle("Repuestos utilizados");
      pdf.table(
        ["Producto", "Cantidad", "Precio"],
        order.partsUsed.map((p) => [p.product.description, String(p.quantity), formatCurrency(p.unitPrice)]),
      );
    }

    // El schema no tiene un campo dedicado de "recomendaciones" (sección 24
    // del brief lo pide, pero no se modeló como columna propia — ver README
    // de esta fase). Se usa el resultado del último diagnóstico y las notas
    // generales de la orden como la aproximación más honesta disponible.
    const lastDiagnostic = order.diagnostics[0];
    pdf
      .sectionTitle("Resultado y recomendaciones")
      .paragraph(
        [lastDiagnostic?.result, order.notes].filter(Boolean).join(" — ") ||
          "Sin observaciones adicionales.",
      );

    pdf.sectionTitle("Garantía");
    if (order.warranties.length > 0) {
      const w = order.warranties[0];
      pdf.keyValueGrid([
        ["Cobertura", w.coverageDescription],
        ["Vigente hasta", formatDate(w.warrantyEndDate)],
      ]);
    } else {
      pdf.paragraph("Sin garantía registrada para esta orden.");
    }

    pdf.spacer(30);
    pdf.keyValueGrid([
      ["Técnico responsable", order.technician?.fullName],
      ["Estado final", REPAIR_STATUS_LABELS[order.status]],
      ["Fecha del informe", formatDate(new Date())],
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
  async generateIntakeReceipt(orderId: number) {
    const order = await this.repairOrders.findOne(orderId);

    const pdf = new PdfBuilder();
    pdf.header({
      docTitle: "Comprobante de ingreso",
      docSubtitle: `Orden ${order.orderCode} · ${formatDate(order.entryDate)}`,
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

    pdf.sectionTitle("Accesorios recibidos").paragraph(
      [
        order.chargerReceived && "Cargador",
        order.batteryReceived && "Batería",
        order.keyboardReceived && "Teclado",
        order.mouseReceived && "Mouse",
      ]
        .filter(Boolean)
        .join(", ") || "Ninguno",
    );

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
  async generateDeliveryReceipt(orderId: number) {
    const order = await this.repairOrders.findOne(orderId);

    const pdf = new PdfBuilder();
    pdf.header({
      docTitle: "Comprobante de entrega",
      docSubtitle: `Orden ${order.orderCode}`,
    });

    pdf.sectionTitle("Cliente y equipo").keyValueGrid([
      ["Cliente", order.customer.fullName],
      ["Equipo", `${order.device.brand?.name ?? ""} ${order.device.model ?? ""}`.trim()],
      ["Fecha de entrega", order.deliveryDate ? formatDate(order.deliveryDate) : formatDate(new Date())],
    ]);

    pdf.sectionTitle("Resumen financiero").keyValueGrid([
      ["Total", formatCurrency(order.totalValue)],
      ["Abonado", formatCurrency(order.paidAmount)],
      ["Saldo", formatCurrency(order.balance)],
    ]);

    pdf.sectionTitle("Garantía");
    if (order.warranties.length > 0) {
      const w = order.warranties[0];
      pdf.keyValueGrid([
        ["Cobertura", w.coverageDescription],
        ["Vigente hasta", formatDate(w.warrantyEndDate)],
      ]);
    } else {
      pdf.paragraph("Este servicio no incluye garantía registrada.");
    }

    pdf.spacer(40);
    pdf.signatureLine("Firma de recibido a satisfacción — Cliente");

    pdf.footer(`COMPufix Manager · Comprobante de entrega · Orden ${order.orderCode}`);

    const buffer = await pdf.build();
    return { buffer, filename: `comprobante-entrega-${order.orderCode}.pdf` };
  }

  /** Certificado de garantía imprimible (sección 17/23 del brief). */
  async generateWarrantyCertificate(warrantyId: number) {
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
      throw new NotFoundException("Garantía no encontrada");
    }

    const order = warranty.repairOrder;

    const pdf = new PdfBuilder();
    pdf.header({ docTitle: "Certificado de garantía", docSubtitle: `Orden ${order.orderCode}` });

    pdf.keyValueGrid([
      ["Cliente", order.customer.fullName],
      ["Equipo", `${order.device.brand?.name ?? ""} ${order.device.model ?? ""}`.trim()],
      ["Cobertura", warranty.coverageDescription],
      ["Inicio de garantía", formatDate(warranty.warrantyStartDate)],
      ["Vigente hasta", formatDate(warranty.warrantyEndDate)],
      ["Estado", { ACTIVE: "Vigente", EXPIRED: "Vencida", CLAIMED: "Reclamada" }[warranty.status]],
    ]);

    pdf.spacer(20).paragraph(
      "Esta garantía cubre exclusivamente el componente o servicio descrito arriba. " +
        "No cubre daños por mal uso, líquidos, caídas, o intervención de terceros no autorizados.",
    );

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
  async generateQuotationPdf(quotationId: number, actingUserId: number) {
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
      throw new NotFoundException("Cotización no encontrada");
    }

    const pdf = new PdfBuilder();
    pdf.header({
      docTitle: "Cotización",
      docSubtitle: `${quotation.quotationNumber} · ${formatDate(quotation.date)}`,
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
    pdf.table(
      ["Descripción", "Cant.", "Precio unit.", "Subtotal"],
      quotation.items.map((item) => [
        item.description,
        String(item.quantity),
        formatCurrency(item.unitPrice),
        formatCurrency(item.subtotal),
      ]),
      [260, 50, 90, 90],
    );

    pdf.spacer(10);
    pdf.keyValueGrid([
      ["Subtotal", formatCurrency(quotation.subtotal)],
      ["Descuento", formatCurrency(quotation.discount)],
    ]);
    pdf.keyValueGrid([
      ["Impuesto", formatCurrency(quotation.tax)],
      ["Envío", formatCurrency(quotation.shipping)],
    ]);

    pdf.spacer(10);
    pdf.doc.fontSize(14).fillColor("#111827").text(`Total: ${formatCurrency(quotation.total)}`, {
      align: "right",
    });

    if (quotation.validUntil) {
      pdf
        .spacer(15)
        .paragraph(`Esta cotización es válida hasta el ${formatDate(quotation.validUntil)}.`);
    }
    if (quotation.notes) {
      pdf.sectionTitle("Observaciones").paragraph(quotation.notes);
    }

    pdf.spacer(30);
    pdf.paragraph(
      "Precios sujetos a disponibilidad de repuestos al momento de la aprobación. " +
        "Para aprobar esta cotización, comunícate con el taller.",
    );

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
}
