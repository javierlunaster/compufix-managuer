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
 *
 * A diferencia de una Venta, no se asume cobrado de una vez: se envía la
 * cuenta de cobro y el pago del cliente llega después, así que
 * clientPaymentStatus/technicianPaymentStatus son dos estados
 * independientes, y nada toca Caja hasta que cada uno realmente ocurre
 * (ver markClientPaid/markTechnicianPaid).
 */
@Injectable()
export class ServiceJobsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private cash: CashService,
    private businessSettings: BusinessSettingsService,
  ) {}

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

      return tx.serviceJob.create({
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

  async findAll(params: {
    technicianId?: number;
    clientPaymentStatus?: PaymentStatus;
    technicianPaymentStatus?: PaymentStatus;
  }) {
    const where: Prisma.ServiceJobWhereInput = { status: "ACTIVE" };
    if (params.technicianId) where.technicianId = params.technicianId;
    if (params.clientPaymentStatus) where.clientPaymentStatus = params.clientPaymentStatus;
    if (params.technicianPaymentStatus) where.technicianPaymentStatus = params.technicianPaymentStatus;

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
   * Edita un servicio externo antes de enviarlo/cobrarlo — una vez que el
   * cliente ya pagó, ya existe un movimiento real de Caja ligado a los
   * montos actuales (ver markClientPaid), así que editar después
   * descuadraría las cuentas. accountNumber nunca cambia: sigue siendo el
   * mismo consecutivo de la cuenta de cobro ya asignada.
   */
  async update(id: number, dto: CreateServiceJobDto, actingUserId: number) {
    const existing = await this.findOne(id);
    if (existing.clientPaymentStatus !== "PENDING") {
      throw new BadRequestException(
        "No puedes editar esta cuenta de cobro: el cliente ya la pagó",
      );
    }

    const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
    if (!customer) {
      throw new NotFoundException("El cliente indicado no existe");
    }
    const technician = await this.prisma.user.findUnique({ where: { id: dto.technicianId } });
    if (!technician) {
      throw new NotFoundException("El técnico indicado no existe");
    }

    const chargedAmount = dto.items.reduce((sum, item) => sum + item.value, 0);
    const amountToPayTechnician = Math.round(chargedAmount * (dto.technicianPercentage / 100) * 100) / 100;
    const retentionAmount = Math.round((chargedAmount - amountToPayTechnician) * 100) / 100;

    const serviceJob = await this.prisma.$transaction(async (tx) => {
      await tx.serviceJobItem.deleteMany({ where: { serviceJobId: id } });
      return tx.serviceJob.update({
        where: { id },
        data: {
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
    });

    await this.audit.log({
      userId: actingUserId,
      action: "UPDATE",
      entityType: "ServiceJob",
      entityId: id,
      previousValue: {
        customerId: existing.customerId,
        technicianId: existing.technicianId,
        chargedAmount: existing.chargedAmount,
        retentionAmount: existing.retentionAmount,
        amountToPayTechnician: existing.amountToPayTechnician,
      },
      newValue: {
        customerId: dto.customerId,
        technicianId: dto.technicianId,
        chargedAmount,
        retentionAmount,
        amountToPayTechnician,
      },
    });

    return serviceJob;
  }

  /**
   * Elimina (borrado lógico) un servicio externo antes de que el cliente
   * pague — igual criterio que update(): una vez pagado ya quedó
   * registrado en Caja y no se puede tocar. El accountNumber de una
   * cuenta de cobro eliminada nunca se reutiliza.
   */
  async remove(id: number, actingUserId: number) {
    const existing = await this.findOne(id);
    if (existing.clientPaymentStatus !== "PENDING") {
      throw new BadRequestException(
        "No puedes eliminar esta cuenta de cobro: el cliente ya la pagó",
      );
    }

    await this.prisma.serviceJob.update({ where: { id }, data: { status: "INACTIVE" } });

    await this.audit.log({
      userId: actingUserId,
      action: "DELETE",
      entityType: "ServiceJob",
      entityId: id,
      previousValue: { status: "ACTIVE", accountNumber: existing.accountNumber },
      newValue: { status: "INACTIVE" },
    });

    return { success: true };
  }

  /**
   * Registra que el cliente pagó la cuenta de cobro — el ingreso de caja
   * es por chargedAmount COMPLETO (lo que de verdad entra a caja), no
   * solo la parte del taller: si solo se registrara retentionAmount como
   * ingreso, el arqueo de caja nunca tendría el dinero para después
   * pagarle al técnico (ver markTechnicianPaid), y el saldo quedaría mal
   * cuadrado. Con el ingreso completo aquí y el egreso de
   * amountToPayTechnician al pagarle al técnico, el neto en caja termina
   * siendo exactamente retentionAmount — la ganancia real del taller.
   */
  async markClientPaid(id: number, actingUserId: number) {
    const serviceJob = await this.findOne(id);
    if (serviceJob.clientPaymentStatus === "PAID") {
      throw new BadRequestException("Ya se registró el pago del cliente para este trabajo");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.serviceJob.update({ where: { id }, data: { clientPaymentStatus: "PAID" } });

      await this.cash.recordServiceJobIncomeIfRegisterOpen(tx, {
        category: "Servicios externos",
        amount: Number(serviceJob.chargedAmount),
        serviceJobId: id,
        userId: actingUserId,
        description: `Cliente pagó cuenta de cobro N° ${serviceJob.accountNumber} — ${serviceJob.customer.fullName}`,
      });
    });

    await this.audit.log({
      userId: actingUserId,
      action: "MARK_CLIENT_PAID",
      entityType: "ServiceJob",
      entityId: id,
      previousValue: { clientPaymentStatus: serviceJob.clientPaymentStatus },
      newValue: { clientPaymentStatus: "PAID", amount: serviceJob.chargedAmount },
    });

    return this.findOne(id);
  }

  /**
   * Le paga al técnico su parte completa (amountToPayTechnician) de una
   * sola vez — no hay pagos parciales para esto, es una comisión puntual
   * por un trabajo ya cerrado, no una deuda grande a plazos. Exige que el
   * cliente ya haya pagado (ver markClientPaid): pagarle al técnico antes
   * sacaría de caja un dinero que el taller todavía no ha recibido.
   */
  async markTechnicianPaid(id: number, actingUserId: number) {
    const serviceJob = await this.findOne(id);
    if (serviceJob.clientPaymentStatus !== "PAID") {
      throw new BadRequestException(
        "El cliente todavía no ha pagado esta cuenta de cobro — regístralo primero",
      );
    }
    if (serviceJob.technicianPaymentStatus === "PAID") {
      throw new BadRequestException("Ya se le pagó al técnico este trabajo");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.serviceJob.update({ where: { id }, data: { technicianPaymentStatus: "PAID" } });

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
      previousValue: { technicianPaymentStatus: serviceJob.technicianPaymentStatus },
      newValue: { technicianPaymentStatus: "PAID", amount: serviceJob.amountToPayTechnician },
    });

    return this.findOne(id);
  }
}
