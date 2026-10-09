import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { StorageService } from "../storage/storage.service";
import { UpdateBusinessSettingsDto } from "./dto/update-business-settings.dto";

const SETTINGS_ID = 1;

@Injectable()
export class BusinessSettingsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private storage: StorageService,
  ) {}

  /**
   * Fila única (id fijo = 1). Si todavía no existe — el caso normal de
   * cualquier base de datos ya desplegada antes de este cambio — se crea
   * ahí mismo con los valores por defecto del modelo (los mismos que ya
   * se veían vía variables de entorno), para que nadie tenga que correr
   * una migración de datos a mano. Después de esa primera vez, siempre es
   * un simple read.
   */
  async getOrCreate() {
    const existing = await this.prisma.businessSettings.findUnique({
      where: { id: SETTINGS_ID },
    });
    if (existing) {
      return existing;
    }
    return this.prisma.businessSettings.create({ data: { id: SETTINGS_ID } });
  }

  async update(dto: UpdateBusinessSettingsDto, actingUserId: number) {
    const before = await this.getOrCreate();

    const updated = await this.prisma.businessSettings.update({
      where: { id: SETTINGS_ID },
      data: dto,
    });

    await this.audit.log({
      userId: actingUserId,
      action: "UPDATE",
      entityType: "BusinessSettings",
      entityId: SETTINGS_ID,
      previousValue: before,
      newValue: dto,
    });

    return updated;
  }

  /**
   * Reemplaza el logo — sube el archivo nuevo primero (fuera de la
   * transacción de base de datos, igual criterio que AttachmentsService:
   * no tiene sentido revertir una subida ya hecha) y luego actualiza la
   * referencia. El archivo anterior en Storage queda huérfano a
   * propósito — mismo criterio ya usado para la firma del cliente
   * (RepairOrder.customerSignatureUrl): volver a subir sobrescribe la
   * referencia, no se conserva ni se borra el histórico automáticamente.
   */
  async updateLogo(file: Express.Multer.File, actingUserId: number) {
    await this.getOrCreate();
    const uploaded = await this.storage.upload(file, "business-settings");

    const updated = await this.prisma.businessSettings.update({
      where: { id: SETTINGS_ID },
      data: { logoUrl: uploaded.publicUrl },
    });

    await this.audit.log({
      userId: actingUserId,
      action: "UPDATE_LOGO",
      entityType: "BusinessSettings",
      entityId: SETTINGS_ID,
      newValue: { logoUrl: uploaded.publicUrl },
    });

    return updated;
  }

  /** Para PDFs/correos (ver PdfBuilder, mail/templates.ts) — solo lo que necesitan, sin pasar el objeto completo. */
  async getBrandingForDocuments() {
    const settings = await this.getOrCreate();
    return {
      businessName: settings.businessName,
      tagline: settings.tagline,
      // Para la cuenta de cobro de Servicios externos — ver
      // DocumentsService.generateServiceJobAccount. Puede venir vacío si
      // todavía no se configuró en Configuración; ese método decide el
      // respaldo.
      ownerFullName: settings.ownerFullName,
      ownerDocumentId: settings.ownerDocumentId,
    };
  }
}
