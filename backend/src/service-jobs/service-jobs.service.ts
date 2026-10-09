import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, PaymentStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CashService } from "../cash/cash.service";
import { BusinessSettingsService } from "../business-settings/business-settings.service";
import { CreateServiceJobDto } from "./dto/create-service-job.dto";

const DETAIL_INCLUDE = {
  customer: { select: { id: true, fullName: true, phone: true, documentId: true } },
  technician: { select: { id: true, fullName: true, documentId: true } },
  items: { orderBy: { id: "asc" as const } },
} as const;

/**
 * "Servicios externos" (ver ServiceJob en el schema): trabajos que un
 * técnico presta en sitio, en un cliente, cubriendo uno o varios equipos
 * en una sola visita — la "cuenta de cobro" en papel que el taller ya
 * usaba. El pago se reparte entre el taller y el técnico según un % que
 * se fija por cada trabajo (no es una regla fija del negocio).
 */
@Injectable()
export class ServiceJobsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private cash: CashService,
    private businessSettings: BusinessSettingsService,
  ) {}

  /**
   * Se asume el total cobrado de una vez (igual que una Venta, sin
   * seguimiento de abonos) — por eso el ingreso del taller se registra en
   * Caja de inmediato, al crear el trabajo, no al "cobrarlo" después.
   */
  async create(dto: CreateServiceJobDto, actingUserId: number) {
    const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
    if (!customer) {
      throw new NotFoundException("El cliente indicado no existe");
    }

    const technician = await this.prisma.user.findUnique({ where: { id: dto.technicianId } });
    if (!technician) {
      throw new NotFoundException("El técnico indicado no existe");
    }

    const chargedAmount = dto.items.reduce((sum, item) => sum + item.value, 0);
    // El monto del técnico se redondea primero y el del taller se calcula
    // como el resto — así los dos siempre suman exactamente chargedAmount,
    // sin que el redondeo de cada lado por separado deje un centavo de
    // diferencia.
    const amountToPayTechnician = Math.round(chargedAmount * (dto.technicianPercentage / 100) * 100) / 100;
    const retentionAmount = Math.round((chargedAmount - amountToPayTechnician) * 100) / 100;

    // Asegura que exista la fila única de configuración antes de la
    // transacción (ver BusinessSettingsService.getOrCreate) — el
    // incremento atómico de abajo necesita que la fila ya exista.
    await this.businessSettings.getOrCreate();

    const serviceJob = await this.prisma.$transaction(async (tx) => {
      // Lectura + incremento en una sola sentencia UPDATE: Postgres
      // bloquea la fila durante la transacción, así que dos trabajos
      // creados al mismo tiempo nunca terminan con el mismo accountNumber.
      const updatedSettings = await tx.businessSettings.update({
        where: { id: 1 },
        data: { nextServiceJobAccountNumber: { increment: 1 } },
      });
      const accountNumber = updatedSettings.nextServiceJobAccountNumber - 1;

      const created = await tx.serviceJob.create({
        data: {
          accountNumber,
          date: new Date(dto.date),
          customerId: dto.customerId,
          description: dto.description,
          technicianId: dto.technicianId,
          chargedAmount,
          retentionAmount,
          amountToPayTechnician,
          notes: dto.notes,
          items: {
            create: dto.items.map((item) => ({
              brand: item.brand,
              code: item.code,
              observation: item.observation,
              value: item.value,
            })),
          },
        },
        include: DETAIL_INCLUDE,
      });

      await this.cash.recordServiceJobIncomeIfRegisterOpen(tx, {
        category: "Servicios externos",
        amount: retentionAmount,
        serviceJobId: created.id,
        userId: actingUserId,
        description: `Cuenta de cobro N° ${accountNumber} — ${customer.fullName} (parte del taller)`,
      });

      return created;
    });

    await this.audit.log({
      userId: actingUserId,
      action: "CREATE",
      entityType: "ServiceJob",
      entityId: serviceJob.id,
      newValue: {
        accountNumber: serviceJob.accountNumber,
        customerId: dto.customerId,
        technicianId: dto.technicianId,
        chargedAmount,
        retentionAmount,
        amountToPayTechnician,
      },
    });

    return serviceJob;
  }

  async findAll(params: { technicianId?: number; paymentStatus?: PaymentStatus }) {
    const where: Prisma.ServiceJobWhereInput = { status: "ACTIVE" };
    if (params.technicianId) where.technicianId = params.technicianId;
    if (params.paymentStatus) where.paymentStatus = params.paymentStatus;

    return this.prisma.serviceJob.findMany({
      where,
      include: {
        customer: { select: { id: true, fullName: true } },
        technician: { select: { id: true, fullName: true } },
        items: { select: { id: true } },
      },
      orderBy: { accountNumber: "desc" },
    });
  }

  async findOne(id: number) {
    const serviceJob = await this.prisma.serviceJob.findUnique({
      where: { id },
      include: DETAIL_INCLUDE,
    });
    if (!serviceJob) {
      throw new NotFoundException("Servicio externo no encontrado");
    }
    return serviceJob;
  }

  /**
   * Le paga al técnico su parte completa (amountToPayTechnician) de una
   * sola vez — no hay pagos parciales para esto, es una comisión puntual
   * por un trabajo ya cerrado, no una deuda grande a plazos.
   */
  async markTechnicianPaid(id: number, actingUserId: number) {
    const serviceJob = await this.findOne(id);
    if (serviceJob.paymentStatus === "PAID") {
      throw new BadRequestException("Ya se le pagó al técnico este trabajo");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.serviceJob.update({ where: { id }, data: { paymentStatus: "PAID" } });

      await this.cash.recordTechnicianPaymentExpenseIfRegisterOpen(tx, {
        category: "Pago a técnico",
        amount: Number(serviceJob.amountToPayTechnician),
        serviceJobId: id,
        userId: actingUserId,
        description: `Pago a ${serviceJob.technician.fullName} — cuenta de cobro N° ${serviceJob.accountNumber}`,
      });
    });

    await this.audit.log({
      userId: actingUserId,
      action: "MARK_TECHNICIAN_PAID",
      entityType: "ServiceJob",
      entityId: id,
      previousValue: { paymentStatus: serviceJob.paymentStatus },
      newValue: { paymentStatus: "PAID", amount: serviceJob.amountToPayTechnician },
    });

    return this.findOne(id);
  }
}
