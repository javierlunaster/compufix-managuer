import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, QuotationStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { QuotationsService } from "../quotations/quotations.service";
import { CreateQuotationGroupDto } from "./dto/create-quotation-group.dto";

// Una cotización ya CONVERTED/REJECTED/EXPIRED es historia cerrada — no
// tiene sentido meterla en un grupo que luego se va a aprobar/rechazar
// como bloque. DRAFT/SENT/PENDING siguen "en juego", que es justo el
// caso real del taller: varias cotizaciones de un mismo cliente todavía
// esperando su respuesta.
const GROUPABLE_STATUSES: QuotationStatus[] = [
  QuotationStatus.DRAFT,
  QuotationStatus.SENT,
  QuotationStatus.PENDING,
];

const GROUP_DETAIL_INCLUDE = {
  customer: { select: { id: true, fullName: true, phone: true, email: true } },
  quotations: {
    orderBy: { id: "asc" as const },
    include: {
      sourceOrder: { select: { id: true, orderCode: true, status: true } },
      items: {
        include: {
          product: { select: { id: true, sku: true, description: true } },
          service: { select: { id: true, code: true, name: true } },
        },
      },
    },
  },
} satisfies Prisma.QuotationGroupInclude;

type GroupWithQuotations = Prisma.QuotationGroupGetPayload<{ include: typeof GROUP_DETAIL_INCLUDE }>;

@Injectable()
export class QuotationGroupsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private quotations: QuotationsService,
  ) {}

  /**
   * Agrupa cotizaciones ya existentes del MISMO cliente (sección pedida:
   * "varios equipos del mismo cliente, cotización unificada") — no
   * fusiona sus datos, cada una sigue siendo independiente (su propio
   * número, items, y conversión a orden si aplica). El grupo solo
   * envuelve para mostrar un total combinado y aprobarlas/rechazarlas
   * juntas (ver approve()/reject()).
   */
  async create(dto: CreateQuotationGroupDto, actingUserId: number) {
    const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
    if (!customer) {
      throw new NotFoundException("El cliente indicado no existe");
    }

    const uniqueIds = Array.from(new Set(dto.quotationIds));
    const quotations = await this.prisma.customerQuotation.findMany({
      where: { id: { in: uniqueIds } },
    });
    if (quotations.length !== uniqueIds.length) {
      throw new NotFoundException("Alguna de las cotizaciones indicadas no existe");
    }
    for (const q of quotations) {
      if (q.customerId !== dto.customerId) {
        throw new BadRequestException(
          `La cotización ${q.quotationNumber} no pertenece a este cliente`,
        );
      }
      if (q.groupId) {
        throw new BadRequestException(
          `La cotización ${q.quotationNumber} ya pertenece a otro grupo`,
        );
      }
      if (!GROUPABLE_STATUSES.includes(q.status)) {
        throw new BadRequestException(
          `La cotización ${q.quotationNumber} está en estado "${q.status}" y no se puede agrupar`,
        );
      }
    }

    // Mismo patrón de 2 pasos que ya usa CustomerQuotation/ScrapBoard: se
    // crea con un código provisional y se actualiza con el real una vez
    // se conoce el id, para que el número incluya el id sin un segundo
    // contador aparte.
    const group = await this.prisma.$transaction(async (tx) => {
      const created = await tx.quotationGroup.create({
        data: {
          customerId: dto.customerId,
          groupNumber: `TEMP-${Date.now()}`,
          notes: dto.notes,
        },
      });
      await tx.quotationGroup.update({
        where: { id: created.id },
        data: { groupNumber: `GRP${created.id}` },
      });
      await tx.customerQuotation.updateMany({
        where: { id: { in: uniqueIds } },
        data: { groupId: created.id },
      });
      return created;
    });

    await this.audit.log({
      userId: actingUserId,
      action: "CREATE",
      entityType: "QuotationGroup",
      entityId: group.id,
      newValue: { customerId: dto.customerId, quotationIds: uniqueIds },
    });

    return this.findOne(group.id);
  }

  async findAll(params: { customerId?: number }) {
    const where: Prisma.QuotationGroupWhereInput = {};
    if (params.customerId) {
      where.customerId = params.customerId;
    }
    const groups = await this.prisma.quotationGroup.findMany({
      where,
      include: GROUP_DETAIL_INCLUDE,
      orderBy: { date: "desc" },
    });
    return groups.map((g) => this.withComputed(g));
  }

  async findOne(id: number) {
    const group = await this.prisma.quotationGroup.findUnique({
      where: { id },
      include: GROUP_DETAIL_INCLUDE,
    });
    if (!group) {
      throw new NotFoundException("Grupo de cotizaciones no encontrado");
    }
    return this.withComputed(group);
  }

  /**
   * El grupo no guarda su propio estado — se calcula a partir del de sus
   * cotizaciones, así nunca puede desincronizarse si alguien cambia el
   * estado de una por separado (ej. desde su propia página). "Aprobada"
   * solo cuando TODAS lo están (o ya se convirtieron, que implica que
   * pasaron por ahí); "Rechazada" solo si TODAS lo están; cualquier otra
   * mezcla se muestra como "Pendiente".
   */
  private withComputed(group: GroupWithQuotations) {
    const total = group.quotations.reduce((sum, q) => sum + Number(q.total), 0);
    const statuses = group.quotations.map((q) => q.status);
    let status: QuotationStatus = QuotationStatus.PENDING;
    if (statuses.every((s) => s === QuotationStatus.APPROVED || s === QuotationStatus.CONVERTED)) {
      status = QuotationStatus.APPROVED;
    } else if (statuses.every((s) => s === QuotationStatus.REJECTED)) {
      status = QuotationStatus.REJECTED;
    }
    return { ...group, total, status };
  }

  private async ensureGroupStatusChangeable(id: number) {
    const group = await this.prisma.quotationGroup.findUnique({
      where: { id },
      include: { quotations: true },
    });
    if (!group) {
      throw new NotFoundException("Grupo de cotizaciones no encontrado");
    }
    const locked = group.quotations.filter((q) => q.status === QuotationStatus.CONVERTED);
    if (locked.length > 0) {
      throw new BadRequestException(
        `No se puede cambiar el grupo: ${locked.map((q) => q.quotationNumber).join(", ")} ya se convirtió en una orden de reparación`,
      );
    }
    return group;
  }

  /** Aprueba cada cotización del grupo que todavía no lo esté (ver updateStatus de cada una, con su propio audit log). */
  async approve(id: number, actingUserId: number) {
    const group = await this.ensureGroupStatusChangeable(id);
    for (const q of group.quotations) {
      if (q.status !== QuotationStatus.APPROVED) {
        await this.quotations.updateStatus(q.id, { newStatus: QuotationStatus.APPROVED }, actingUserId);
      }
    }
    await this.audit.log({
      userId: actingUserId,
      action: "APPROVE_GROUP",
      entityType: "QuotationGroup",
      entityId: id,
      newValue: { quotationIds: group.quotations.map((q) => q.id) },
    });
    return this.findOne(id);
  }

  async reject(id: number, actingUserId: number) {
    const group = await this.ensureGroupStatusChangeable(id);
    for (const q of group.quotations) {
      if (q.status !== QuotationStatus.REJECTED) {
        await this.quotations.updateStatus(q.id, { newStatus: QuotationStatus.REJECTED }, actingUserId);
      }
    }
    await this.audit.log({
      userId: actingUserId,
      action: "REJECT_GROUP",
      entityType: "QuotationGroup",
      entityId: id,
      newValue: { quotationIds: group.quotations.map((q) => q.id) },
    });
    return this.findOne(id);
  }
}
