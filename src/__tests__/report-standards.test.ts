/**
 * Pruebas de los estandares de informe (Grupos 1..5) y su aplicacion al
 * generador local de informes.
 */
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_REPORT_STANDARD_ID,
  REPORT_STANDARDS,
  buildStandardSections,
  getReportStandard,
} from '../config/report-standards';
import { _generateFallbackForTests } from '../services/ai.service';
import type { AuditResult } from '../types';

function fakeAudit(): AuditResult {
  return {
    url: 'https://panama.com',
    finalUrl: 'https://panama.com',
    auditedAt: new Date().toISOString(),
    durationMs: 900,
    http: { statusCode: 200, responseTimeMs: 800, redirected: false, contentType: 'text/html', reachable: true },
    performance: { score: 40, lcpMs: 4200, cls: 0.2, tbtMs: 500, speedIndexMs: 5000, source: 'pagespeed' },
    seo: {
      score: 55,
      title: { value: 'Tienda', length: 6, ok: false },
      metaDescription: { value: null, length: 0, ok: false },
      h1Count: 0,
      headingCount: 2,
      images: { total: 4, missingAlt: 2 },
      hasViewport: false,
      hasCanonical: false,
      hasOpenGraph: false,
      hasLangAttribute: false,
      lang: null,
      robotsTxt: false,
      sitemapXml: false,
    },
    security: { https: false, hsts: false, xContentTypeOptions: false, xFrameOptions: false, contentSecurityPolicy: false },
    overallScore: 45,
    issues: [
      { id: 'low-performance', area: 'performance', severity: 'critical', title: 'Lento', detail: 'd' },
      { id: 'missing-title', area: 'seo', severity: 'critical', title: 'Sin titulo', detail: 'd' },
      { id: 'no-https', area: 'security', severity: 'critical', title: 'Sin HTTPS', detail: 'd' },
    ],
  };
}

describe('catalogo de estandares', () => {
  it('define los 5 grupos esperados', () => {
    expect(REPORT_STANDARDS).toHaveLength(5);
    expect(REPORT_STANDARDS.map((s) => s.group)).toEqual([1, 2, 3, 4, 5]);
    expect(REPORT_STANDARDS.map((s) => s.code)).toEqual([
      'NIST SP 800-61',
      'ISO/IEC 27035',
      'ISO/IEC 27001',
      'ENISA',
      "SANS Incident Handler's Handbook",
    ]);
  });

  it('getReportStandard resuelve por id o cae en la de por defecto', () => {
    expect(getReportStandard('iso-27035').group).toBe(2);
    expect(getReportStandard('inexistente').id).toBe(DEFAULT_REPORT_STANDARD_ID);
    expect(getReportStandard(undefined).id).toBe(DEFAULT_REPORT_STANDARD_ID);
  });

  it('cada norma define al menos 4 secciones', () => {
    for (const s of REPORT_STANDARDS) {
      expect(s.sections.length, s.id).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('buildStandardSections', () => {
  it('genera una seccion por fase con el contenido correspondiente', () => {
    const standard = getReportStandard('sans');
    const sections = buildStandardSections(standard, {
      summary: 'Resumen X',
      strengths: ['Punto A'],
      improvements: ['Mejora B'],
      quickWins: ['Rapida C'],
    });
    expect(sections).toHaveLength(standard.sections.length);
    expect(sections[0]?.body).toContain('Resumen X');
    expect(sections.find((s) => s.id === 'identification')?.body).toContain('Punto A');
    expect(sections.find((s) => s.id === 'containment')?.body).toContain('Mejora B');
    expect(sections.find((s) => s.id === 'recovery')?.body).toContain('Rapida C');
  });
});

describe('informe estructurado por norma', () => {
  it('el generador local adjunta la norma y las secciones', () => {
    const report = _generateFallbackForTests(fakeAudit(), { businessName: 'Tienda' }, getReportStandard('iso-27001'));
    expect(report.standard?.id).toBe('iso-27001');
    expect(report.standard?.group).toBe(3);
    expect(report.sections?.length).toBeGreaterThan(0);
    expect(report.sections?.[0]?.title).toContain('SGSI');
  });

  it('usa la norma por defecto si no se indica', () => {
    const report = _generateFallbackForTests(fakeAudit(), { businessName: 'Tienda' });
    expect(report.standard?.id).toBe(DEFAULT_REPORT_STANDARD_ID);
    expect(report.sections?.[0]?.title).toBe('Preparacion');
  });
});
