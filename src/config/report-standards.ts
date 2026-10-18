/**
 * config/report-standards.ts
 * -----------------------------------------------------------------------------
 * Catalogo de normas/frameworks bajo los que se puede estructurar un informe.
 *
 * El cliente elige uno de los 5 grupos y el informe (IA + plantilla de correo +
 * fallback local) se organiza con las secciones de esa norma. La seleccion se
 * persiste por cliente (Client.reportStandard) y por lead (Lead.reportStandard).
 *
 * Fuente unica de verdad: la landing, el formulario, el prompt de IA y el
 * generador local leen de aqui, de modo que titulos y referencias NUNCA quedan
 * desincronizados.
 */
import type { ReportSection } from '../types';

export type ReportStandardId =
  | 'nist-800-61'
  | 'iso-27035'
  | 'iso-27001'
  | 'enisa'
  | 'sans';

/**
 * Pieza de contenido que rellena una seccion. Permite que el generador local
 * reconstruya el informe con los mismos datos bajo cualquier norma.
 */
export type ReportSectionContent =
  | 'summary'
  | 'strengths'
  | 'improvements'
  | 'quickWins';

export interface ReportStandardSection {
  id: string;
  title: string;
  content: ReportSectionContent;
  /** Nota para el prompt de IA: que debe cubrir esta seccion. */
  hint: string;
}

export interface ReportStandard {
  id: ReportStandardId;
  /** Grupo comercial mostrado al cliente (1..5). */
  group: number;
  /** Codigo corto de la norma (ej. "NIST SP 800-61"). */
  code: string;
  /** Nombre completo legible. */
  name: string;
  /** Descripcion breve para la UI y el prompt. */
  summary: string;
  sections: ReportStandardSection[];
}

export const REPORT_STANDARDS: ReportStandard[] = [
  {
    id: 'nist-800-61',
    group: 1,
    code: 'NIST SP 800-61',
    name: 'NIST SP 800-61 (Computer Security Incident Handling Guide)',
    summary:
      'Guias del NIST para gestionar incidentes: preparacion, deteccion y analisis, contencion/erradicacion/recuperacion y actividad posterior.',
    sections: [
      { id: 'preparation', title: 'Preparacion', content: 'summary', hint: 'Estado general y contexto del sitio.' },
      { id: 'detection', title: 'Deteccion y analisis', content: 'strengths', hint: 'Lo que funciona y lo que se detecta.' },
      { id: 'containment', title: 'Contencion, erradicacion y recuperacion', content: 'improvements', hint: 'Acciones correctivas priorizadas.' },
      { id: 'post-incident', title: 'Actividad posterior al incidente', content: 'quickWins', hint: 'Tareas rapidas de mejora y seguimiento.' },
    ],
  },
  {
    id: 'iso-27035',
    group: 2,
    code: 'ISO/IEC 27035',
    name: 'ISO/IEC 27035 (Gestion de incidentes de seguridad de la informacion)',
    summary:
      'Norma ISO de gestion de incidentes: planificacion, deteccion y reporte, valoracion y respuesta, y mejora continua.',
    sections: [
      { id: 'planning', title: 'Preparacion y planificacion', content: 'summary', hint: 'Contexto y estado del sitio.' },
      { id: 'detection', title: 'Deteccion y reporte de incidentes', content: 'strengths', hint: 'Hallazgos detectados y puntos fuertes.' },
      { id: 'response', title: 'Valoracion y respuesta', content: 'improvements', hint: 'Respuesta recomendada por prioridad.' },
      { id: 'improvement', title: 'Mejora continua', content: 'quickWins', hint: 'Ajustes rapidos y seguimiento.' },
    ],
  },
  {
    id: 'iso-27001',
    group: 3,
    code: 'ISO/IEC 27001',
    name: 'ISO/IEC 27001 (Sistema de gestion de seguridad de la informacion)',
    summary:
      'Norma de sistema de gestion (SGSI): contexto, evaluacion de riesgo, controles del Anexo A, operacion y mejora.',
    sections: [
      { id: 'context', title: 'Contexto y alcance del SGSI', content: 'summary', hint: 'Contexto y estado actual.' },
      { id: 'risk', title: 'Evaluacion de riesgo y deteccion', content: 'strengths', hint: 'Riesgos observados y controles que ya funcionan.' },
      { id: 'treatment', title: 'Controles y tratamiento del riesgo', content: 'improvements', hint: 'Controles a aplicar.' },
      { id: 'operation', title: 'Operacion y mejora continua', content: 'quickWins', hint: 'Mejoras operativas rapidas.' },
    ],
  },
  {
    id: 'enisa',
    group: 4,
    code: 'ENISA',
    name: 'ENISA (Agencia de la UE para la ciberseguridad)',
    summary:
      'Guias de ENISA para gestion y notificacion de incidentes, clasificacion de amenazas y recomendaciones de resiliencia.',
    sections: [
      { id: 'management', title: 'Gestion de incidentes (ENISA)', content: 'summary', hint: 'Vision general del estado.' },
      { id: 'classification', title: 'Deteccion y clasificacion de amenazas', content: 'strengths', hint: 'Amenazas y fortalezas detectadas.' },
      { id: 'response', title: 'Respuesta y notificacion', content: 'improvements', hint: 'Respuesta y avisos recomendados.' },
      { id: 'resilience', title: 'Recomendaciones y resiliencia', content: 'quickWins', hint: 'Medidas rapidas de resiliencia.' },
    ],
  },
  {
    id: 'sans',
    group: 5,
    code: "SANS Incident Handler's Handbook",
    name: "SANS Incident Handler's Handbook (PICERL)",
    summary:
      'Metodologia SANS de respuesta a incidentes: preparacion, identificacion, contencion/erradicacion, recuperacion y lecciones aprendidas.',
    sections: [
      { id: 'preparation', title: 'Preparacion', content: 'summary', hint: 'Estado inicial y contexto.' },
      { id: 'identification', title: 'Identificacion', content: 'strengths', hint: 'Lo identificado durante la revision.' },
      { id: 'containment', title: 'Contencion y erradicacion', content: 'improvements', hint: 'Acciones para eliminar el problema.' },
      { id: 'recovery', title: 'Recuperacion y lecciones aprendidas', content: 'quickWins', hint: 'Recuperacion y seguimiento.' },
    ],
  },
];

