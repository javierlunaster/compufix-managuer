import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Resend } from "resend";
import { orderReadyEmail, orderReceivedEmail, quotationSentEmail } from "./templates";

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

  private async send(to: string | null | undefined, subject: string, html: string): Promise<void> {
    if (!this.client) return;
    if (!to) return; // El cliente no tiene correo registrado — no hay a quién avisar.

    try {
      // El SDK de Resend NO lanza una excepción cuando la API responde con
      // un error (ej. dominio no verificado, límite alcanzado) — devuelve
      // `{ data: null, error: {...} }`, igual que el cliente de Supabase.
      // Revisar `error` explícitamente es necesario; solo el try/catch de
      // alrededor no bastaba (se estaba tragando errores en silencio).
      const { error } = await this.client.emails.send({ from: this.from, to, subject, html });
      if (error) {
        this.logger.error(`No se pudo enviar el correo "${subject}" a ${to}: ${error.message}`);
      }
    } catch (err) {
      // Nunca se relanza: un correo que no salió no debe tumbar la
      // creación de la orden, el cambio de estado, ni el envío de la
      // cotización que sí importan de verdad.
      this.logger.error(`No se pudo enviar el correo "${subject}" a ${to}: ${(err as Error).message}`);
    }
  }

  async sendOrderReceived(params: {
    to: string | null | undefined;
    customerName: string;
    orderCode: string;
    deviceLabel: string;
    reportedIssue: string;
  }): Promise<void> {
    const { subject, html } = orderReceivedEmail({
      customerName: params.customerName,
      orderCode: params.orderCode,
      deviceLabel: params.deviceLabel,
      reportedIssue: params.reportedIssue,
      portalUrl: this.portalUrl("/portal/login"),
    });
    await this.send(params.to, subject, html);
  }

  async sendQuotationSent(params: {
    to: string | null | undefined;
    customerName: string;
    quotationNumber: string;
    total: string;
  }): Promise<void> {
    const { subject, html } = quotationSentEmail({
      customerName: params.customerName,
      quotationNumber: params.quotationNumber,
      total: params.total,
      portalUrl: this.portalUrl("/portal/login"),
    });
    await this.send(params.to, subject, html);
  }

  async sendOrderReady(params: {
    to: string | null | undefined;
    customerName: string;
    orderCode: string;
    deviceLabel: string;
    balance: string;
  }): Promise<void> {
    const { subject, html } = orderReadyEmail({
      customerName: params.customerName,
      orderCode: params.orderCode,
      deviceLabel: params.deviceLabel,
      balance: params.balance,
      portalUrl: this.portalUrl("/portal/login"),
    });
    await this.send(params.to, subject, html);
  }
}
