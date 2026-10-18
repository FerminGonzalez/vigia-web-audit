/**
 * services/ai.service.ts
 * -----------------------------------------------------------------------------
 * Servicio de inteligencia artificial.
 *
 * Recibe el resultado tecnico de `audit.service` y produce un informe en
 * espanol claro y persuasivo, pensado para dueños de negocios locales que NO
 * entienden de tecnologia.
 *
 * Estrategia de proveedores (en orden):
 *   1. Anthropic Claude  (si hay ANTHROPIC_API_KEY)
 *   2. OpenAI            (si hay OPENAI_API_KEY)
 *   3. Generador local   (fallback determinista, sin coste ni red)
 *
 * El fallback garantiza que el SaaS nunca deje de enviar informes, incluso si
 * la API de IA esta caida o sin credito.
 */
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { z } from 'zod';
import { env, resolveAiProvider } from '../config/env';
import { logger } from '../config/logger';
import {
  buildStandardSections,
  getReportStandard,
  standardRef,
  type ReportStandard,
} from '../config/report-standards';
import type { AiReport, AuditResult, BusinessContext } from '../types';

// ---------------------------------------------------------------------------
// Esquema de salida esperada del modelo
// ---------------------------------------------------------------------------

const aiReportSchema = z.object({
  executiveSummary: z.string().min(20),
  strengths: z.array(z.string().min(3)).max(6),
  improvements: z.array(z.string().min(3)).min(1).max(6),
  quickWins: z.array(z.string().min(3)).max(5),
  callToAction: z.string().min(5),
});

type RawAiReport = z.infer<typeof aiReportSchema>;

// ---------------------------------------------------------------------------
// Prompt del sistema (rol + tono)
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `Eres un consultor digital panameño que explica temas tecnicos a dueños de pequenas y medianas empresas (PYMEs).
Reglas estrictas:
- Escribe en espanol neutro de Panama, cercano y profesional.
- PROHIBIDO usar jerga tecnica (nada de "LCP", "CLS", "H1", "meta tags", "CSS", "render-blocking").
  Traduce siempre a beneficios de negocio (ej: "tus clientes esperan demasiado" en vez de "alto TBT").
- Se concreto y accionable. Cada punto debe poder entenderse sin conocimientos tecnicos.
- Tono positivo y constructivo, nunca alarmista.
- No inventes datos que no esten en el analisis.
Responde SIEMPRE con JSON valido que cumpla el esquema solicitado, sin texto adicional.`;

function buildUserPrompt(audit: AuditResult, ctx: BusinessContext, standard: ReportStandard): string {
  const tendencia =
    typeof ctx.previousScore === 'number'
      ? `Puntuacion de la semana pasada: ${ctx.previousScore}/100.`
      : 'No hay informe previo (es el primer analisis).';

  const fases = standard.sections.map((s) => `- ${s.title}: ${s.hint}`).join('\n');

  const hallazgos = audit.issues.length
    ? audit.issues
        .map((i) => `- [${i.severity}/${i.area}] ${i.title}: ${i.detail}`)
        .join('\n')
    : '- No se detectaron problemas relevantes.';

  return `Analiza los siguientes datos y redacta el informe semanal.

NORMA SOLICITADA POR EL CLIENTE: Grupo ${standard.group} - ${standard.code} (${standard.name}).
${standard.summary}
Estructura las recomendaciones segun estas fases de la norma (usa su terminologia en el resumen):
${fases}

NEGOCIO:
- Nombre: ${ctx.businessName}
- Sector: ${ctx.sector ?? 'no especificado'}
- Ciudad: ${ctx.city ?? 'no especificada'}

SITIO: ${audit.finalUrl}
Disponible: ${audit.http.reachable ? 'si' : 'NO'}
Codigo HTTP: ${audit.http.statusCode}
Tiempo de respuesta del servidor: ${audit.http.responseTimeMs} ms
Puntuacion global: ${audit.overallScore}/100
Puntuacion de velocidad (movil): ${audit.performance.score ?? 'sin datos'}/100
Puntuacion SEO: ${audit.seo.score ?? 'sin datos'}/100
Usa HTTPS: ${audit.security.https ? 'si' : 'NO'}
${tendencia}

HALLAZGOS TECNICOS:
${hallazgos}

Devuelve un JSON con esta forma exacta:
{
  "executiveSummary": "2-4 frases resumiendo el estado del sitio para el dueño",
  "strengths": ["punto fuerte 1", "punto fuerte 2"],
  "improvements": ["mejora explicada en lenguaje de negocio", "..."],
  "quickWins": ["accion rapida de alto impacto", "..."],
  "callToAction": "frase final invitando a actuar"
}`;
}

