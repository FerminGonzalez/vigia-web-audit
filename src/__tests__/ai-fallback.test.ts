/**
 * Pruebas del generador de informes local (fallback sin IA).
 * Garantiza que el SaaS SIEMPRE puede producir y enviar un informe.
 */
import { describe, expect, it } from 'vitest';
import { _generateFallbackForTests } from '../services/ai.service';
import type { AuditResult } from '../types';

function fakeAudit(overrides: Partial<AuditResult> = {}): AuditResult {
  return {
    url: 'https://panama.com',
    finalUrl: 'https://panama.com',
    auditedAt: new Date().toISOString(),
    durationMs: 1200,
    http: {
      statusCode: 200,
      responseTimeMs: 900,
      redirected: false,
      contentType: 'text/html',
      reachable: true,
    },
    performance: { score: 45, lcpMs: 4100, cls: 0.2, tbtMs: 600, speedIndexMs: 5000, source: 'pagespeed' },
    seo: {
      score: 60,
      title: { value: 'Mi negocio', length: 10, ok: false },
      metaDescription: { value: null, length: 0, ok: false },
      h1Count: 0,
      headingCount: 2,
      images: { total: 5, missingAlt: 3 },
      hasViewport: false,
      hasCanonical: false,
      hasOpenGraph: false,
      hasLangAttribute: false,
      lang: null,
      robotsTxt: false,
      sitemapXml: false,
    },
    security: {
      https: false,
      hsts: false,
      xContentTypeOptions: false,
      xFrameOptions: false,
      contentSecurityPolicy: false,
    },
    overallScore: 48,
    issues: [
      { id: 'low-performance', area: 'performance', severity: 'critical', title: 'Lento', detail: 'd' },
      { id: 'missing-description', area: 'seo', severity: 'warning', title: 'Sin descripcion', detail: 'd' },
      { id: 'no-https', area: 'security', severity: 'critical', title: 'Sin HTTPS', detail: 'd' },
    ],
    ...overrides,
  };
}

describe('generateFallback (IA local)', () => {
  it('devuelve un informe completo y marcado como fallback', () => {
    const report = _generateFallbackForTests(fakeAudit(), { businessName: 'Tienda Panama' });
    expect(report.provider).toBe('fallback');
    expect(report.executiveSummary).toContain('Tienda Panama');
    expect(report.improvements.length).toBeGreaterThan(0);
    expect(report.quickWins.length).toBeGreaterThan(0);
    expect(report.callToAction.length).toBeGreaterThan(0);
  });

  it('traduce los hallazgos a lenguaje no tecnico', () => {
    const report = _generateFallbackForTests(fakeAudit(), { businessName: 'Tienda Panama' });
    const texto = report.improvements.join(' ').toLowerCase();
    // No debe contener jerga tecnica cruda.
    expect(texto).not.toContain('lcp');
    expect(texto).not.toContain('h1');
  });

  it('reconoce un sitio en buen estado', () => {
    const bueno = fakeAudit({
      overallScore: 92,
      performance: { score: 95, lcpMs: 1200, cls: 0.01, tbtMs: 80, speedIndexMs: 1500, source: 'pagespeed' },
      security: { https: true, hsts: true, xContentTypeOptions: true, xFrameOptions: true, contentSecurityPolicy: true },
      issues: [],
    });
    const report = _generateFallbackForTests(bueno, { businessName: 'Buen Negocio' });
    expect(report.executiveSummary).toContain('92');
    expect(report.strengths.length).toBeGreaterThan(0);
  });
});
