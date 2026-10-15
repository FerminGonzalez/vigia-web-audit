/**
 * views/pages.ts
 * -----------------------------------------------------------------------------
 * Paginas auxiliares: gracias (post-pago), portal del cliente y estado.
 */
import { escapeHtml } from '../templates/report-email';
import { layout, BRAND } from './layout';

function scoreColor(score: number): string {
  if (score >= 80) return 'var(--good)';
  if (score >= 55) return 'var(--warn)';
  return 'var(--bad)';
}

/** Pagina de agradecimiento tras completar el pago. */
export function renderThanks(): string {
  const body = `<section><div class="container" style="max-width:640px;">
    <div class="card" style="text-align:center;">
      <div style="font-size:48px;">🎉</div>
      <h1 style="font-size:26px;">¡Listo! Tu suscripción está activa</h1>
      <p class="muted">Te enviamos un correo de bienvenida. A partir de la próxima ronda semanal
         recibirás tu informe automáticamente.</p>
      <p class="muted">Revisa tu bandeja de entrada (y la carpeta de spam) para encontrar tu enlace
         de acceso al portal del cliente.</p>
      <a class="btn btn-primary" href="/">Volver al inicio</a>
    </div>
  </div></section>`;
  return layout({ title: 'Suscripción activa', body, showNav: false });
}

export interface PortalAudit {
  createdAt: Date;
  overallScore: number;
  performanceScore: number | null;
  seoScore: number | null;
}

export interface PortalData {
  businessName: string;
  email: string;
  subscriptionStatus: string;
  sites: { id: string; url: string; isActive: boolean }[];
  audits: PortalAudit[];
  portalUrl: string | null;
}

/** Portal del cliente: resumen y histórico de auditorías. */
export function renderPortal(data: PortalData): string {
  const filas = data.audits.length
    ? data.audits
        .map(
          (a) => `<tr>
            <td>${a.createdAt.toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
            <td style="font-weight:700;color:${scoreColor(a.overallScore)};">${a.overallScore}/100</td>
            <td>${a.performanceScore ?? '--'}</td>
            <td>${a.seoScore ?? '--'}</td>
          </tr>`,
        )
        .join('')
    : `<tr><td colspan="4" class="muted">Aún no hay auditorías. Recibirás el primer informe pronto.</td></tr>`;

  const body = `<section><div class="container">
    <h1 style="font-size:28px;">Hola, ${escapeHtml(data.businessName)}</h1>
    <p class="muted">Estado de tu suscripción:
      <strong>${escapeHtml(data.subscriptionStatus)}</strong>
    </p>

    <div class="card" style="margin:20px 0;">
      <h2 style="font-size:18px;margin:0 0 12px;">Sitios que vigilamos</h2>
      ${data.sites
        .map(
          (s) =>
            `<p style="margin:6px 0;">🌐 <strong>${escapeHtml(s.url)}</strong>
             <span class="muted">· ${s.isActive ? 'activo' : 'pausado'}</span></p>`,
        )
        .join('') || '<p class="muted">Aún no registramos sitios.</p>'}
    </div>

    <div class="card" style="margin:20px 0;">
      <h2 style="font-size:18px;margin:0 0 12px;">Histórico de auditorías</h2>
      <table>
        <thead><tr><th>Fecha</th><th>Global</th><th>Velocidad</th><th>SEO</th></tr></thead>
        <tbody>${filas}</tbody>
      </table>
    </div>

    <div style="display:flex;gap:10px;flex-wrap:wrap;">
      ${data.portalUrl ? `<a class="btn btn-primary" href="${data.portalUrl}">Gestionar suscripción</a>` : ''}
      <a class="btn btn-ghost" href="/">Inicio</a>
    </div>
    <p class="muted" style="font-size:13px;margin-top:20px;">¿Dudas? Escríbenos a ${BRAND.email}</p>
  </div></section>`;
  return layout({ title: 'Mi panel', body });
}

/** Pagina generica de mensaje (error/aviso). */
export function renderMessage(title: string, message: string, ok = true): string {
  const body = `<section><div class="container" style="max-width:560px;">
    <div class="card" style="text-align:center;">
      <div style="font-size:44px;">${ok ? '✅' : '⚠️'}</div>
      <h1 style="font-size:24px;">${escapeHtml(title)}</h1>
      <p class="muted">${escapeHtml(message)}</p>
      <a class="btn btn-primary" href="/">Ir al inicio</a>
    </div>
  </div></section>`;
  return layout({ title, body, showNav: false });
}
