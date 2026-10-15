/**
 * Pruebas de la plantilla de correo del informe.
 */
import { describe, expect, it } from 'vitest';
import { escapeHtml, renderReportEmail, renderReportSubject } from '../templates/report-email';
import type { AiReport, AuditResult } from '../types';

const audit: AuditResult = {
  url: 'https://panama.com',
  finalUrl: 'https://panama.com',
  auditedAt: new Date().toISOString(),
  durationMs: 800,
  http: { statusCode: 200, responseTimeMs: 400, redirected: false, contentType: 'text/html', reachable: true },
  performance: { score: 70, lcpMs: 2000, cls: 0.05, tbtMs: 200, speedIndexMs: 2000, source: 'pagespeed' },
  seo: {
    score: 80,
    title: { value: 'Titulo', length: 6, ok: false },
    metaDescription: { value: 'Desc', length: 4, ok: false },
    h1Count: 1,
    headingCount: 3,
    images: { total: 2, missingAlt: 1 },
    hasViewport: true,
    hasCanonical: true,
    hasOpenGraph: true,
    hasLangAttribute: true,
    lang: 'es',
    robotsTxt: true,
    sitemapXml: true,
  },
  security: { https: true, hsts: true, xContentTypeOptions: true, xFrameOptions: false, contentSecurityPolicy: false },
  overallScore: 75,
  issues: [],
};

const report: AiReport = {
  executiveSummary: 'Resumen de prueba',
  strengths: ['Punto fuerte'],
  improvements: ['Mejora uno'],
  quickWins: ['Accion rapida'],
  callToAction: 'Contactanos',
  provider: 'fallback',
};

describe('escapeHtml', () => {
  it('escapa caracteres peligrosos (previene inyeccion HTML)', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
    );
  });
});

describe('renderReportEmail', () => {
  const html = renderReportEmail({
    business: { businessName: 'Tienda Panamá' },
    audit,
    report,
    manageUrl: 'https://app/cuenta?token=x',
    unsubscribeUrl: 'https://app/baja?token=x',
  });

  it('incluye el nombre del negocio y la puntuacion', () => {
    expect(html).toContain('Tienda Panamá');
    expect(html).toContain('75');
  });

  it('incluye las mejoras y los enlaces de gestion', () => {
    expect(html).toContain('Mejora uno');
    expect(html).toContain('https://app/cuenta?token=x');
  });

  it('genera un asunto con la puntuacion', () => {
    const asunto = renderReportSubject({
      business: { businessName: 'Tienda Panamá' },
      audit,
      report,
      manageUrl: '',
      unsubscribeUrl: '',
    });
    expect(asunto).toContain('Tienda Panamá');
    expect(asunto).toContain('75/100');
  });
});