/** Norma por defecto cuando el cliente no elige o elige una desconocida. */
export const DEFAULT_REPORT_STANDARD_ID: ReportStandardId = 'nist-800-61';

/** IDs validos, utiles para validacion con Zod. */
export const REPORT_STANDARD_IDS = REPORT_STANDARDS.map((s) => s.id) as [
  ReportStandardId,
  ...ReportStandardId[],
];

/** Devuelve la norma por id, o la de por defecto si no existe. */
export function getReportStandard(id?: string | null): ReportStandard {
  const found = REPORT_STANDARDS.find((s) => s.id === id);
  return found ?? REPORT_STANDARDS.find((s) => s.id === DEFAULT_REPORT_STANDARD_ID)!;
}

/** Referencia compacta (para guardar junto al informe). */
export function standardRef(standard: ReportStandard): {
  id: string;
  group: number;
  code: string;
  name: string;
} {
  return { id: standard.id, group: standard.group, code: standard.code, name: standard.name };
}

export interface ReportContentPieces {
  summary: string;
  strengths: string[];
  improvements: string[];
  quickWins: string[];
}

/**
 * Construye las secciones del informe segun la norma elegida, rellenando cada
 * una con la pieza de contenido que le corresponde. Determinista y sin red.
 */
export function buildStandardSections(
  standard: ReportStandard,
  pieces: ReportContentPieces,
): ReportSection[] {
  const render = (content: ReportSectionContent): string => {
    switch (content) {
      case 'summary':
        return pieces.summary;
      case 'strengths':
        return listToText(pieces.strengths, 'Sin hallazgos destacados en esta revision.');
      case 'improvements':
        return listToText(pieces.improvements, 'No se detectaron mejoras prioritarias.');
      case 'quickWins':
        return listToText(pieces.quickWins, 'Mantener el seguimiento periodico.');
      default:
        return '';
    }
  };

  return standard.sections.map((section) => ({
    id: section.id,
    title: section.title,
    body: render(section.content),
  }));
}

function listToText(items: string[], fallback: string): string {
  const limpios = items.map((i) => i.trim()).filter(Boolean);
  if (limpios.length === 0) return fallback;
  return limpios.map((i) => `• ${i}`).join('\n');
}