// ---------------------------------------------------------------------------
// Proveedores
// ---------------------------------------------------------------------------

async function generateWithAnthropic(
  audit: AuditResult,
  ctx: BusinessContext,
  standard: ReportStandard,
): Promise<RawAiReport> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const model = env.AI_MODEL || 'claude-3-5-sonnet-latest';

  const response = await client.messages.create({
    model,
    max_tokens: env.AI_MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserPrompt(audit, ctx, standard) }],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n');

  return parseAiJson(text);
}

async function generateWithOpenAi(
  audit: AuditResult,
  ctx: BusinessContext,
  standard: ReportStandard,
): Promise<RawAiReport> {
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const model = env.AI_MODEL || 'gpt-4o-mini';

  const response = await client.chat.completions.create({
    model,
    max_tokens: env.AI_MAX_TOKENS,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(audit, ctx, standard) },
    ],
  });

  const text = response.choices[0]?.message?.content ?? '';
  return parseAiJson(text);
}

/** Extrae y valida el JSON devuelto por el modelo, tolerando bloques ```json. */
function parseAiJson(raw: string): RawAiReport {
  const limpio = raw
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();

  const firstBrace = limpio.indexOf('{');
  const lastBrace = limpio.lastIndexOf('}');
  const jsonCandidate =
    firstBrace >= 0 && lastBrace > firstBrace ? limpio.slice(firstBrace, lastBrace + 1) : limpio;

  const parsed = aiReportSchema.parse(JSON.parse(jsonCandidate));
  return parsed;
}

// ---------------------------------------------------------------------------
// Fallback local (sin IA)
// ---------------------------------------------------------------------------

/**
 * Genera un informe decente a partir de reglas, sin llamar a ningun modelo.
 * Se usa si no hay credenciales o si la API falla.
 */
