import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CashMovementType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { OpenCashRegisterDto } from "./dto/open-cash-register.dto";
import { CloseCashRegisterDto } from "./dto/close-cash-register.dto";
import { CreateCashMovementDto } from "./dto/create-cash-movement.dto";

// Mismo criterio que en InventoryMovementsService/RepairPartsService: un
// tipo mínimo que acepta tanto `this.prisma` como el `tx` de una
// transacción externa, para que PaymentsService pueda registrar el ingreso
// de un abono en la misma transacción que actualiza la orden.
type PrismaTxClient = Pick<PrismaService, "cashRegister" | "cashMovement">;

@Injectable()
export class CashService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /**
   * Solo puede haber UNA caja abierta a la vez en todo el sistema — el
   * brief describe apertura/cierre/arqueo como un proceso diario único del
   * taller, no una caja por usuario o por turno simultáneo.
   */
  async open(dto: OpenCashRegisterDto, actingUserId: number) {
    const existingOpen = await this.prisma.cashRegister.findFirst({
      where: { status: "OPEN" },
    });
    if (existingOpen) {
      throw new BadRequestException(
        `Ya hay una caja abierta (#${existingOpen.id}, abierta ${existingOpen.openedAt.toISOString()}). Ciérrala antes de abrir una nueva.`,
      );
    }

    const register = await this.prisma.cashRegister.create({
      data: {
        openingAmount: dto.openingAmount,
        openedById: actingUserId,
      },
    });

    await this.audit.log({
      userId: actingUserId,
      action: "OPEN",
      entityType: "CashRegister",
      entityId: register.id,
      newValue: { openingAmount: dto.openingAmount },
    });

    return register;
  }

  /**
   * Cierra la caja abierta y calcula el arqueo: monto esperado = apertura +
   * ingresos - egresos registrados durante el turno; diferencia = lo que
   * contaron físicamente menos lo esperado (positivo = sobra, negativo =
   * falta) — tal como pide la sección 19 del brief.
   */
  async close(id: number, dto: CloseCashRegisterDto, actingUserId: number) {
    const register = await this.prisma.cashRegister.findUnique({
      where: { id },
      include: { movements: true },
    });
    if (!register) {
      throw new NotFoundException("Caja no encontrada");
    }
    if (register.status === "CLOSED") {
      throw new BadRequestException("Esta caja ya está cerrada");
    }

    const income = register.movements
      .filter((m) => m.type === CashMovementType.INCOME)
      .reduce((sum, m) => sum + Number(m.amount), 0);
    const expense = register.movements
      .filter((m) => m.type === CashMovementType.EXPENSE)
      .reduce((sum, m) => sum + Number(m.amount), 0);

    const expectedAmount = Number(register.openingAmount) + income - expense;
    const difference = dto.closingAmount - expectedAmount;

    const closed = await this.prisma.cashRegister.update({
      where: { id },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        closedById: actingUserId,
        closingAmount: dto.closingAmount,
        expectedAmount,
        difference,
      },
    });

    await this.audit.log({
      userId: actingUserId,
      action: "CLOSE",
      entityType: "CashRegister",
      entityId: id,
      newValue: { closingAmount: dto.closingAmount, expectedAmount, difference },
    });

    return closed;
  }

  findCurrent() {
    return this.prisma.cashRegister.findFirst({
      where: { status: "OPEN" },
      include: {
        movements: {
          orderBy: { date: "desc" },
          include: { user: { select: { id: true, fullName: true } } },
        },
        openedBy: { select: { id: true, fullName: true } },
      },
    });
  }

  findAll() {
    return this.prisma.cashRegister.findMany({
      orderBy: { openedAt: "desc" },
      include: {
        openedBy: { select: { id: true, fullName: true } },
        closedBy: { select: { id: true, fullName: true } },
      },
      take: 60,
    });
  }

  async findOne(id: number) {
    const register = await this.prisma.cashRegister.findUnique({
      where: { id },
      include: {
        movements: {
          orderBy: { date: "desc" },
          include: { user: { select: { id: true, fullName: true } } },
        },
        openedBy: { select: { id: true, fullName: true } },
        closedBy: { select: { id: true, fullName: true } },
      },
    });
    if (!register) {
      throw new NotFoundException("Caja no encontrada");
    }
    return register;
  }

  /**
   * Registro manual de un movimiento (ej. un gasto de envío, una compra en
   * efectivo). Requiere que haya una caja abierta.
   */
  async createMovement(dto: CreateCashMovementDto, actingUserId: number) {
    const current = await this.prisma.cashRegister.findFirst({
      where: { status: "OPEN" },
    });
    if (!current) {
      throw new BadRequestException(
        "No hay una caja abierta — ábrela antes de registrar movimientos",
      );
    }

    const movement = await this.prisma.cashMovement.create({
      data: {
        cashRegisterId: current.id,
        type: dto.type,
        category: dto.category,
        amount: dto.amount,
        description: dto.description,
        userId: actingUserId,
      },
    });

    await this.audit.log({
      userId: actingUserId,
      action: "CREATE",
      entityType: "CashMovement",
      entityId: movement.id,
      newValue: dto,
    });

    return movement;
  }

  /**
   * Integración automática con Pagos (ver PaymentsService): si hay una
   * caja abierta al momento de registrar un abono, se refleja como ingreso
   * de caja en la misma transacción — sin bloquear el pago si no hay caja
   * abierta (se decidió que el registro del pago no debe depender de la
   * disciplina de caja del día; queda como "mejor esfuerzo").
   */
  async recordIncomeIfRegisterOpen(
    tx: PrismaTxClient,
    params: { category: string; amount: number; paymentId: number; userId: number; description?: string },
  ) {
    const current = await tx.cashRegister.findFirst({ where: { status: "OPEN" } });
    if (!current) {
      return null;
    }

    return tx.cashMovement.create({
      data: {
        cashRegisterId: current.id,
        type: CashMovementType.INCOME,
        category: params.category,
        amount: params.amount,
        paymentId: params.paymentId,
        description: params.description,
        userId: params.userId,
      },
    });
  }
}
