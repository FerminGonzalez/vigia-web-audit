/**
 * jobs/weekly-audit.cron.ts
 * -----------------------------------------------------------------------------
 * Tarea programada que ejecuta las auditorias semanales de forma desatendida.
 *
 * Caracteristicas:
 *  - Programacion configurable (CRON_SCHEDULE) en zona horaria de Panama.
 *  - Solo audita sitios activos de clientes con suscripcion vigente.
 *  - Idempotencia: omite sitios auditados en los ultimos 6 dias.
 *  - Concurrencia limitada para no saturar la red ni la base de datos.
 *  - Bloqueo interno para evitar ejecuciones solapadas.
 */
import cron, { type ScheduledTask } from 'node-cron';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { runReportForSite } from '../services/report.service';
import { sendAdminAlert } from '../services/email.service';
import { SubscriptionStatus } from '@prisma/client';

/** Evita que dos ejecuciones se solapen. */
let ejecutando = false;
let tarea: ScheduledTask | null = null;

/** Antiguedad minima (dias) para volver a auditar un sitio. */
const DIAS_MINIMOS_ENTRE_AUDITORIAS = 6;

export interface WeeklyAuditSummary {
  total: number;
  exitosos: number;
  fallidos: number;
  omitidos: number;
  duracionMs: number;
}

/**
 * Ejecuta una pasada completa de auditorias. Exportada para poder invocarla
 * manualmente (scripts, tests o endpoints administrativos).
 */
export async function runWeeklyAudit(): Promise<WeeklyAuditSummary> {
  if (ejecutando) {
    logger.warn('Ya hay una ejecucion de auditoria en curso; se omite esta pasada');
    return { total: 0, exitosos: 0, fallidos: 0, omitidos: 0, duracionMs: 0 };
  }

  ejecutando = true;
  const inicio = Date.now();
  logger.info('=== Iniciando ronda semanal de auditorias ===');

  const resumen: WeeklyAuditSummary = {
    total: 0,
    exitosos: 0,
    fallidos: 0,
    omitidos: 0,
    duracionMs: 0,
  };

  try {
    const hace6Dias = new Date(Date.now() - DIAS_MINIMOS_ENTRE_AUDITORIAS * 24 * 60 * 60 * 1000);

    // Sitios activos cuyo cliente tiene una suscripcion vigente.
    const sitios = await prisma.site.findMany({
      where: {
        isActive: true,
        client: {
          subscription: {
            status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE] },
          },
        },
        OR: [{ lastAuditedAt: null }, { lastAuditedAt: { lt: hace6Dias } }],
      },
      select: { id: true, url: true, clientId: true },
    });

    resumen.total = sitios.length;
    logger.info({ sitios: sitios.length }, 'Sitios a auditar en esta ronda');

    if (sitios.length === 0) {
      resumen.duracionMs = Date.now() - inicio;
      return resumen;
    }

    // Procesamiento con pool de concurrencia limitada.
    await pool(sitios, env.MAX_AUDIT_CONCURRENCY, async (sitio) => {
      try {
        const resultado = await runReportForSite(sitio.id, { sendEmail: true });
        resumen.exitosos += 1;
        logger.info(
          { siteId: sitio.id, url: sitio.url, score: resultado.overallScore },
          'Auditoria OK',
        );
      } catch (error) {
        resumen.fallidos += 1;
        logger.error(
          { siteId: sitio.id, url: sitio.url, err: (error as Error).message },
          'Fallo la auditoria del sitio',
        );
      }
    });

    resumen.duracionMs = Date.now() - inicio;
    logger.info({ ...resumen }, '=== Ronda semanal finalizada ===');

    // Si la tasa de fallos es alta, avisamos al administrador.
    if (resumen.total > 0 && resumen.fallidos / resumen.total > 0.3) {
      await sendAdminAlert(
        'Alto porcentaje de fallos en la ronda semanal',
        `Total: ${resumen.total}, Fallidos: ${resumen.fallidos}. Revisar logs.`,
      );
    }

    return resumen;
  } finally {
    ejecutando = false;
  }
}

/**
 * Registra la tarea cron. No arranca si CRON_ENABLED=false.
 */
export function startWeeklyAuditCron(): void {
  if (!env.CRON_ENABLED) {
    logger.warn('Cron deshabilitado (CRON_ENABLED=false)');
    return;
  }

  if (!cron.validate(env.CRON_SCHEDULE)) {
    logger.error({ schedule: env.CRON_SCHEDULE }, 'Expresion cron invalida; cron no iniciado');
    return;
  }

  tarea = cron.schedule(env.CRON_SCHEDULE, () => void runWeeklyAudit(), {
    timezone: env.CRON_TIMEZONE,
  });

  logger.info(
    { schedule: env.CRON_SCHEDULE, timezone: env.CRON_TIMEZONE },
    'Cron de auditoria semanal programado',
  );
}

/** Detiene la tarea cron (usado en el apagado ordenado). */
export function stopWeeklyAuditCron(): void {
  tarea?.stop();
  tarea = null;
}

/**
 * Ejecuta `worker` sobre `items` con un maximo de `concurrency` en paralelo.
 * Preserva el orden de finalizacion pero no lanza: cada worker maneja sus errores.
 */
async function pool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  const cola = [...items];
  const ejecutar = async () => {
    while (cola.length > 0) {
      const item = cola.shift();
      if (item === undefined) return;
      await worker(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, ejecutar));
}