function generateFallback(
  audit: AuditResult,
  ctx: BusinessContext,
  standard: ReportStandard = getReportStandard(),
): AiReport {
  const nombre = ctx.businessName;
  const score = audit.overallScore;

  const resumen =
    score >= 85
      ? `El sitio web de ${nombre} esta en muy buen estado (${score}/100). La base tecnica es solida y solo quedan ajustes finos para mantener el rendimiento.`
      : score >= 60
        ? `El sitio de ${nombre} funciona correctamente pero tiene margen de mejora (${score}/100). Con unos ajustes concretos puedes ganar velocidad y visibilidad en Google.`
        : `El sitio de ${nombre} presenta varios problemas que estan afectando la experiencia de tus clientes y tu posicion en Google (${score}/100). Es prioritario actuar.`;

  const strengths: string[] = [];
  if (audit.http.reachable) strengths.push('El sitio esta en linea y responde a los visitantes.');
  if (audit.security.https) strengths.push('La conexion es segura (HTTPS), lo que transmite confianza.');
  if (audit.seo.title.ok) strengths.push('El titulo de la pagina esta bien definido para los buscadores.');
  if (audit.performance.score !== null && audit.performance.score >= 80)
    strengths.push('La velocidad de carga movil es buena.');

  // Traducimos cada hallazgo a lenguaje de negocio.
  const traduccion: Record<string, string> = {
    'site-unreachable': 'Tu sitio no esta respondiendo; los visitantes no pueden entrar.',
    'http-error': 'Algunas paginas muestran errores; conviene revisarlas cuanto antes.',
    'slow-response': 'El servidor tarda en responder, lo que ahuyenta visitantes impacientes.',
    'low-performance': 'La pagina carga lento en celulares; muchos usuarios se van antes de verla.',
    'medium-performance': 'La carga puede ser mas rapida, sobre todo en conexiones moviles.',
    'slow-lcp': 'El contenido principal tarda en aparecer, dando sensacion de lentitud.',
    'missing-title': 'Google no tiene un titulo claro para mostrar tu pagina en los resultados.',
    'title-length': 'El titulo de tu pagina podria mostrarse cortado o incompleto en Google.',
    'missing-description': 'Falta el texto que Google usa para describir tu negocio en las busquedas.',
    'missing-h1': 'La pagina no destaca su mensaje principal para los buscadores.',
    'multiple-h1': 'Hay varios titulos principales compitiendo; conviene dejar solo uno.',
    'images-alt': 'Algunas imagenes no se describen, lo que perjudica accesibilidad y posicionamiento.',
    'missing-viewport': 'Tu pagina no se adapta bien a celulares, donde navega la mayoria de tus clientes.',
    'missing-robots': 'Falta una guia basica para que Google indexe tu sitio correctamente.',
    'no-https': 'Tu sitio no usa conexion segura; los navegadores lo advierten como "no seguro".',
    'no-hsts': 'Se puede reforzar la seguridad de la conexion para proteger a tus visitantes.',
  };

  const improvements = audit.issues
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
    .map((i) => traduccion[i.id] ?? i.title)
    .filter((v, idx, arr) => arr.indexOf(v) === idx)
    .slice(0, 6);

  const quickWins: string[] = [];
  if (audit.seo.metaDescription.value === null)
    quickWins.push('Escribe una descripcion atractiva de tu negocio (1-2 frases) para Google.');
  if (audit.seo.images.missingAlt > 0)
    quickWins.push('Agrega descripciones a las imagenes clave de tu pagina de inicio.');
  if (audit.performance.score !== null && audit.performance.score < 80)
    quickWins.push('Comprime las imagenes mas pesadas para acelerar la carga.');
  if (!audit.security.https)
    quickWins.push('Activa HTTPS con tu proveedor de hosting para ganar confianza.');
  if (quickWins.length === 0)
    quickWins.push('Mantener el sitio actualizado y publicar contenido nuevo con regularidad.');

  const strengthsFinal = strengths.slice(0, 5);
  const improvementsFinal = improvements.length
    ? improvements
    : ['Mantener el buen estado actual del sitio.'];
  const callToAction =
    '¿Quieres que nos encarguemos de aplicar estas mejoras por ti? Responde a este correo y te ayudamos.';

  return finalizeReport(
    {
      executiveSummary: resumen,
      strengths: strengthsFinal,
      improvements: improvementsFinal,
      quickWins,
      callToAction,
    },
    standard,
    'fallback',
  );
}

const severityRank = (s: string): number => (s === 'critical' ? 3 : s === 'warning' ? 2 : 1);

/**
 * Compone el informe final anadiendo la referencia a la norma y las secciones
 * estructuradas segun ella (mismo contenido, marco distinto).
 */
function finalizeReport(
  raw: RawAiReport,
  standard: ReportStandard,
  provider: AiReport['provider'],
): AiReport {
  const sections = buildStandardSections(standard, {
    summary: raw.executiveSummary,
    strengths: raw.strengths,
    improvements: raw.improvements,
    quickWins: raw.quickWins,
  });
  return { ...raw, provider, standard: standardRef(standard), sections };
}

// ---------------------------------------------------------------------------
// API publica
// ---------------------------------------------------------------------------

/**
 * Genera el informe en lenguaje de negocio a partir de la auditoria tecnica.
 * Aplica degradacion elegante: nunca lanza por fallos de IA.
 */
export async function generateAiReport(
  audit: AuditResult,
  context: BusinessContext,
  standardInput?: ReportStandard,
): Promise<AiReport> {
  const standard = standardInput ?? getReportStandard();
  const provider = resolveAiProvider();

  if (!provider) {
    logger.info({ standard: standard.id }, 'Sin proveedor de IA configurado: usando generador local');
    return generateFallback(audit, context, standard);
  }

  try {
    const raw =
      provider === 'anthropic'
        ? await generateWithAnthropic(audit, context, standard)
        : await generateWithOpenAi(audit, context, standard);

    return finalizeReport(raw, standard, provider);
  } catch (error) {
    logger.error(
      { provider, standard: standard.id, err: (error as Error).message },
      'La generacion con IA fallo; usando fallback local',
    );
    return generateFallback(audit, context, standard);
  }
}

/** Exportado para pruebas unitarias del fallback. */
export { generateFallback as _generateFallbackForTests };
