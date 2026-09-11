import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { QuotationStatus } from "@prisma/client";
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
        // Fotos generales de la orden — ni de una entrada de bitácora ni de
        // un diagnóstico puntual, esas se muestran junto a su propia
        // entrada de diagnóstico/bitácora más abajo, no aquí.
        photos: {
          where: { repairLogId: null, diagnosticId: null },
          select: { id: true, fileUrl: true, uploadedAt: true, category: true },
          orderBy: { uploadedAt: "desc" },
        },
        // El diagnóstico y la bitácora SÍ se muestran al cliente (a
        // diferencia de las notas internas del técnico en RepairOrder.notes,
        // que siguen sin exponerse): explican qué se encontró y qué se hizo,
        // la misma información que ya recibe impresa en el informe técnico
        // (ver documents.service.ts). Se deja fuera boardReference/chargerIc
        // (referencias de repuesto, sin valor informativo para el cliente) y
        // las banderas booleanas de checklist interno (biosReprogrammed,
        // ecReviewed, ecReprogrammed).
        diagnostics: {
          select: {
            id: true,
            createdAt: true,
            initialSymptom: true,
            componentSuspected: true,
            componentReplaced: true,
            result: true,
            technician: { select: { fullName: true } },
            measurements: {
              select: {
                id: true,
                pointName: true,
                expectedValue: true,
                measuredValue: true,
                unit: true,
                status: true,
              },
            },
            photos: {
              select: { id: true, fileUrl: true, uploadedAt: true },
              orderBy: { uploadedAt: "asc" },
            },
          },
          // Más antiguo primero — igual que logs más abajo: se lee como
          // una secuencia de lo que fue pasando, no con lo último arriba.
          orderBy: { createdAt: "asc" },
        },
        logs: {
          select: {
            id: true,
            date: true,
            procedure: true,
            measurement: true,
            component: true,
            reference: true,
            result: true,
            notes: true,
            technician: { select: { fullName: true } },
            photos: {
              select: { id: true, fileUrl: true, uploadedAt: true },
              orderBy: { uploadedAt: "asc" },
            },
          },
          orderBy: { date: "asc" },
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
        // internas del técnico sobre la orden), cotizaciones, ni ningún
        // dato de costo/margen.
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

  // --- Cotizaciones propias -------------------------------------------
  // Una CustomerQuotation pertenece directamente a un Customer (no
  // siempre a una orden — puede existir antes de que exista una orden,
  // ver Fase 7), así que se listan aparte de "mis reparaciones", no
  // anidadas dentro de una orden específica.

  // Solo se puede aprobar/rechazar mientras sigue esperando respuesta.
  // Una vez aprobada, rechazada, convertida o vencida, es historia — el
  // cliente ya no puede "deshacer" esa decisión desde el portal.
  private readonly APPROVABLE_STATUSES: QuotationStatus[] = [
    QuotationStatus.SENT,
    QuotationStatus.PENDING,
  ];

  findMyQuotations(customerId: number) {
    return this.prisma.customerQuotation.findMany({
      where: { customerId },
      select: {
        id: true,
        quotationNumber: true,
        date: true,
        status: true,
        total: true,
        validUntil: true,
        sourceOrder: { select: { id: true, orderCode: true } },
      },
      orderBy: { date: "desc" },
    });
  }

  async findMyQuotationDetail(customerId: number, quotationId: number) {
    const quotation = await this.prisma.customerQuotation.findUnique({
      where: { id: quotationId },
      select: {
        id: true,
        customerId: true,
        quotationNumber: true,
        date: true,
        status: true,
        subtotal: true,
        discount: true,
        tax: true,
        shipping: true,
        total: true,
        validUntil: true,
        sourceOrder: { select: { id: true, orderCode: true } },
        items: {
          select: { id: true, description: true, quantity: true, unitPrice: true, subtotal: true },
        },
        // "notes" queda fuera a propósito: es un campo de uso libre para
        // el personal, sin una distinción de "nota interna" vs "nota
        // para el cliente" en el modelo — más seguro no mostrarlo que
        // exponer por accidente algo que no era para el cliente.
      },
    });

    if (!quotation || quotation.customerId !== customerId) {
      throw new NotFoundException("Cotización no encontrada");
    }

    const { customerId: _omit, ...safeQuotation } = quotation;
    return safeQuotation;
  }

  private async ensureOwnedAndApprovable(customerId: number, quotationId: number) {
    const quotation = await this.prisma.customerQuotation.findUnique({ where: { id: quotationId } });
    if (!quotation || quotation.customerId !== customerId) {
      throw new NotFoundException("Cotización no encontrada");
    }
    if (!this.APPROVABLE_STATUSES.includes(quotation.status)) {
      throw new BadRequestException("Esta cotización ya no está pendiente de tu respuesta");
    }
    return quotation;
  }

  /**
   * Aprobar desde el portal solo cambia el estado — a propósito NO
   * convierte la cotización en una orden de reparación automáticamente.
   * Esa conversión sigue siendo un paso manual del personal ("Convertir
   * en reparación", Fase 7), para que alguien del taller revise antes de
   * que se dispare un movimiento de inventario real sin supervisión.
   */
  async approveMyQuotation(customerId: number, quotationId: number) {
    await this.ensureOwnedAndApprovable(customerId, quotationId);
    return this.prisma.customerQuotation.update({
      where: { id: quotationId },
      data: { status: QuotationStatus.APPROVED },
    });
  }

  async rejectMyQuotation(customerId: number, quotationId: number) {
    await this.ensureOwnedAndApprovable(customerId, quotationId);
    return this.prisma.customerQuotation.update({
      where: { id: quotationId },
      data: { status: QuotationStatus.REJECTED },
    });
  }
}
