/**
 * templates/report-email.ts
 * -----------------------------------------------------------------------------
 * Plantilla HTML del informe semanal.
 * Usa tablas e inline styles (compatibilidad con Gmail, Outlook y moviles).
 * Los colores siguen una paleta sobria y profesional.
 */
import type { AiReport, AuditResult, BusinessContext } from '../types';

const COLORS = {
  bg: '#f4f6fb',
  card: '#ffffff',
  text: '#1f2937',
  muted: '#6b7280',
  primary: '#1d4ed8',
  border: '#e5e7eb',
  good: '#059669',
  warn: '#d97706',
  bad: '#dc2626',
};

/** Color de la puntuacion segun su valor. */
function scoreColor(score: number): string {
  if (score >= 80) return COLORS.good;
  if (score >= 55) return COLORS.warn;
  return COLORS.bad;
}

/** Escapa texto dinamico para inyeccion segura en HTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderList(items: string[], marker: string, color: string): string {
  if (items.length === 0) return '';
  const lis = items
    .map(
      (item) =>
        `<tr><td style="padding:6px 0;vertical-align:top;width:24px;color:${color};font-size:16px;">${marker}</td>` +
        `<td style="padding:6px 0;color:${COLORS.text};font-size:15px;line-height:1.5;">${escapeHtml(item)}</td></tr>`,
    )
    .join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%">${lis}</table>`;
}

function section(title: string, contentHtml: string): string {
  if (!contentHtml) return '';
  return `
    <div style="margin-top:28px;">
      <h2 style="margin:0 0 12px;font-size:16px;color:${COLORS.text};font-weight:600;">${title}</h2>
      ${contentHtml}
    </div>`;
}

export interface ReportEmailData {
  business: BusinessContext;
  audit: AuditResult;
  report: AiReport;
  /** Enlace para gestionar/cancelar la suscripcion (portal de Stripe). */
  manageUrl: string;
  unsubscribeUrl: string;
}

/**
 * Genera el HTML completo del correo del informe semanal.
 */
export function renderReportEmail(data: ReportEmailData): string {
  const { business, audit, report } = data;
  const score = audit.overallScore;
  const color = scoreColor(score);

  const tendencia =
    typeof business.previousScore === 'number'
      ? (() => {
          const delta = score - business.previousScore;
          if (delta > 0) return `<span style="color:${COLORS.good};">▲ ${delta} pts respecto a la semana pasada</span>`;
          if (delta < 0) return `<span style="color:${COLORS.bad};">▼ ${Math.abs(delta)} pts respecto a la semana pasada</span>`;
          return '<span style="color:' + COLORS.muted + ';">Sin cambios respecto a la semana pasada</span>';
        })()
      : 'Primer informe de tu sitio';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Informe semanal - ${escapeHtml(business.businessName)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.bg};font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">

    <!-- Encabezado -->
    <div style="background:${COLORS.card};border-radius:12px;padding:28px;border:1px solid ${COLORS.border};">
      <p style="margin:0 0 4px;font-size:13px;color:${COLORS.muted};text-transform:uppercase;letter-spacing:0.5px;">Informe semanal automatico</p>
      <h1 style="margin:0 0 20px;font-size:22px;color:${COLORS.text};">${escapeHtml(business.businessName)}</h1>

      <!-- Puntuacion -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:middle;">
            <div style="font-size:44px;font-weight:700;color:${color};line-height:1;">${score}<span style="font-size:18px;color:${COLORS.muted};">/100</span></div>
            <div style="font-size:13px;color:${COLORS.muted};margin-top:6px;">Puntuacion global</div>
          </td>
          <td style="vertical-align:middle;text-align:right;font-size:13px;color:${COLORS.muted};">
            ${tendencia}
          </td>
        </tr>
      </table>

      <!-- Mini metricas -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border-top:1px solid ${COLORS.border};padding-top:16px;">
        <tr>
          <td width="33%" style="text-align:center;">
            <div style="font-size:20px;font-weight:600;color:${COLORS.text};">${audit.performance.score ?? '--'}</div>
            <div style="font-size:12px;color:${COLORS.muted};">Velocidad</div>
          </td>
          <td width="33%" style="text-align:center;">
            <div style="font-size:20px;font-weight:600;color:${COLORS.text};">${audit.seo.score ?? '--'}</div>
            <div style="font-size:12px;color:${COLORS.muted};">SEO</div>
          </td>
          <td width="33%" style="text-align:center;">
            <div style="font-size:20px;font-weight:600;color:${COLORS.text};">${audit.http.responseTimeMs}<span style="font-size:12px;">ms</span></div>
            <div style="font-size:12px;color:${COLORS.muted};">Respuesta</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Resumen ejecutivo -->
    <div style="background:${COLORS.card};border-radius:12px;padding:28px;border:1px solid ${COLORS.border};margin-top:16px;">
      <h2 style="margin:0 0 12px;font-size:16px;color:${COLORS.text};font-weight:600;">Resumen</h2>
      <p style="margin:0;font-size:15px;line-height:1.6;color:${COLORS.text};">${escapeHtml(report.executiveSummary)}</p>

      ${section('Lo que va bien', renderList(report.strengths, '✓', COLORS.good))}
      ${section('Que puedes mejorar', renderList(report.improvements, '→', COLORS.primary))}
      ${section('Acciones rapidas', renderList(report.quickWins, '⚡', COLORS.warn))}

      <div style="margin-top:28px;padding:16px;background:#eef2ff;border-radius:8px;">
        <p style="margin:0;font-size:15px;color:${COLORS.primary};font-weight:600;">${escapeHtml(report.callToAction)}</p>
      </div>
    </div>

    <!-- Pie -->
    <div style="text-align:center;margin-top:24px;font-size:12px;color:${COLORS.muted};line-height:1.6;">
      <p style="margin:0 0 8px;">Analizamos <strong>${escapeHtml(audit.finalUrl)}</strong> automaticamente cada semana.</p>
      <p style="margin:0;">
        <a href="${data.manageUrl}" style="color:${COLORS.primary};text-decoration:none;">Gestionar suscripcion</a>
        &nbsp;·&nbsp;
        <a href="${data.unsubscribeUrl}" style="color:${COLORS.muted};text-decoration:none;">Cancelar</a>
      </p>
      <p style="margin:12px 0 0;">Vigia Web Audit · Panama</p>
    </div>
  </div>
</body>
</html>`;
}

/** Asunto del correo, orientado a la accion. */
export function renderReportSubject(data: ReportEmailData): string {
  return `📊 Informe semanal de ${data.business.businessName}: ${data.audit.overallScore}/100`;
}
