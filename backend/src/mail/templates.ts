import { BUSINESS_NAME } from "../common/config/branding.config";

/**
 * Envoltorio HTML común a los 3 correos — estilos en línea a propósito
 * (Gmail/Outlook/etc. ignoran o recortan <style> en el <head> de un
 * correo, así que cualquier CSS que importe de verdad tiene que ir
 * inline). Nada de imágenes ni fuentes externas: se mantiene simple para
 * que se vea igual de bien en cualquier cliente de correo.
 */
function emailLayout(title: string, bodyHtml: string): string {
  return `
<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background-color:#111827;padding:20px 28px;">
                <span style="color:#ffffff;font-size:15px;font-weight:bold;letter-spacing:0.3px;">${BUSINESS_NAME}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 16px;font-size:18px;color:#111827;">${title}</h1>
                <div style="font-size:14px;line-height:1.6;color:#374151;">${bodyHtml}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;background-color:#f9fafb;border-top:1px solid #e5e7eb;">
                <p style="margin:0;font-size:11px;color:#9ca3af;">
                  Este es un mensaje automático de ${BUSINESS_NAME} — no respondas a este correo.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function portalButton(url: string, label: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px;">
      <tr>
        <td style="background-color:#2563eb;border-radius:6px;">
          <a href="${url}" style="display:inline-block;padding:10px 20px;font-size:14px;color:#ffffff;text-decoration:none;font-weight:bold;">
            ${label}
          </a>
        </td>
      </tr>
    </table>`;
}

export function orderReceivedEmail(params: {
  customerName: string;
  orderCode: string;
  deviceLabel: string;
  reportedIssue: string;
  portalUrl: string;
}): { subject: string; html: string } {
  const { customerName, orderCode, deviceLabel, reportedIssue, portalUrl } = params;
  const body = `
    <p>Hola ${customerName},</p>
    <p>Confirmamos que recibimos tu equipo <strong>${deviceLabel}</strong> en el taller, bajo la orden <strong>${orderCode}</strong>.</p>
    <p><strong>Falla reportada:</strong> ${reportedIssue}</p>
    <p>Te avisaremos por este mismo medio cuando tengamos una cotización lista o cuando el equipo esté listo para recoger.</p>
    ${portalButton(portalUrl, "Ver el estado de mi reparación")}
  `;
  return { subject: `Recibimos tu equipo — Orden ${orderCode}`, html: emailLayout("Equipo recibido", body) };
}

export function quotationSentEmail(params: {
  customerName: string;
  quotationNumber: string;
  total: string;
  portalUrl: string;
}): { subject: string; html: string } {
  const { customerName, quotationNumber, total, portalUrl } = params;
  const body = `
    <p>Hola ${customerName},</p>
    <p>Tu cotización <strong>${quotationNumber}</strong> ya está lista, por un total de <strong>${total}</strong>.</p>
    <p>Ingresa al portal para ver el detalle y aprobarla o rechazarla.</p>
    ${portalButton(portalUrl, "Ver mi cotización")}
  `;
  return {
    subject: `Tu cotización ${quotationNumber} está lista`,
    html: emailLayout("Cotización lista", body),
  };
}

export function orderReadyEmail(params: {
  customerName: string;
  orderCode: string;
  deviceLabel: string;
  balance: string;
  portalUrl: string;
}): { subject: string; html: string } {
  const { customerName, orderCode, deviceLabel, balance, portalUrl } = params;
  const balanceLine =
    Number(balance) > 0
      ? `<p><strong>Saldo pendiente:</strong> ${balance}</p>`
      : "";
  const body = `
    <p>Hola ${customerName},</p>
    <p>Tu equipo <strong>${deviceLabel}</strong> (orden <strong>${orderCode}</strong>) ya está listo para que pases a recogerlo.</p>
    ${balanceLine}
    ${portalButton(portalUrl, "Ver el detalle de mi orden")}
  `;
  return { subject: `Tu equipo está listo — Orden ${orderCode}`, html: emailLayout("Equipo listo para entrega", body) };
}
