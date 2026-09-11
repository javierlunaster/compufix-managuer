import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, QuotationStatus, RepairStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { encryptSecret, decryptSecret } from "../common/utils/encryption.util";
import { normalizeName } from "../common/utils/normalize-name.util";
import { CreateRepairOrderDto } from "./dto/create-repair-order.dto";
import { UpdateRepairOrderDto } from "./dto/update-repair-order.dto";
import { UpdateStatusDto } from "./dto/update-status.dto";
import { AssignTechnicianDto } from "./dto/assign-technician.dto";
import { AddProcedureDto } from "./dto/add-procedure.dto";

// Incluye estándar para el "expediente técnico" (sección 30 del brief).
// Deliberadamente NO selecciona devicePasswordEncrypted: esa contraseña
// solo se expone por el endpoint dedicado y restringido por rol.
const ORDER_DETAIL_INCLUDE = {
  customer: true,
  technician: {
    select: { id: true, fullName: true, specialty: true },
  },
  device: { include: { deviceType: true, brand: true } },
  statusHistory: {
    orderBy: { changedAt: "desc" as const },
    include: { user: { select: { id: true, fullName: true } } },
  },
  procedures: { orderBy: { performedAt: "desc" as const } },
  diagnostics: {
    // Orden cronológico (más antiguo primero) — igual que logs más abajo:
    // el informe técnico y la pestaña Diagnóstico deben leerse como una
    // secuencia de lo que pasó, no con el último hallazgo arriba.
    orderBy: { createdAt: "asc" as const },
    include: {
      measurements: true,
      technician: { select: { id: true, fullName: true } },
      photos: { orderBy: { uploadedAt: "asc" as const } },
    },
  },
  logs: {
    orderBy: { date: "asc" as const },
    include: {
      technician: { select: { id: true, fullName: true } },
      photos: { orderBy: { uploadedAt: "asc" as const } },
    },
  },
  partsUsed: {
    include: { product: { select: { id: true, sku: true, description: true } } },
  },
  servicesUsed: {
    include: { service: { select: { id: true, code: true, name: true } } },
  },
  quotations: {
    select: { id: true, quotationNumber: true, status: true, total: true },
  },
  payments: {
    include: { user: { select: { id: true, fullName: true } } },
    orderBy: { date: "desc" as const },
  },
  warranties: { orderBy: { deliveryDate: "desc" as const } },
  photos: {
    // Ni de bitácora ni de un diagnóstico puntual — mismo filtro que ya
    // usa AttachmentsService.findGeneralPhotosForOrder(); este campo se
    // había quedado desactualizado cuando se agregaron las fotos de
    // diagnóstico, dejando que se colaran aquí también.
    where: { repairLogId: null, diagnosticId: null },
    orderBy: { uploadedAt: "desc" as const },
    include: { uploadedBy: { select: { id: true, fullName: true } } },
  },
} satisfies Prisma.RepairOrderInclude;

function withBalance<T extends { totalValue: Prisma.Decimal; paidAmount: Prisma.Decimal }>(
  order: T,
) {
  const balance = order.totalValue.minus(order.paidAmount);
  return { ...order, balance };
}

