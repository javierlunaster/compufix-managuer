import { Injectable, NotFoundException } from "@nestjs/common";
import { HardwareTestCategory, HardwareTestStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { RepairOrdersService } from "../repair-orders/repair-orders.service";
import { BusinessSettingsService } from "../business-settings/business-settings.service";
import { PdfBuilder } from "../common/pdf/pdf-builder.util";
import { formatCurrency, formatDate, formatDateTime } from "../common/utils/format.util";
import { REPAIR_STATUS_LABELS } from "../common/utils/repair-status-labels.util";
import { numberToWordsEs } from "../common/utils/number-to-words.util";

const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

// "julio 22 del 2026" — el formato exacto que ya usaba el taller en sus
// cuentas de cobro en papel, distinto del "22 de julio de 2026" que usa
// formatDate() en el resto de los documentos.
function formatDateLongEs(value: string | Date): string {
  const d = new Date(value);
  return `${MONTHS_ES[d.getMonth()]} ${d.getDate()} del ${d.getFullYear()}`;
}

const HARDWARE_TEST_CATEGORY_LABELS: Record<HardwareTestCategory, string> = {
  KEYBOARD: "Teclado",
  CAMERA: "Cámara",
  SOUND: "Sonido",
  DISK: "Disco",
  PERIPHERALS: "Periféricos",
};

const HARDWARE_TEST_STATUS_LABELS: Record<HardwareTestStatus, string> = {
  PASSED: "Aprobado",
  FAILED: "Falla",
  NOT_APPLICABLE: "No aplica",
};

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private repairOrders: RepairOrdersService,
    private businessSettings: BusinessSettingsService,
  ) {}

  /**
   * `Attachment.fileUrl` es una URL pública de Supabase Storage (no una
   * ruta en disco — el filesystem del contenedor es efímero, ver
   * storage.service.ts), así que para imprimirla dentro de un PDF hay que
   * descargarla primero como Buffer; pdfkit's `.image()` acepta un Buffer
   * igual que una ruta de archivo. Un `null` de vuelta (descarga fallida,
   * URL caída) cae en el aviso de "no disponible para impresión" que ya
   * maneja PdfBuilder.photoGrid.
   */
  private async fetchPhotoBuffer(fileUrl: string): Promise<Buffer | null> {
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) return null;
      return Buffer.from(await response.arrayBuffer());
    } catch {
      return null;
    }
  }

  private async buildPhotoGridEntries(
    photos: { fileUrl: string; uploadedAt: Date }[],
  ): Promise<{ path: Buffer | null; caption: string }[]> {
    return Promise.all(
      photos.map(async (p) => ({
        path: await this.fetchPhotoBuffer(p.fileUrl),
        caption: formatDate(p.uploadedAt),
      })),
    );
  }

  /**
   * El botón "GENERAR INFORME TÉCNICO" de la sección 24 del brief. Reutiliza
   * RepairOrdersService.findOne() —el mismo expediente técnico que ya arma
   * el backend desde la Fase 4 en adelante— en vez de escribir de nuevo las
   * consultas de diagnósticos, bitácora, repuestos y garantías.
   */
  async generateTechnicalReport(orderId: number, actingUserId: number) {
    const order = await this.repairOrders.findOne(orderId);
    const branding = await this.businessSettings.getBrandingForDocuments();

    const pdf = new PdfBuilder();
    pdf.header({
      docTitle: "Informe técnico",
      docSubtitle: `Orden ${order.orderCode} · Generado el ${formatDateTime(new Date())}`,
      businessName: branding.businessName,
      businessTagline: branding.tagline,
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

        // Las fotos subidas desde la pestaña Diagnóstico ("trabajo
        // realizado y estado final") nunca se estaban incluyendo aquí —
        // solo las de las dos galerías de la pestaña Información
        // (estado de ingreso/entrega). Se agregan junto a su propio
        // diagnóstico, no en una sección aparte, porque documentan
        // específicamente ese paso técnico.
        if (d.photos.length > 0) {
          pdf.photoGrid(await this.buildPhotoGridEntries(d.photos));
        }
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
    // "prueba_camara" (evidencia de la pestaña Pruebas de entrega) tampoco
    // cuenta como estado de ingreso — se imprime aparte, junto a la tabla
    // de pruebas, en el comprobante de entrega.
    const intakePhotos = order.photos.filter(
      (p) => p.category !== "resultado_final" && p.category !== "prueba_camara",
    );
    const deliveryPhotos = order.photos.filter((p) => p.category === "resultado_final");

    if (intakePhotos.length > 0) {
      pdf.sectionTitle("Evidencia fotográfica — estado de ingreso");
      pdf.photoGrid(await this.buildPhotoGridEntries(intakePhotos));
    }

    if (deliveryPhotos.length > 0) {
      pdf.sectionTitle("Evidencia fotográfica — estado de entrega");
      pdf.photoGrid(await this.buildPhotoGridEntries(deliveryPhotos));
    }

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

    pdf.footer(`${branding.businessName} · Informe técnico · Orden ${order.orderCode}`);

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
    const branding = await this.businessSettings.getBrandingForDocuments();

    const pdf = new PdfBuilder();
    pdf.header({
      docTitle: "Comprobante de ingreso",
      docSubtitle: `Orden ${order.orderCode} · ${formatDate(order.entryDate)}`,
      businessName: branding.businessName,
      businessTagline: branding.tagline,
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

    pdf.footer(`${branding.businessName} · Comprobante de ingreso · Orden ${order.orderCode}`);

    const buffer = await pdf.build();
    return { buffer, filename: `comprobante-ingreso-${order.orderCode}.pdf` };
  }

  /** Comprobante de entrega (sección 23 del brief). */
  async generateDeliveryReceipt(orderId: number) {
    const order = await this.repairOrders.findOne(orderId);
    const branding = await this.businessSettings.getBrandingForDocuments();

    const pdf = new PdfBuilder();
    pdf.header({
      docTitle: "Comprobante de entrega",
      docSubtitle: `Orden ${order.orderCode}`,
      businessName: branding.businessName,
      businessTagline: branding.tagline,
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

    // Trabajo realizado: antes el comprobante de entrega no decía QUÉ se
    // hizo, solo cuánto costó — el cliente firmaba sin tener por escrito en
    // qué consistió la reparación. Se usa el resultado de cada diagnóstico
    // (el resumen en lenguaje llano que ya escribe el técnico, ej. "Se
    // reemplazó el IC de carga...") en vez de los datos técnicos internos
    // (placa, mediciones) que sí van en el Informe técnico — ese es un
    // documento aparte para uso del taller, este es para el cliente.
    const diagnosisNotes = order.diagnostics.map((d) => d.result).filter((r): r is string => !!r);
    const hasWorkDetail =
      diagnosisNotes.length > 0 || order.partsUsed.length > 0 || order.servicesUsed.length > 0;

    pdf.sectionTitle("Trabajo realizado");
    if (!hasWorkDetail) {
      pdf.paragraph("Sin detalle de trabajo registrado.");
    } else {
      for (const note of diagnosisNotes) {
        pdf.paragraph(note);
      }
      if (order.partsUsed.length > 0) {
        pdf.table(
          ["Repuesto utilizado", "Cantidad"],
          order.partsUsed.map((p) => [p.product.description, String(p.quantity)]),
          [340, 100],
        );
      }
      if (order.servicesUsed.length > 0) {
        pdf.table(
          ["Servicio realizado", "Valor"],
          // description siempre está poblado para registros nuevos (ver
          // RepairServicesService.createWithTx); el fallback a
          // service?.name cubre filas creadas antes de esa migración.
          order.servicesUsed.map((s) => [s.description ?? s.service?.name ?? "Servicio", formatCurrency(s.price)]),
          [340, 100],
        );
      }
    }

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

    // Pruebas de hardware verificadas antes de la entrega (teclado, cámara,
    // sonido, disco, periféricos — ver hardware-tests module). Solo se
    // imprime si el técnico alcanzó a registrar al menos una, igual que
    // el resto de secciones opcionales de este documento; sirve como
    // respaldo formal de lo que se verificó frente al cliente.
    if (order.hardwareTestResults.length > 0) {
      pdf.sectionTitle("Pruebas realizadas antes de la entrega");
      pdf.table(
        ["Categoría", "Prueba", "Resultado", "Notas"],
        order.hardwareTestResults.map((t) => [
          HARDWARE_TEST_CATEGORY_LABELS[t.category],
          t.testName,
          HARDWARE_TEST_STATUS_LABELS[t.status],
          t.notes ?? "",
        ]),
        [80, 140, 80, 180],
      );

      const cameraEvidence = order.photos.filter((p) => p.category === "prueba_camara");
      if (cameraEvidence.length > 0) {
        pdf.photoGrid(await this.buildPhotoGridEntries(cameraEvidence));
      }
    }

    pdf.spacer(40);
    if (order.customerSignatureUrl) {
      const signatureBuffer = await this.fetchPhotoBuffer(order.customerSignatureUrl);
      pdf.signatureImage(
        signatureBuffer,
        `Firma de recibido a satisfacción — Cliente · Firmado el ${formatDateTime(order.customerSignatureDate!)}`,
      );
    } else {
      pdf.signatureLine("Firma de recibido a satisfacción — Cliente");
    }

    pdf.footer(`${branding.businessName} · Comprobante de entrega · Orden ${order.orderCode}`);

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
    const branding = await this.businessSettings.getBrandingForDocuments();

    const pdf = new PdfBuilder();
    pdf.header({
      docTitle: "Certificado de garantía",
      docSubtitle: `Orden ${order.orderCode}`,
      businessName: branding.businessName,
      businessTagline: branding.tagline,
    });

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

    pdf.footer(`${branding.businessName} · Certificado de garantía · Orden ${order.orderCode}`);

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
    const branding = await this.businessSettings.getBrandingForDocuments();

    const pdf = new PdfBuilder();
    pdf.header({
      docTitle: "Cotización",
      docSubtitle: `${quotation.quotationNumber} · ${formatDate(quotation.date)}`,
      businessName: branding.businessName,
      businessTagline: branding.tagline,
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

    pdf.footer(`${branding.businessName} · Cotización ${quotation.quotationNumber}`);

    const buffer = await pdf.build();

    await this.audit.log({
      userId: actingUserId,
      action: "GENERATE_QUOTATION_PDF",
      entityType: "CustomerQuotation",
      entityId: quotationId,
    });

    return { buffer, filename: `cotizacion-${quotation.quotationNumber}.pdf` };
  }

  /**
   * "Cuenta de cobro" de un Servicio externo (ver ServiceJobsService) —
   * reproduce el formato en papel que ya usaba el taller: carta formal del
   * técnico (quien presta el servicio y cobra) dirigida al cliente, con el
   * monto en letras y una tabla de los equipos atendidos. A propósito NO
   * incluye el reparto 40/60 con el taller — eso es contabilidad interna,
   * nunca debe aparecer en el documento que recibe el cliente.
   */
  async generateServiceJobAccount(serviceJobId: number, actingUserId: number) {
    const serviceJob = await this.prisma.serviceJob.findUnique({
      where: { id: serviceJobId },
      include: {
        customer: true,
        technician: true,
        items: { orderBy: { id: "asc" } },
      },
    });
    if (!serviceJob) {
      throw new NotFoundException("Servicio externo no encontrado");
    }
    const branding = await this.businessSettings.getBrandingForDocuments();
    // La cuenta de cobro SIEMPRE la factura el propietario del negocio,
    // nunca el técnico que hizo el trabajo en sitio (su comisión se
    // calcula aparte — ver ServiceJobsService). Si todavía no se
    // configuró en Configuración, se cae al técnico asignado para no
    // dejar el documento sin firmante.
    const billerName = branding.ownerFullName || serviceJob.technician.fullName;
    const billerDocumentId = branding.ownerFullName
      ? branding.ownerDocumentId
      : serviceJob.technician.documentId;

    const pdf = new PdfBuilder();
    const centerWidth = pdf.doc.page.width - 100;

    pdf.doc.moveDown(2);
    pdf.doc
      .fontSize(11)
      .font("Helvetica")
      .fillColor("#111827")
      .text(`Cartagena, ${formatDateLongEs(serviceJob.date)}`, 50, pdf.doc.y, {
        width: centerWidth,
        align: "center",
      });

    pdf.doc.moveDown(1);
    pdf.doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .text(`Cuenta de Cobro N° ${String(serviceJob.accountNumber).padStart(4, "0")}`, {
        width: centerWidth,
        align: "center",
      });

    pdf.doc.moveDown(1.5);
    pdf.doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .text(`${serviceJob.customer.fullName}.`, { width: centerWidth, align: "center" });

    pdf.doc.moveDown(0.5);
    pdf.doc.text("DEBE A:", { width: centerWidth, align: "center" });

    pdf.doc.moveDown(1);
    pdf.doc.text(billerName.toUpperCase(), {
      width: centerWidth,
      align: "center",
    });
    if (billerDocumentId) {
      pdf.doc
        .font("Helvetica")
        .fontSize(10)
        .text(`C.C. No. ${billerDocumentId}`, {
          width: centerWidth,
          align: "center",
        });
    }

    pdf.doc.moveDown(1.2);
    const amountWords = numberToWordsEs(Number(serviceJob.chargedAmount));
    pdf.doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .text(amountWords, { width: centerWidth, align: "center" });
    pdf.doc.text(`(${formatCurrency(serviceJob.chargedAmount)})`, {
      width: centerWidth,
      align: "center",
    });

    pdf.doc.moveDown(1.5);
    pdf.doc.font("Helvetica").fontSize(10).text(`Por ${serviceJob.description}:`, 50, pdf.doc.y, {
      width: centerWidth,
      align: "left",
    });
    pdf.doc.x = 50;

    pdf.spacer(10);
    const rows = serviceJob.items.map((item) => [
      item.brand,
      item.code ?? "—",
      item.observation,
      formatCurrency(item.value),
    ]);
    rows.push(["", "", "", formatCurrency(serviceJob.chargedAmount)]);
    pdf.table(["Marca", "Código de ingreso", "Observación", "Valor"], rows, [70, 100, 240, 90]);

    pdf.spacer(20);
    pdf.doc.font("Helvetica").fontSize(10).text("Atentamente.", 50, pdf.doc.y);
    pdf.signatureLine(billerName.toUpperCase());

    pdf.footer(
      `${branding.businessName} · Cuenta de cobro N° ${String(serviceJob.accountNumber).padStart(4, "0")}`,
    );

    const buffer = await pdf.build();

    await this.audit.log({
      userId: actingUserId,
      action: "GENERATE_SERVICE_JOB_PDF",
      entityType: "ServiceJob",
      entityId: serviceJobId,
    });

    return {
      buffer,
      filename: `cuenta-cobro-${String(serviceJob.accountNumber).padStart(4, "0")}.pdf`,
    };
  }
}
