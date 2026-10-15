/**
 * types/index.ts
 * -----------------------------------------------------------------------------
 * Tipos de dominio compartidos por los servicios de auditoria, IA y correo.
 */

export type Severity = 'critical' | 'warning' | 'info';
export type AuditArea = 'performance' | 'seo' | 'security' | 'content' | 'availability';

/** Un hallazgo concreto detectado durante la auditoria. */
export interface AuditIssue {
  id: string;
  area: AuditArea;
  severity: Severity;
  /** Titulo corto para el cliente (sin jerga tecnica). */
  title: string;
  /** Explicacion tecnica detallada (uso interno). */
  detail: string;
}

/** Metricas de rendimiento provenientes de PageSpeed Insights / Lighthouse. */
export interface PerformanceMetrics {
  score: number | null;
  lcpMs: number | null;
  cls: number | null;
  tbtMs: number | null;
  speedIndexMs: number | null;
  /** Origen de las metricas: 'pagespeed' o 'unavailable'. */
  source: 'pagespeed' | 'unavailable';
}

/** Analisis on-page realizado localmente con Cheerio. */
export interface SeoAnalysis {
  score: number | null;
  title: { value: string | null; length: number; ok: boolean };
  metaDescription: { value: string | null; length: number; ok: boolean };
  h1Count: number;
  headingCount: number;
  images: { total: number; missingAlt: number };
  hasViewport: boolean;
  hasCanonical: boolean;
  hasOpenGraph: boolean;
  hasLangAttribute: boolean;
  lang: string | null;
  robotsTxt: boolean | null;
  sitemapXml: boolean | null;
}

/** Cabeceras de seguridad basicas. */
export interface SecurityAnalysis {
  https: boolean;
  hsts: boolean;
  xContentTypeOptions: boolean;
  xFrameOptions: boolean;
  contentSecurityPolicy: boolean;
}

/** Resultado completo de una auditoria. */
export interface AuditResult {
  url: string;
  finalUrl: string;
  auditedAt: string;
  durationMs: number;
  http: {
    statusCode: number;
    responseTimeMs: number;
    redirected: boolean;
    contentType: string | null;
    reachable: boolean;
  };
  performance: PerformanceMetrics;
  seo: SeoAnalysis;
  security: SecurityAnalysis;
  /** Puntuacion global 0-100 ponderada. */
  overallScore: number;
  issues: AuditIssue[];
}

/** Informe redactado por IA, listo para el cliente final. */
export interface AiReport {
  /** Resumen ejecutivo en 2-4 frases, en lenguaje de negocios. */
  executiveSummary: string;
  /** Logros o puntos fuertes detectados. */
  strengths: string[];
  /** Mejoras recomendadas, explicadas sin jerga. */
  improvements: string[];
  /** Acciones rapidas de alto impacto. */
  quickWins: string[];
  /** Frase de cierre con llamada a la accion. */
  callToAction: string;
  /** Proveedor que genero el informe. */
  provider: 'anthropic' | 'openai' | 'fallback';
}

/** Contexto de negocio que enriquece el prompt de IA. */
export interface BusinessContext {
  businessName: string;
  sector?: string | null;
  city?: string | null;
  /** Resultado de la auditoria anterior, para calcular tendencia. */
  previousScore?: number | null;
}
