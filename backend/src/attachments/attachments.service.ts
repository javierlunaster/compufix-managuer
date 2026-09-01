import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { StorageService } from "../storage/storage.service";
import { UploadAttachmentDto } from "./dto/upload-attachment.dto";

@Injectable()
export class AttachmentsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private storage: StorageService,
  ) {}

  private async ensureOrderExists(orderId: number) {
    const order = await this.prisma.repairOrder.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException("Orden de reparación no encontrada");
    }
    return order;
  }

  /**
   * Fotos generales de la orden (ej. estado físico del equipo al recibirlo
   * — sección 6/22 del brief). `repairLogId` queda en null a propósito:
   * es lo que distingue "foto general de la orden" de "foto de un paso
   * puntual de la bitácora" al consultarlas después.
   */
  async uploadForOrder(
    orderId: number,
    files: Express.Multer.File[],
    dto: UploadAttachmentDto,
    actingUserId: number,
  ) {
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
  async uploadForLog(
    orderId: number,
    logId: number,
    files: Express.Multer.File[],
    dto: UploadAttachmentDto,
    actingUserId: number,
  ) {
    const log = await this.prisma.repairLog.findUnique({ where: { id: logId } });
    if (!log || log.repairOrderId !== orderId) {
      throw new NotFoundException("Entrada de bitácora no encontrada en esta orden");
    }
    return this.saveFiles(files, { repairOrderId: orderId, repairLogId: logId }, dto, actingUserId);
  }

  private async saveFiles(
    files: Express.Multer.File[],
    ids: { repairOrderId: number; repairLogId?: number; diagnosticId?: number },
    dto: UploadAttachmentDto,
    actingUserId: number,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException("Sube al menos una foto");
    }

    // Se sube primero a Supabase Storage (fuera de la transacción de base
    // de datos — no tiene sentido revertir una subida ya hecha) y solo si
    // eso funciona se insertan los registros en la base de datos.
    const uploaded = await Promise.all(
      files.map((file) => this.storage.upload(file, `repair-orders/${ids.repairOrderId}`)),
    );

    const created = await this.prisma.$transaction(
      files.map((file, i) =>
        this.prisma.attachment.create({
          data: {
            repairOrderId: ids.repairOrderId,
            repairLogId: ids.repairLogId,
            diagnosticId: ids.diagnosticId,
            fileUrl: uploaded[i].publicUrl,
            fileType: file.mimetype,
            category: dto.category,
            description: dto.description,
            uploadedById: actingUserId,
          },
        }),
      ),
    );

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
  async uploadForDiagnostic(
    orderId: number,
    diagnosticId: number,
    files: Express.Multer.File[],
    dto: UploadAttachmentDto,
    actingUserId: number,
  ) {
    const diagnostic = await this.prisma.repairDiagnostic.findUnique({ where: { id: diagnosticId } });
    if (!diagnostic || diagnostic.repairOrderId !== orderId) {
      throw new NotFoundException("Diagnóstico no encontrado en esta orden");
    }
    return this.saveFiles(files, { repairOrderId: orderId, diagnosticId }, dto, actingUserId);
  }

  findGeneralPhotosForOrder(orderId: number) {
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
   * también el archivo en Supabase Storage para no dejar basura acumulándose.
   */
  async remove(attachmentId: number, actingUserId: number) {
    const attachment = await this.prisma.attachment.findUnique({ where: { id: attachmentId } });
    if (!attachment) {
      throw new NotFoundException("Foto no encontrada");
    }

    await this.prisma.attachment.delete({ where: { id: attachmentId } });

    // Si el archivo ya no existe en Storage por algún motivo, Supabase no
    // lanza error — el registro en base de datos ya se borró, que es lo
    // que importa para que deje de aparecer en la interfaz.
    await this.storage.remove(this.storage.pathFromPublicUrl(attachment.fileUrl));

    await this.audit.log({
      userId: actingUserId,
      action: "DELETE",
      entityType: "Attachment",
      entityId: attachmentId,
    });

    return { message: "Foto eliminada" };
  }
}
