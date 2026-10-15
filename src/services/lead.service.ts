/**
 * services/lead.service.ts
 * -----------------------------------------------------------------------------
 * Motor de captacion (lead magnet).
 *
 * Recibe un correo y una URL, ejecuta una auditoria real y envia un informe de
 * muestra. Es la pieza que convierte visitantes en clientes: el prospecto ve
 * valor antes de pagar.
 *
 * Guarda el lead para su seguimiento comercial (remarketing) sin obligar al
 * usuario a registrarse.
 */
import { prisma } from '../lib/prisma';
import { logger } from '../config/logger';
import { auditSite, normalizeUrl } from './audit.service';
import { generateAiReport } from './ai.service';
import { sendSampleReport } from './email.service';
import type { BusinessContext } from '../types';

export interface LeadInput {
  email: string;
  url: string;
  businessName?: string;
}

export interface LeadResult {
  overallScore: number;
  summary: string;
  emailSent: boolean;
}

/** Deduce un nombre de negocio legible a partir de la URL. */
function nombreDesdeUrl(url: string): string {
  try {
    const host = new URL(normalizeUrl(url)).hostname.replace(/^www\./, '');
    const base = host.split('.')[0] ?? host;
    return base.charAt(0).toUpperCase() + base.slice(1);
  } catch {
    return 'Tu negocio';
  }
}

/**
 * Ejecuta una auditoria de muestra y la envia por correo.
 * No lanza por fallos de correo (el lead igual se registra).
 */
export async function captureLead(input: LeadInput): Promise<LeadResult> {
  const businessName = input.businessName?.trim() || nombreDesdeUrl(input.url);

  const audit = await auditSite(input.url);
  const contexto: BusinessContext = {
    businessName,
    sector: null,
    city: 'Panama',
    previousScore: null,
  };
  const report = await generateAiReport(audit, contexto);

  // Registramos el lead y programamos el inicio de la secuencia de nutricion.
  await prisma.lead
    .create({
      data: {
        email: input.email,
        url: normalizeUrl(input.url),
        businessName,
        overallScore: audit.overallScore,
        source: 'landing',
        status: 'NURTURING',
        sequenceStep: 1,
        nextEmailAt: new Date(Date.now() + 2 * 86_400_000), // primer drip a los 2 dias
      },
    })
    .catch((error) => logger.warn({ err: error.message }, 'No se pudo registrar el lead'));

  let emailSent = false;
  try {
    await sendSampleReport({ to: input.email, business: contexto, audit, report });
    emailSent = true;
  } catch (error) {
    logger.error({ err: (error as Error).message, email: input.email }, 'Fallo el envio del informe de muestra');
  }

  logger.info({ email: input.email, url: audit.finalUrl, score: audit.overallScore }, 'Lead captado');

  return { overallScore: audit.overallScore, summary: report.executiveSummary, emailSent };
}
