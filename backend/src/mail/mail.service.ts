import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Resend } from "resend";
import { EmailNotificationEvent } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { orderReadyEmail, orderReceivedEmail, quotationSentEmail } from "./templates";
import { BusinessSettingsService } from "../business-settings/business-settings.service";

/**
 * A diferencia de StorageService (Supabase Storage es indispensable — sin
 * eso no hay forma de guardar fotos), el correo es una notificación de
 * cortesía: si falta RESEND_API_KEY o el envío falla, el taller sigue
 * funcionando exactamente igual — se registra un aviso y se sigue de
 * largo, nunca se bloquea la operación real (crear la orden, marcar la
 * cotización como enviada, cambiar el estado).
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private client: Resend | null = null;
  private from: string;

  constructor(
    private businessSettings: BusinessSettingsService,
    private prisma: PrismaService,
  ) {}

  onModuleInit() {
    const apiKey = process.env.RESEND_API_KEY;
    this.from = process.env.MAIL_FROM || "onboarding@resend.dev";

    if (!apiKey) {
      this.logger.warn(
        "RESEND_API_KEY no está configurada — no se enviarán correos de notificación a clientes.",
      );
      return;
    }
    this.client = new Resend(apiKey);
  }

  private portalUrl(path: string): string {
    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
    return `${frontendUrl}${path}`;
  }

  /**
   * Deja constancia en EmailNotification de cada intento (bien sea que se
   * haya enviado o que haya fallado) — para que en la propia orden quede
   * registrado qué se le avisó al cliente, sin tener que ir a los logs del
   * servidor. "Mejor esfuerzo" como todo lo demás en este servicio: si el
   * registro mismo falla (ej. la base de datos no responde), no se relanza
   * — ya es demasiado tarde para eso, el correo ya se intentó o se envió.
   * `repairOrderId` es opcional porque una cotización puede no venir de
   * una orden de reparación (sourceOrderId null, ver QuotationsService) —
   * en ese caso no hay dónde dejar el registro, y está bien que no quede.
   */
  private async logNotification(params: {
    repairOrderId?: number | null;
    event: EmailNotificationEvent;
    recipient: string;
    subject: string;
    status: "SENT" | "FAILED";
    errorMessage?: string;
  }) {
    if (!params.repairOrderId) return;
    try {
      await this.prisma.emailNotification.create({
        data: {
          repairOrderId: params.repairOrderId,
          event: params.event,
          recipient: params.recipient,
          subject: params.subject,
          status: params.status,
          errorMessage: params.errorMessage,
        },
      });
    } catch (err) {
      this.logger.error(
        `No se pudo registrar el historial de la notificación "${params.subject}": ${(err as Error).message}`,
      );
    }
  }

  private async send(params: {
    repairOrderId?: number | null;
    event: EmailNotificationEvent;
    to: string | null | undefined;
    subject: string;
    html: string;
  }): Promise<void> {
    const { repairOrderId, event, to, subject, html } = params;

    if (!to) {
      // El cliente no tiene correo registrado — no hay a quién avisar,
      // pero queda constancia de que no se pudo (y por qué) en la orden.
      await this.logNotification({
        repairOrderId,
        event,
        recipient: "(sin correo registrado)",
        subject,
        status: "FAILED",
        errorMessage: "El cliente no tiene correo registrado",
      });
      return;
    }

    if (!this.client) {
      await this.logNotification({
        repairOrderId,
        event,
        recipient: to,
        subject,
        status: "FAILED",
        errorMessage: "Resend no está configurado (falta RESEND_API_KEY)",
      });
      return;
    }

    try {
      // El SDK de Resend NO lanza una excepción cuando la API responde con
      // un error (ej. dominio no verificado, límite alcanzado) — devuelve
      // `{ data: null, error: {...} }`, igual que el cliente de Supabase.
      // Revisar `error` explícitamente es necesario; solo el try/catch de
      // alrededor no bastaba (se estaba tragando errores en silencio).
      const { error } = await this.client.emails.send({ from: this.from, to, subject, html });
      if (error) {
        this.logger.error(`No se pudo enviar el correo "${subject}" a ${to}: ${error.message}`);
        await this.logNotification({
          repairOrderId,
          event,
          recipient: to,
          subject,
          status: "FAILED",
          errorMessage: error.message,
        });
        return;
      }
      await this.logNotification({ repairOrderId, event, recipient: to, subject, status: "SENT" });
    } catch (err) {
      // Nunca se relanza: un correo que no salió no debe tumbar la
      // creación de la orden, el cambio de estado, ni el envío de la
      // cotización que sí importan de verdad.
      this.logger.error(`No se pudo enviar el correo "${subject}" a ${to}: ${(err as Error).message}`);
      await this.logNotification({
        repairOrderId,
        event,
        recipient: to,
        subject,
        status: "FAILED",
        errorMessage: (err as Error).message,
      });
    }
  }

  async sendOrderReceived(params: {
    repairOrderId: number;
    to: string | null | undefined;
    customerName: string;
    orderCode: string;
    deviceLabel: string;
    reportedIssue: string;
  }): Promise<void> {
    const { businessName } = await this.businessSettings.getBrandingForDocuments();
    const { subject, html } = orderReceivedEmail({
      customerName: params.customerName,
      orderCode: params.orderCode,
      deviceLabel: params.deviceLabel,
      reportedIssue: params.reportedIssue,
      portalUrl: this.portalUrl("/portal/login"),
      businessName,
    });
    await this.send({
      repairOrderId: params.repairOrderId,
      event: EmailNotificationEvent.ORDER_RECEIVED,
      to: params.to,
      subject,
      html,
    });
  }

  async sendQuotationSent(params: {
    repairOrderId?: number | null;
    to: string | null | undefined;
    customerName: string;
    quotationNumber: string;
    total: string;
  }): Promise<void> {
    const { businessName } = await this.businessSettings.getBrandingForDocuments();
    const { subject, html } = quotationSentEmail({
      customerName: params.customerName,
      quotationNumber: params.quotationNumber,
      total: params.total,
      portalUrl: this.portalUrl("/portal/login"),
      businessName,
    });
    await this.send({
      repairOrderId: params.repairOrderId,
      event: EmailNotificationEvent.QUOTATION_SENT,
      to: params.to,
      subject,
      html,
    });
  }

  async sendOrderReady(params: {
    repairOrderId: number;
    to: string | null | undefined;
    customerName: string;
    orderCode: string;
    deviceLabel: string;
    balance: string;
  }): Promise<void> {
    const { businessName } = await this.businessSettings.getBrandingForDocuments();
    const { subject, html } = orderReadyEmail({
      customerName: params.customerName,
      orderCode: params.orderCode,
      deviceLabel: params.deviceLabel,
      balance: params.balance,
      portalUrl: this.portalUrl("/portal/login"),
      businessName,
    });
    await this.send({
      repairOrderId: params.repairOrderId,
      event: EmailNotificationEvent.ORDER_READY,
      to: params.to,
      subject,
      html,
    });
  }
}
