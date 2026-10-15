/**
 * services/email.service.ts
 * -----------------------------------------------------------------------------
 * Envio de correos transaccionales con Resend.
 *
 * Expone funciones de alto nivel (no solo "enviar HTML") para que los cron jobs
 * y controladores no conozcan los detalles del proveedor de correo.
 */
import { Resend } from 'resend';
import { env, isProduction } from '../config/env';
import { logger } from '../config/logger';
import { ExternalServiceError } from '../utils/errors';
import { signClientToken } from './auth-token.service';
import type { AiReport, AuditResult, BusinessContext } from '../types';
import {
  renderReportEmail,
  renderReportSubject,
  type ReportEmailData,
} from '../templates/report-email';

const resend = new Resend(env.RESEND_API_KEY);

export interface SendResult {
  id: string;
  to: string;
}

/** Envia el informe semanal a un cliente. */
export async function sendWeeklyReport(params: {
  to: string;
  business: BusinessContext;
  audit: AuditResult;
  report: AiReport;
  clientId: string;
}): Promise<SendResult> {
  const { to, business, audit, report, clientId } = params;

  // Enlace firmado: el cliente entra al portal sin usuario ni contrasena.
  const token = signClientToken(clientId, 30);
  const data: ReportEmailData = {
    business,
    audit,
    report,
    manageUrl: `${env.APP_BASE_URL}/cuenta?token=${encodeURIComponent(token)}`,
    unsubscribeUrl: `${env.APP_BASE_URL}/cancelar?token=${encodeURIComponent(token)}`,
  };

  const html = renderReportEmail(data);
  const subject = renderReportSubject(data);

  return sendEmail({ to, subject, html });
}

/**
 * Informe de muestra para el motor de captacion (lead magnet).
 * No requiere suscripcion ni registro.
 */
export async function sendSampleReport(params: {
  to: string;
  business: BusinessContext;
  audit: AuditResult;
  report: AiReport;
}): Promise<SendResult> {
  const { to, business, audit, report } = params;
  const data: ReportEmailData = {
    business,
    audit,
    report,
    manageUrl: `${env.APP_BASE_URL}/#precios`,
    unsubscribeUrl: `${env.APP_BASE_URL}/#precios`,
  };
  return sendEmail({
    to,
    subject: `Tu informe de muestra: ${business.businessName} (${audit.overallScore}/100)`,
    html: renderReportEmail(data),
  });
}

/** Correo de bienvenida tras una suscripcion exitosa. */
export async function sendWelcomeEmail(params: {
  to: string;
  businessName: string;
  siteUrl: string;
  clientId: string;
}): Promise<SendResult> {
  const { to, businessName, siteUrl, clientId } = params;
  const portalUrl = `${env.APP_BASE_URL}/cuenta?token=${encodeURIComponent(signClientToken(clientId, 30))}`;
  const html = `<!DOCTYPE html><html lang="es"><body style="font-family:Arial,sans-serif;background:#f4f6fb;padding:24px;">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:28px;border:1px solid #e5e7eb;">
      <h1 style="color:#1f2937;font-size:20px;">¡Bienvenido a Vigia Web Audit! 🎉</h1>
      <p style="color:#374151;font-size:15px;line-height:1.6;">Hola <strong>${businessName}</strong>,</p>
      <p style="color:#374151;font-size:15px;line-height:1.6;">
        Tu suscripcion esta activa. A partir de ahora analizaremos <strong>${siteUrl}</strong>
        automaticamente cada semana y recibiras un informe claro en este mismo correo.
      </p>
      <p style="margin:24px 0;">
        <a href="${portalUrl}" style="background:#2563eb;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:600;">
          Entrar a mi panel
        </a>
      </p>
      <p style="color:#6b7280;font-size:13px;">No necesitas hacer nada: todo es automatico.</p>
    </div>
  </body></html>`;

  return sendEmail({ to, subject: `Bienvenido a Vigia Web Audit, ${businessName}`, html });
}

/** Envia un correo de la secuencia de nutricion (drip). */
export async function sendNurtureEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendResult> {
  return sendEmail(params);
}

/** Aviso interno para el administrador (altas, bajas, errores criticos). */export async function sendAdminAlert(subject: string, text: string): Promise<void> {
  if (!env.ADMIN_NOTIFICATION_EMAIL) return;
  try {
    await sendEmail({
      to: env.ADMIN_NOTIFICATION_EMAIL,
      subject: `[Vigia] ${subject}`,
      html: `<pre style="font-family:monospace;font-size:13px;white-space:pre-wrap;">${text}</pre>`,
    });
  } catch (error) {
    // Los avisos internos nunca deben romper el flujo principal.
    logger.warn({ err: (error as Error).message }, 'No se pudo enviar alerta al admin');
  }
}

/** Capa de bajo nivel compartida. */
async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendResult> {
  const { to, subject, html } = params;

  // En modo desarrollo sin clave real, no llamamos a Resend.
  if (!isProduction && env.RESEND_API_KEY.includes('xxxxxxxx')) {
    logger.info({ to, subject }, '[DEV] Correo simulado (clave de Resend ficticia)');
    return { id: `dev_${Date.now()}`, to };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
      replyTo: env.EMAIL_REPLY_TO,
    });

    if (error) {
      throw new ExternalServiceError('Resend', error.message, error);
    }

    logger.info({ to, subject, id: data?.id }, 'Correo enviado');
    return { id: data?.id ?? 'desconocido', to };
  } catch (error) {
    if (error instanceof ExternalServiceError) throw error;
    throw new ExternalServiceError('Resend', (error as Error).message);
  }
}
