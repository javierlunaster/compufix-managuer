import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Servicio delgado sobre AuditLog (sección 26 del brief: toda operación
 * importante debe registrar usuario, fecha, acción, registro afectado y
 * valores anterior/nuevo). Se inyecta en cualquier servicio que necesite
 * dejar rastro — en esta fase lo usa UsersService; en fases posteriores
 * lo usarán inventario, pagos, cambios de precio, etc.
 */
@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: {
    userId: number;
    action: string;
    entityType: string;
    entityId: number;
    previousValue?: unknown;
    newValue?: unknown;
  }) {
    await this.prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        previousValue: params.previousValue as any,
        newValue: params.newValue as any,
      },
    });
  }
}