@Injectable()
export class RepairOrdersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(dto: CreateRepairOrderDto, actingUserId: number) {
    if (!dto.deviceId && !dto.newDevice) {
      throw new BadRequestException(
        "Debes indicar un equipo existente (deviceId) o los datos de un equipo nuevo (newDevice)",
      );
    }
    if (dto.deviceId && dto.newDevice) {
      throw new BadRequestException(
        "Envía solo uno: deviceId (equipo ya registrado) o newDevice (equipo nuevo), no ambos",
      );
    }

    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new NotFoundException("El cliente indicado no existe");
    }

    if (dto.deviceId) {
      const device = await this.prisma.device.findUnique({
        where: { id: dto.deviceId },
      });
      if (!device) {
        throw new NotFoundException("El equipo indicado no existe");
      }
      if (device.customerId !== dto.customerId) {
        throw new BadRequestException(
          "El equipo indicado no pertenece a este cliente",
        );
      }
    }

    const order = await this.prisma.$transaction(async (tx) => {
      let deviceId = dto.deviceId;

      if (dto.newDevice) {
        const newDevice = await tx.device.create({
          data: { ...dto.newDevice, customerId: dto.customerId },
        });
        deviceId = newDevice.id;
      }

      // orderCode depende del id autogenerado, así que se crea primero con
      // un valor temporal único y se corrige en la misma transacción.
      const created = await tx.repairOrder.create({
        data: {
          orderCode: `TEMP-${Date.now()}`,
          customerId: dto.customerId,
          deviceId: deviceId!,
          technicianId: dto.technicianId,
          chargerReceived: dto.chargerReceived ?? false,
          batteryReceived: dto.batteryReceived ?? false,
          keyboardReceived: dto.keyboardReceived ?? false,
          mouseReceived: dto.mouseReceived ?? false,
          physicalCondition: dto.physicalCondition,
          accessoriesNotes: dto.accessoriesNotes,
          devicePasswordEncrypted: dto.devicePassword
            ? encryptSecret(dto.devicePassword)
            : undefined,
          entryReason: dto.entryReason,
          reportedIssue: dto.reportedIssue,
          notes: dto.notes,
          status: RepairStatus.RECEIVED,
        },
      });

      // Código visible al cliente, ej. "C11061" — 'C' + id, consistente con
      // el formato ya usado en el histórico del Excel (ver Fase 1).
      const withCode = await tx.repairOrder.update({
        where: { id: created.id },
        data: { orderCode: `C${created.id}` },
      });

      await tx.repairStatusHistory.create({
        data: {
          repairOrderId: created.id,
          previousStatus: null,
          newStatus: RepairStatus.RECEIVED,
          userId: actingUserId,
          notes: "Ingreso inicial del equipo",
        },
      });

      return withCode;
    });

    await this.audit.log({
      userId: actingUserId,
      action: "CREATE",
      entityType: "RepairOrder",
      entityId: order.id,
      newValue: { orderCode: order.orderCode, customerId: order.customerId },
    });

    return this.findOne(order.id);
  }

  /**
   * Búsqueda / listado. `search` cubre el caso de uso más común de la
   * sección 25 (búsqueda global) para esta fase: encontrar una orden por su
   * código, por el nombre del cliente o por el serial del equipo. El resto
   * de la búsqueda global (repuestos, pagos, cotizaciones...) se completa
   * en fases posteriores cuando esos módulos existan.
   */
  async findAll(params: { search?: string; status?: RepairStatus; technicianId?: number }) {
    const where: Prisma.RepairOrderWhereInput = { recordStatus: "ACTIVE" };

    if (params.status) {
      where.status = params.status;
    }
    if (params.technicianId) {
      where.technicianId = params.technicianId;
    }
    if (params.search) {
      const raw = params.search.trim();
      const codeGuess = raw.toUpperCase().startsWith("C") ? raw.toUpperCase() : `C${raw}`;
      const normalizedTerm = normalizeName(raw);

      where.OR = [
        { orderCode: { equals: codeGuess } },
        { orderCode: { contains: raw, mode: "insensitive" } },
        { customer: { normalizedName: { contains: normalizedTerm } } },
        { device: { serialNumber: { contains: raw, mode: "insensitive" } } },
      ];
    }

    return this.prisma.repairOrder.findMany({
      where,
      include: {
        customer: { select: { id: true, fullName: true, phone: true } },
        device: { select: { id: true, model: true, serialNumber: true } },
        technician: { select: { id: true, fullName: true } },
      },
      orderBy: { entryDate: "desc" },
      take: 100,
    });
  }

  async findOne(id: number) {
    const order = await this.prisma.repairOrder.findUnique({
      where: { id },
      include: ORDER_DETAIL_INCLUDE,
    });
    if (!order) {
      throw new NotFoundException("Orden de reparación no encontrada");
    }
    return withBalance(order);
  }

  async findByCode(orderCode: string) {
    const normalized = orderCode.toUpperCase().startsWith("C")
      ? orderCode.toUpperCase()
      : `C${orderCode}`;
    const order = await this.prisma.repairOrder.findUnique({
      where: { orderCode: normalized },
      include: ORDER_DETAIL_INCLUDE,
    });
    if (!order) {
      throw new NotFoundException("Orden de reparación no encontrada");
    }
    return withBalance(order);
  }

  async update(id: number, dto: UpdateRepairOrderDto, actingUserId: number) {
    await this.ensureExists(id);

    const order = await this.prisma.repairOrder.update({
      where: { id },
      data: {
        ...dto,
        deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : undefined,
      },
    });

    await this.audit.log({
      userId: actingUserId,
      action: "UPDATE",
      entityType: "RepairOrder",
      entityId: id,
      newValue: dto,
    });

    return this.findOne(order.id);
  }

  /**
   * Cambia el estado y deja constancia en RepairStatusHistory (estado
   * anterior, estado nuevo, fecha, usuario, observación — sección 7 del
   * brief). No se valida una máquina de estados estricta en esta fase (el
   * MVP definido en la Fase 1 prioriza flexibilidad); si más adelante el
   * negocio pide restringir transiciones inválidas, se agrega aquí.
   */
  async updateStatus(id: number, dto: UpdateStatusDto, actingUserId: number) {
    const current = await this.ensureExists(id);

    const [order] = await this.prisma.$transaction([
      this.prisma.repairOrder.update({
        where: { id },
        data: { status: dto.newStatus },
      }),
      this.prisma.repairStatusHistory.create({
        data: {
          repairOrderId: id,
          previousStatus: current.status,
          newStatus: dto.newStatus,
          userId: actingUserId,
          notes: dto.notes,
        },
      }),
    ]);

    await this.audit.log({
      userId: actingUserId,
      action: "STATUS_CHANGE",
      entityType: "RepairOrder",
      entityId: id,
      previousValue: { status: current.status },
      newValue: { status: order.status },
    });

    return this.findOne(id);
  }

  async assignTechnician(id: number, dto: AssignTechnicianDto, actingUserId: number) {
    await this.ensureExists(id);

    const technician = await this.prisma.user.findUnique({
      where: { id: dto.technicianId },
    });
    if (!technician || technician.status !== "ACTIVE") {
      throw new NotFoundException("El técnico indicado no existe o está inactivo");
    }

    await this.prisma.repairOrder.update({
      where: { id },
      data: { technicianId: dto.technicianId },
    });

    await this.audit.log({
      userId: actingUserId,
      action: "ASSIGN_TECHNICIAN",
      entityType: "RepairOrder",
      entityId: id,
      newValue: { technicianId: dto.technicianId },
    });

    return this.findOne(id);
  }

  async addProcedure(id: number, dto: AddProcedureDto, actingUserId: number) {
    await this.ensureExists(id);

    const procedure = await this.prisma.repairProcedure.create({
      data: { repairOrderId: id, description: dto.description },
    });

    await this.audit.log({
      userId: actingUserId,
      action: "ADD_PROCEDURE",
      entityType: "RepairOrder",
      entityId: id,
      newValue: { description: dto.description },
    });

    return procedure;
  }

  /**
   * Revela la contraseña del equipo en texto plano — SOLO para roles
   * autorizados (ver @Roles() en el controller) y queda auditado el acceso,
   * no solo la escritura, porque leer un dato sensible también es una
   * operación que debe dejar rastro (sección 26/32 del brief).
   */
  async revealDevicePassword(id: number, actingUserId: number) {
    const order = await this.prisma.repairOrder.findUnique({
      where: { id },
      select: { devicePasswordEncrypted: true },
    });
    if (!order) {
      throw new NotFoundException("Orden de reparación no encontrada");
    }
    if (!order.devicePasswordEncrypted) {
      return { password: null };
    }

    await this.audit.log({
      userId: actingUserId,
      action: "REVEAL_DEVICE_PASSWORD",
      entityType: "RepairOrder",
      entityId: id,
    });

    return { password: decryptSecret(order.devicePasswordEncrypted) };
  }

  /**
   * Purga la contraseña una vez entregado el equipo — mecanismo explícito
   * pedido en la sección 32 del brief, no solo cifrado sino también
   * eliminación cuando ya no hace falta.
   */
  async purgeDevicePassword(id: number, actingUserId: number) {
    await this.ensureExists(id);

    await this.prisma.repairOrder.update({
      where: { id },
      data: { devicePasswordEncrypted: null },
    });

    await this.audit.log({
      userId: actingUserId,
      action: "PURGE_DEVICE_PASSWORD",
      entityType: "RepairOrder",
      entityId: id,
    });

    return { message: "Contraseña del equipo eliminada" };
  }

  /**
   * Corrige órdenes afectadas por un bug ya corregido: convertir una
   * cotización aprobada SOBRESCRIBÍA totalValue en vez de sumarlo (ver
   * QuotationsService.convert), así que una orden con más de una
   * cotización convertida antes de esa corrección quedó con el total de
   * solo la última conversión. Se recalcula como la suma de TODAS las
   * cotizaciones convertidas de la orden — es una acción explícita, no
   * automática, porque si el total actual incluye algo fuera de una
   * cotización (ej. una orden migrada del Excel con un valor propio) esto
   * lo reemplazaría; el llamador (ver controller) debe confirmar con la
   * persona antes de aplicarla.
   */
  async recalculateTotal(id: number, actingUserId: number) {
    const order = await this.ensureExists(id);

    const { _sum } = await this.prisma.customerQuotation.aggregate({
      where: { sourceOrderId: id, status: QuotationStatus.CONVERTED },
      _sum: { total: true },
    });
    const recalculatedTotal = _sum.total ?? new Prisma.Decimal(0);

    await this.prisma.repairOrder.update({
      where: { id },
      data: { totalValue: recalculatedTotal },
    });

    await this.audit.log({
      userId: actingUserId,
      action: "RECALCULATE_TOTAL",
      entityType: "RepairOrder",
      entityId: id,
      previousValue: { totalValue: order.totalValue },
      newValue: { totalValue: recalculatedTotal },
    });

    return this.findOne(id);
  }

  private async ensureExists(id: number) {
    const order = await this.prisma.repairOrder.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException("Orden de reparación no encontrada");
    }
    return order;
  }
}
