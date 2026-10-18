/**
 * services/audit.service.ts
 * -----------------------------------------------------------------------------
 * Servicio de analisis web y auditoria tecnica.
 *
 * Combina tres fuentes de datos:
 *   1. Peticion HTTP directa  -> disponibilidad, tiempo de respuesta, cabeceras.
 *   2. Analisis del HTML (Cheerio) -> SEO on-page, contenido, imagenes.
 *   3. Google PageSpeed Insights (Lighthouse) -> metricas de rendimiento reales.
 *
 * El resultado es un objeto `AuditResult` normalizado y tipado, independiente
 * del proveedor, listo para ser consumido por el servicio de IA.
 */
import * as cheerio from 'cheerio';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { fetchWithTimeout, safeFetchText } from '../lib/http';
import { assertPublicUrl } from '../lib/ssrf-guard';
import type {
  AuditIssue,
  AuditResult,
  PerformanceMetrics,
  SecurityAnalysis,
  SeoAnalysis,
  Severity,
} from '../types';

// ---------------------------------------------------------------------------
// Utilidades internas
// ---------------------------------------------------------------------------

/** Asegura que la URL tenga protocolo. Por defecto usa https. */
export function normalizeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, '')}`;
}

/** Extrae el origen (protocolo + host) de una URL. */
function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

/** Limita un valor numerico a un rango. */
const clamp = (value: number, min = 0, max = 100): number =>
  Math.max(min, Math.min(max, Math.round(value)));

// ---------------------------------------------------------------------------
// Paso 1: analisis HTTP
// ---------------------------------------------------------------------------

interface HttpProbe {
  reachable: boolean;
  statusCode: number;
  responseTimeMs: number;
  redirected: boolean;
  finalUrl: string;
  contentType: string | null;
  html: string;
  headers: Headers | null;
}

/** Numero maximo de redirecciones que seguimos manualmente (defensa SSRF). */
const MAX_REDIRECTS = 5;

/**
 * Sondea el sitio siguiendo redirecciones MANUALMENTE para poder validar cada
 * salto con el guard anti-SSRF: un host publico no puede redirigirnos a una IP
 * interna (metadata cloud, localhost, rangos privados...).
 */
async function probeHttp(url: string): Promise<HttpProbe> {
  const started = Date.now();
  let actual = url;
  let redirected = false;

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      const res = await fetchWithTimeout(actual, {
        timeoutMs: env.AUDIT_TIMEOUT_MS,
        retries: 1,
        label: `probe:${actual}`,
        redirect: 'manual',
      });

      // Redireccion: validamos el destino antes de seguirlo.
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        if (!location) break;
        const siguiente = new URL(location, actual).toString();
        await assertPublicUrl(siguiente); // lanza si apunta a un destino interno
        actual = siguiente;
        redirected = true;
        continue;
      }

      const html = await res.text();
      return {
        reachable: true,
        statusCode: res.status,
        responseTimeMs: Date.now() - started,
        redirected,
        finalUrl: res.url || actual,
        contentType: res.headers.get('content-type'),
        html,
        headers: res.headers,
      };
    }

    // Cadena de redirecciones agotada (posible bucle) o destino bloqueado.
    logger.warn({ url: actual }, 'El sitio no respondio tras las redirecciones');
    return {
      reachable: false,
      statusCode: 0,
      responseTimeMs: Date.now() - started,
      redirected,
      finalUrl: actual,
      contentType: null,
      html: '',
      headers: null,
    };
  } catch (error) {
    logger.warn({ url: actual, err: (error as Error).message }, 'El sitio no responde');
    return {
      reachable: false,
      statusCode: 0,
      responseTimeMs: Date.now() - started,
      redirected,
      finalUrl: actual,
      contentType: null,
      html: '',
      headers: null,
    };
  }
}

// ---------------------------------------------------------------------------
// Paso 2: analisis on-page (SEO / contenido)
// ---------------------------------------------------------------------------

function analyzeSeo(html: string, finalUrl: string): SeoAnalysis {
  const $ = cheerio.load(html);

  const title = ($('head > title').first().text() || '').trim();
  const description = ($('meta[name="description"]').attr('content') || '').trim();
  const h1Count = $('h1').length;
  const headingCount = $('h1, h2, h3, h4, h5, h6').length;
  const images = $('img');
  let missingAlt = 0;
  images.each((_, el) => {
    const alt = $(el).attr('alt');
    if (!alt || alt.trim().length === 0) missingAlt += 1;
  });

  const hasViewport = $('meta[name="viewport"]').length > 0;
  const hasCanonical = $('link[rel="canonical"]').length > 0;
  const hasOpenGraph = $('meta[property^="og:"]').length > 0;
  const lang = ($('html').attr('lang') || '').trim() || null;

  return {
    score: null, // se calcula despues
    title: {
      value: title || null,
      length: title.length,
      ok: title.length >= 15 && title.length <= 65,
    },
    metaDescription: {
      value: description || null,
      length: description.length,
      ok: description.length >= 70 && description.length <= 160,
    },
    h1Count,
    headingCount,
    images: { total: images.length, missingAlt },
    hasViewport,
    hasCanonical,
    hasOpenGraph,
    hasLangAttribute: Boolean(lang),
    lang,
    robotsTxt: null, // se completa en el paso 4
    sitemapXml: null,
  };
}

/**
 * Calcula una puntuacion SEO local (0-100) a partir de penalizaciones.
 * Es una heuristica rapida que complementa (no sustituye) la de Lighthouse.
 * Exportada para pruebas unitarias.
 */
export function computeSeoScore(seo: SeoAnalysis): number {
  let score = 100;

  if (!seo.title.value) score -= 25;
  else if (!seo.title.ok) score -= 8;

  if (!seo.metaDescription.value) score -= 20;
  else if (!seo.metaDescription.ok) score -= 6;

  if (seo.h1Count === 0) score -= 15;
  else if (seo.h1Count > 1) score -= 6;

  if (seo.images.total > 0) {
    const ratioSinAlt = seo.images.missingAlt / seo.images.total;
    score -= ratioSinAlt * 15;
  }

  if (!seo.hasViewport) score -= 12;
  if (!seo.hasCanonical) score -= 6;
  if (!seo.hasOpenGraph) score -= 4;
  if (!seo.hasLangAttribute) score -= 5;
  if (seo.robotsTxt === false) score -= 5;

  return clamp(score);
}

// ---------------------------------------------------------------------------
// Paso 3: PageSpeed Insights (rendimiento real)
// ---------------------------------------------------------------------------

const UNAVAILABLE_PERFORMANCE: PerformanceMetrics = {
  score: null,
  lcpMs: null,
  cls: null,
  tbtMs: null,
  speedIndexMs: null,
  source: 'unavailable',
};

/** Extrae el valor numerico de una metrica de Lighthouse. */
function lhNumeric(audits: Record<string, unknown>, key: string): number | null {
  const entry = audits[key] as { numericValue?: number } | undefined;
  return typeof entry?.numericValue === 'number' ? Math.round(entry.numericValue) : null;
}

async function fetchPageSpeed(url: string): Promise<PerformanceMetrics> {
  const endpoint = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
  endpoint.searchParams.set('url', url);
  endpoint.searchParams.set('strategy', 'mobile');
  endpoint.searchParams.append('category', 'performance');
  if (env.PAGESPEED_API_KEY) endpoint.searchParams.set('key', env.PAGESPEED_API_KEY);

  try {
    const res = await fetchWithTimeout(endpoint.toString(), {
      timeoutMs: env.AUDIT_TIMEOUT_MS + 15_000, // PSI puede tardar mas
      retries: 1,
      label: 'pagespeed',
    });

    if (!res.ok) {
      logger.warn({ url, status: res.status }, 'PageSpeed no respondio OK');
      return UNAVAILABLE_PERFORMANCE;
    }

    const data = (await res.json()) as {
      lighthouseResult?: {
        categories?: { performance?: { score?: number } };
        audits?: Record<string, unknown>;
      };
    };

    const lhr = data.lighthouseResult;
    if (!lhr) return UNAVAILABLE_PERFORMANCE;

    const perfScore = lhr.categories?.performance?.score;
    const audits = lhr.audits ?? {};

    return {
      score: typeof perfScore === 'number' ? Math.round(perfScore * 100) : null,
      lcpMs: lhNumeric(audits, 'largest-contentful-paint'),
      cls: (() => {
        const entry = audits['cumulative-layout-shift'] as { numericValue?: number } | undefined;
        return typeof entry?.numericValue === 'number'
          ? Math.round(entry.numericValue * 1000) / 1000
          : null;
      })(),
      tbtMs: lhNumeric(audits, 'total-blocking-time'),
      speedIndexMs: lhNumeric(audits, 'speed-index'),
      source: 'pagespeed',
    };
  } catch (error) {
    logger.warn({ url, err: (error as Error).message }, 'Fallo la consulta a PageSpeed');
    return UNAVAILABLE_PERFORMANCE;
  }
}

// ---------------------------------------------------------------------------
// Paso 4: archivos auxiliares (robots.txt / sitemap.xml)
// ---------------------------------------------------------------------------

async function checkAuxFiles(
  finalUrl: string,
): Promise<{ robotsTxt: boolean | null; sitemapXml: boolean | null }> {
  const origin = originOf(finalUrl);

  // El origen deriva de la URL final (tras redirecciones): lo validamos tambien.
  try {
    await assertPublicUrl(`${origin}/robots.txt`);
    await assertPublicUrl(`${origin}/sitemap.xml`);
  } catch {
    return { robotsTxt: null, sitemapXml: null };
  }

  const [robots, sitemap] = await Promise.all([
    safeFetchText(`${origin}/robots.txt`, { timeoutMs: 8000, retries: 0, label: 'robots' }),
    safeFetchText(`${origin}/sitemap.xml`, { timeoutMs: 8000, retries: 0, label: 'sitemap' }),
  ]);

  return {
    robotsTxt: robots ? robots.ok : null,
    sitemapXml: sitemap ? sitemap.ok : null,
  };
}

// ---------------------------------------------------------------------------
// Paso 5: cabeceras de seguridad
// ---------------------------------------------------------------------------

function analyzeSecurity(finalUrl: string, headers: Headers | null): SecurityAnalysis {
  const get = (name: string) => headers?.get(name) ?? null;
  return {
    https: finalUrl.startsWith('https://'),
    hsts: Boolean(get('strict-transport-security')),
    xContentTypeOptions: Boolean(get('x-content-type-options')),
    xFrameOptions: Boolean(get('x-frame-options')),
    contentSecurityPolicy: Boolean(get('content-security-policy')),
  };
}

// ---------------------------------------------------------------------------
// Paso 6: generacion de hallazgos (issues)
// ---------------------------------------------------------------------------

function buildIssues(
  http: HttpProbe,
  perf: PerformanceMetrics,
  seo: SeoAnalysis,
  security: SecurityAnalysis,
): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const add = (id: string, area: AuditIssue['area'], severity: Severity, title: string, detail: string) =>
    issues.push({ id, area, severity, title, detail });

  // Disponibilidad
  if (!http.reachable) {
    add('site-unreachable', 'availability', 'critical',
      'Tu sitio web no respondio',
      `La peticion a ${http.finalUrl} fallo o supero el tiempo de espera.`);
  } else if (http.statusCode >= 400) {
    add('http-error', 'availability', 'critical',
      `Tu pagina devolvio un error ${http.statusCode}`,
      `El servidor respondio con HTTP ${http.statusCode}.`);
  }

  // Rendimiento
  if (http.responseTimeMs > 3000) {
    add('slow-response', 'performance', 'warning',
      'La pagina tarda mucho en empezar a cargar',
      `Tiempo de respuesta del servidor: ${http.responseTimeMs} ms.`);
  }
  if (perf.score !== null && perf.score < 50) {
    add('low-performance', 'performance', 'critical',
      'La velocidad de carga es baja',
      `Puntuacion de rendimiento movil: ${perf.score}/100.`);
  } else if (perf.score !== null && perf.score < 80) {
    add('medium-performance', 'performance', 'warning',
      'La velocidad de carga puede mejorar',
      `Puntuacion de rendimiento movil: ${perf.score}/100.`);
  }
  if (perf.lcpMs !== null && perf.lcpMs > 2500) {
    add('slow-lcp', 'performance', 'warning',
      'El contenido principal tarda en aparecer',
      `LCP: ${perf.lcpMs} ms (objetivo < 2500 ms).`);
  }

  // SEO
  if (!seo.title.value) {
    add('missing-title', 'seo', 'critical',
      'Falta el titulo de la pagina',
      'La etiqueta <title> esta vacia o ausente.');
  } else if (!seo.title.ok) {
    add('title-length', 'seo', 'warning',
      'El titulo de la pagina no tiene la longitud ideal',
      `Longitud actual: ${seo.title.length} caracteres (recomendado 15-65).`);
  }
  if (!seo.metaDescription.value) {
    add('missing-description', 'seo', 'warning',
      'Falta la descripcion para buscadores',
      'La meta descripcion esta vacia o ausente.');
  }
  if (seo.h1Count === 0) {
    add('missing-h1', 'seo', 'warning',
      'La pagina no tiene un titulo principal (H1)',
      'No se encontro ninguna etiqueta <h1>.');
  } else if (seo.h1Count > 1) {
    add('multiple-h1', 'seo', 'info',
      'Hay varios titulos principales (H1)',
      `Se encontraron ${seo.h1Count} etiquetas <h1>.`);
  }
  if (seo.images.missingAlt > 0) {
    add('images-alt', 'content', 'info',
      'Algunas imagenes no tienen texto alternativo',
      `${seo.images.missingAlt} de ${seo.images.total} imagenes sin atributo alt.`);
  }
  if (!seo.hasViewport) {
    add('missing-viewport', 'seo', 'critical',
      'La pagina no esta preparada para moviles',
      'Falta la meta etiqueta viewport.');
  }
  if (seo.robotsTxt === false) {
    add('missing-robots', 'seo', 'info',
      'No se encontro el archivo robots.txt',
      'Un robots.txt ayuda a guiar a los buscadores.');
  }

  // Seguridad
  if (!security.https) {
    add('no-https', 'security', 'critical',
      'El sitio no usa conexion segura (HTTPS)',
      'Los navegadores marcan los sitios sin HTTPS como "no seguros".');
  }
  if (!security.hsts) {
    add('no-hsts', 'security', 'info',
      'Falta reforzar la seguridad de la conexion (HSTS)',
      'No se envio la cabecera Strict-Transport-Security.');
  }

  return issues;
}

// ---------------------------------------------------------------------------
// API publica
// ---------------------------------------------------------------------------

/**
 * Ejecuta una auditoria completa sobre una URL.
 * Nunca lanza por fallos de red: devuelve un resultado con `reachable=false`.
 */
export async function auditSite(rawUrl: string): Promise<AuditResult> {
  // Guard SSRF: rechazamos destinos internos antes de hacer cualquier peticion.
  const url = (await assertPublicUrl(normalizeUrl(rawUrl))).toString();
  const started = Date.now();
  logger.info({ url }, 'Iniciando auditoria');

  const http = await probeHttp(url);

  let seo: SeoAnalysis = {
    score: null,
    title: { value: null, length: 0, ok: false },
    metaDescription: { value: null, length: 0, ok: false },
    h1Count: 0,
    headingCount: 0,
    images: { total: 0, missingAlt: 0 },
    hasViewport: false,
    hasCanonical: false,
    hasOpenGraph: false,
    hasLangAttribute: false,
    lang: null,
    robotsTxt: null,
    sitemapXml: null,
  };
  let security: SecurityAnalysis = {
    https: url.startsWith('https://'),
    hsts: false,
    xContentTypeOptions: false,
    xFrameOptions: false,
    contentSecurityPolicy: false,
  };
  let performance: PerformanceMetrics = UNAVAILABLE_PERFORMANCE;

  if (http.reachable && http.contentType?.includes('text/html')) {
    seo = analyzeSeo(http.html, http.finalUrl);
    security = analyzeSecurity(http.finalUrl, http.headers);

    // Ejecutamos en paralelo los chequeos que dependen de red.
    const [aux, perf] = await Promise.all([
      checkAuxFiles(http.finalUrl),
      fetchPageSpeed(http.finalUrl),
    ]);
    seo.robotsTxt = aux.robotsTxt;
    seo.sitemapXml = aux.sitemapXml;
    performance = perf;
    seo.score = computeSeoScore(seo);
  }

  const issues = buildIssues(http, performance, seo, security);

  // Puntuacion global ponderada (rendimiento 45%, SEO 40%, seguridad 15%).
  const perfScore = performance.score ?? 60; // neutral si no hay datos
  const seoScore = seo.score ?? 60;
  const secScore = security.https
    ? clamp(60 + [security.hsts, security.xContentTypeOptions, security.xFrameOptions].filter(Boolean).length * 13)
    : 20;
  const overallScore = clamp(perfScore * 0.45 + seoScore * 0.4 + secScore * 0.15);

  const result: AuditResult = {
    url,
    finalUrl: http.finalUrl,
    auditedAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    http: {
      statusCode: http.statusCode,
      responseTimeMs: http.responseTimeMs,
      redirected: http.redirected,
      contentType: http.contentType,
      reachable: http.reachable,
    },
    performance,
    seo,
    security,
    overallScore,
    issues,
  };

  logger.info(
    { url, overallScore, hallazgos: issues.length, duracionMs: result.durationMs },
    'Auditoria finalizada',
  );
  return result;
}
