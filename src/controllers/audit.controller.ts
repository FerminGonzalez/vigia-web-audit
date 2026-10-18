/**
 * controllers/audit.controller.ts
 * -----------------------------------------------------------------------------
 * Endpoints administrativos para disparar auditorias y consultar estado.
 * Protegidos por token (requireAdminToken).
 */
import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { runReportForSite } from '../services/report.service';
import { runWeeklyAudit } from '../jobs/weekly-audit.cron';
import { processNurtureQueue } from '../services/nurture.service';
import { auditSite } from '../services/audit.service';
import { NotFoundError } from '../utils/errors';

/**
 * POST /api/admin/audits/run
 * Ejecuta el flujo completo para un sitio, o la ronda semanal si no se indica.
 */
export async function triggerAudit(req: Request, res: Response): Promise<void> {
  const { siteId, sendEmail } = z
    .object({ siteId: z.string().optional(), sendEmail: z.boolean().optional() })
    .parse(req.body ?? {});

  if (siteId) {
    const resultado = await runReportForSite(siteId, { sendEmail: sendEmail ?? true });
    res.json({ ok: true, resultado });
    return;
  }

  const resumen = await runWeeklyAudit();
  res.json({ ok: true, resumen });
}

/**
 * POST /api/admin/nurture/run
 * Procesa la cola de nutricion de leads una sola vez.
 * Pensado para que un cron externo (p. ej. GitHub Actions) lo dispare.
 */
export async function triggerNurture(req: Request, res: Response): Promise<void> {
  const { limit } = z
    .object({ limit: z.number().int().positive().max(500).optional() })
    .parse(req.body ?? {});

  const resumen = await processNurtureQueue(limit ?? 100);
  res.json({ ok: resumen.fallidos === 0, resumen });
}

/**
 * POST /api/admin/audits/preview
 * Ejecuta solo la auditoria tecnica (sin IA ni correo) y devuelve el JSON.
 * Ideal para depuracion.
 */
export async function previewAudit(req: Request, res: Response): Promise<void> {
  const { url } = z.object({ url: z.string().min(3) }).parse(req.body);
  const resultado = await auditSite(url);
  res.json({ ok: true, resultado });
}

/** GET /api/admin/clients - listado resumido de clientes. */
export async function listClients(_req: Request, res: Response): Promise<void> {
  const clientes = await prisma.client.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      email: true,
      businessName: true,
      createdAt: true,
      sites: { select: { id: true, url: true, isActive: true, lastAuditedAt: true } },
      subscription: { select: { status: true, currentPeriodEnd: true } },
    },
  });
  res.json({ ok: true, total: clientes.length, clientes });
}

/** GET /api/admin/sites/:id/history - historico de auditorias de un sitio. */
export async function siteHistory(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const site = await prisma.site.findUnique({ where: { id }, select: { id: true, url: true } });
  if (!site) throw new NotFoundError('Sitio no encontrado');

  const auditorias = await prisma.audit.findMany({
    where: { siteId: id },
    orderBy: { createdAt: 'desc' },
    take: 12,
    select: { id: true, overallScore: true, performanceScore: true, seoScore: true, createdAt: true },
  });

  res.json({ ok: true, site, auditorias });
}
