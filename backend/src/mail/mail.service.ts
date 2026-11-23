import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import nodemailer, { Transporter } from "nodemailer";
import { orderReadyEmail, orderReceivedEmail, quotationSentEmail } from "./templates";
import { BusinessSettingsService } from "../business-settings/business-settings.service";

/**
 * A diferencia de StorageService (Supabase Storage es indispensable — sin
 * eso no hay forma de guardar fotos), el correo es una notificación de
 * cortesía: si faltan GMAIL_USER/GMAIL_APP_PASSWORD o el envío falla, el
 * taller sigue funcionando exactamente igual — se registra un aviso y se
 * sigue de largo, nunca se bloquea la operación real (crear la orden,
 * marcar la cotización como enviada, cambiar el estado).
 *
 * Se envía por SMTP directo con una cuenta de Gmail (en vez de un
 * servicio transaccional como Resend/SendGrid) a propósito: esos
 * servicios exigen verificar un dominio propio para poder enviar a
 * destinatarios reales (su remitente de pruebas solo llega a la cuenta
 * del propio servicio), y el taller no tiene un dominio propio. Gmail no
 * tiene esa restricción — eso sí, con un límite de ~500 correos/día y
 * más riesgo de caer en spam que un servicio dedicado, aceptable para el
 * volumen de notificaciones de un taller.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private fromAddress: string;

  constructor(private businessSettings: BusinessSettingsService) {}

  onModuleInit() {
    const user = process.env.GMAIL_USER;
    // Ver nota en .env.example: NO es la contraseña normal de la cuenta —
    // hay que generar una "contraseña de aplicación" en Google (requiere
    // verificación en 2 pasos activada).
    const pass = process.env.GMAIL_APP_PASSWORD;
    this.fromAddress = user ?? "";

    if (!user || !pass) {
      this.logger.warn(
        "GMAIL_USER/GMAIL_APP_PASSWORD no están configurados — no se enviarán correos de notificación a clientes.",
      );
      return;
    }
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }

  private portalUrl(path: string): string {
    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
    return `${frontendUrl}${path}`;
  }

  private async send(to: string | null | undefined, subject: string, html: string): Promise<void> {
    if (!this.transporter) return;
    if (!to) return; // El cliente no tiene correo registrado — no hay a quién avisar.

    try {
      const { businessName } = await this.businessSettings.getBrandingForDocuments();
      // Gmail ignora/sobreescribe un remitente que no sea la cuenta
      // autenticada — a diferencia de Resend, aquí no tiene sentido un
      // MAIL_FROM con otra dirección, solo se personaliza el nombre
      // visible delante del correo real.
      await this.transporter.sendMail({
        from: `${businessName} <${this.fromAddress}>`,
        to,
        subject,
        html,
      });
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
    const { businessName } = await this.businessSettings.getBrandingForDocuments();
    const { subject, html } = orderReceivedEmail({
      customerName: params.customerName,
      orderCode: params.orderCode,
      deviceLabel: params.deviceLabel,
      reportedIssue: params.reportedIssue,
      portalUrl: this.portalUrl("/portal/login"),
      businessName,
    });
    await this.send(params.to, subject, html);
  }

  async sendQuotationSent(params: {
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
    await this.send(params.to, subject, html);
  }

  async sendOrderReady(params: {
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
    await this.send(params.to, subject, html);
  }
}
