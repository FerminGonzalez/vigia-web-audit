/**
 * services/report.service.ts
 * -----------------------------------------------------------------------------
 * Orquestador del flujo "Zero-Touch":
 *
 *   audit.service -> ai.service -> persistencia (Prisma) -> email.service
 *
 * Es el unico punto que conoce el orden completo del proceso, de modo que
 * tanto el cron semanal como los endpoints manuales reutilizan exactamente la
 * misma logica.
 */
import { prisma } from '../lib/prisma';
import { logger } from '../config/logger';
import { auditSite } from './audit.service';
import { generateAiReport } from './ai.service';
import { sendWeeklyReport } from './email.service';
import { getReportStandard } from '../config/report-standards';
import type { BusinessContext } from '../types';
import { ReportStatus } from '@prisma/client';

export interface RunReportOptions {
  /** Si es `false`, se genera y guarda el informe pero no se envia correo. */
  sendEmail?: boolean;
}

export interface RunReportResult {
  siteId: string;
  auditId: string;
  reportId: string;
  overallScore: number;
  emailSent: boolean;
}

/**
 * Ejecuta el ciclo completo de auditoria + informe para un sitio concreto.
 * Lanza si el sitio no existe; para fallos de auditoria/IA aplica degradacion.
 */
export async function runReportForSite(
  siteId: string,
  options: RunReportOptions = {},
): Promise<RunReportResult> {
  const { sendEmail = true } = options;

  const site = await prisma.site.findUnique({
    where: { id: siteId },
    include: { client: true },
  });

  if (!site) {
    throw new Error(`Sitio no encontrado: ${siteId}`);
  }

  const { client } = site;

  // Recuperamos la puntuacion previa para calcular la tendencia semanal.
  const previousAudit = await prisma.audit.findFirst({
    where: { siteId: site.id },
    orderBy: { createdAt: 'desc' },
    select: { overallScore: true },
  });

  const businessContext: BusinessContext = {
    businessName: client.businessName,
    sector: client.sector,
    city: client.city,
    previousScore: previousAudit?.overallScore ?? null,
  };

  // 1) Auditoria tecnica
  const audit = await auditSite(site.url);

  // 2) Persistimos la auditoria antes de generar el informe (trazabilidad).
  const savedAudit = await prisma.audit.create({
    data: {
      siteId: site.id,
      overallScore: audit.overallScore,
      performanceScore: audit.performance.score,
      seoScore: audit.seo.score,
      responseTimeMs: audit.http.responseTimeMs,
      reachable: audit.http.reachable,
      raw: audit as unknown as object,
    },
  });

  // 3) Redaccion del informe con IA segun la norma elegida por el cliente.
  const standard = getReportStandard(client.reportStandard);
  const aiReport = await generateAiReport(audit, businessContext, standard);

  // 4) Guardamos el informe (aun sin enviar) para tener registro.
  const savedReport = await prisma.report.create({
    data: {
      clientId: client.id,
      siteId: site.id,
      auditId: savedAudit.id,
      aiProvider: aiReport.provider,
      summary: aiReport.executiveSummary,
      reportStandard: standard.id,
      status: ReportStatus.PENDING,
    },
  });

  let emailSent = false;
  if (sendEmail) {
    try {
      const result = await sendWeeklyReport({
        to: client.email,
        business: businessContext,
        audit,
        report: aiReport,
        clientId: client.id,
      });

      await prisma.report.update({
        where: { id: savedReport.id },
        data: {
          status: ReportStatus.SENT,
          sentAt: new Date(),
          emailMessageId: result.id,
        },
      });
      emailSent = true;
    } catch (error) {
      logger.error(
        { siteId: site.id, clientId: client.id, err: (error as Error).message },
        'Fallo el envio del informe',
      );
      await prisma.report.update({
        where: { id: savedReport.id },
        data: { status: ReportStatus.FAILED, error: (error as Error).message },
      });
    }
  }

  // 5) Marcamos la fecha de la ultima auditoria del sitio.
  await prisma.site.update({
    where: { id: site.id },
    data: { lastAuditedAt: new Date() },
  });

  logger.info(
    {
      siteId: site.id,
      overallScore: audit.overallScore,
      provider: aiReport.provider,
      emailSent,
    },
    'Ciclo de informe completado',
  );

  return {
    siteId: site.id,
    auditId: savedAudit.id,
    reportId: savedReport.id,
    overallScore: audit.overallScore,
    emailSent,
  };
}
