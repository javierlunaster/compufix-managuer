import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { CustomerPortalLoginDto } from "./dto/customer-portal-login.dto";

@Injectable()
export class CustomerPortalService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  /**
   * "Usuario" = documento, "contraseña" = el mismo documento (requisito
   * explícito del taller). Es una autenticación deliberadamente débil —
   * el documento de una persona no es un secreto real — pero el alcance
   * de lo que protege es acorde: solo lectura de las propias reparaciones,
   * nunca datos que puedan usarse para hacerle daño a alguien si se filtra
   * (no hay contraseñas de equipos, no hay datos de pago con tarjeta, no
   * hay nada que no sea "en qué va mi reparación").
   */
  async login(dto: CustomerPortalLoginDto) {
    const documentId = dto.documentId.trim();
    const password = dto.password.trim();

    const customer = await this.prisma.customer.findFirst({
      where: { documentId, status: "ACTIVE" },
    });

    // Mensaje genérico a propósito: no decir "documento no encontrado" vs
    // "contraseña incorrecta" evita que alguien use el portal para
    // averiguar qué documentos SÍ están registrados como clientes.
    if (!customer || !customer.documentId || password !== customer.documentId.trim()) {
      throw new UnauthorizedException("Documento o contraseña incorrectos");
    }

    const accessToken = this.jwt.sign({ sub: customer.id, type: "customer" });

    return {
      accessToken,
      customer: { id: customer.id, fullName: customer.fullName },
    };
  }

  findMyOrders(customerId: number) {
    return this.prisma.repairOrder.findMany({
      where: { customerId },
      select: {
        id: true,
        orderCode: true,
        status: true,
        entryDate: true,
        deliveryDate: true,
        totalValue: true,
        paidAmount: true,
        device: {
          select: {
            model: true,
            brand: { select: { name: true } },
            deviceType: { select: { name: true } },
          },
        },
      },
      orderBy: { entryDate: "desc" },
    });
  }

  async findMyOrderDetail(customerId: number, orderId: number) {
    const order = await this.prisma.repairOrder.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        customerId: true,
        orderCode: true,
        status: true,
        entryDate: true,
        deliveryDate: true,
        reportedIssue: true,
        physicalCondition: true,
        chargerReceived: true,
        batteryReceived: true,
        keyboardReceived: true,
        mouseReceived: true,
        totalValue: true,
        paidAmount: true,
        device: {
          select: {
            model: true,
            serialNumber: true,
            brand: { select: { name: true } },
            deviceType: { select: { name: true } },
          },
        },
        // Solo fotos generales de la orden (repairLogId null) — nunca las
        // de una entrada de bitácora puntual, que pueden documentar un
        // hallazgo técnico interno no pensado para el cliente.
        photos: {
          where: { repairLogId: null },
          select: { id: true, fileUrl: true, uploadedAt: true },
          orderBy: { uploadedAt: "desc" },
        },
        payments: {
          select: { id: true, date: true, amount: true, method: true },
          orderBy: { date: "desc" },
        },
        warranties: {
          select: { id: true, coverageDescription: true, warrantyEndDate: true, status: true },
          orderBy: { deliveryDate: "desc" },
        },
        // NUNCA se seleccionan: devicePasswordEncrypted, notes (notas
        // internas del técnico), logs/diagnostics (bitácora técnica
        // interna), cotizaciones, ni ningún dato de costo/margen.
      },
    });

    // 404 tanto si la orden no existe como si existe pero es de OTRO
    // cliente — un mensaje distinto ("esta orden no es tuya") le
    // confirmaría a alguien que probó un ID ajeno que sí existe una orden
    // con ese número, aunque no sea suya.
    if (!order || order.customerId !== customerId) {
      throw new NotFoundException("Orden no encontrada");
    }

    const { customerId: _omit, ...safeOrder } = order;
    return safeOrder;
  }
}
