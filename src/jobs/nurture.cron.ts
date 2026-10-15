/**
 * jobs/nurture.cron.ts
 * -----------------------------------------------------------------------------
 * Tarea programada diaria que procesa la cola de nutricion de leads.
 * Independiente del cron de auditorias semanales.
 */
import cron, { type ScheduledTask } from 'node-cron';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { processNurtureQueue } from '../services/nurture.service';

let tarea: ScheduledTask | null = null;

/** Registra la tarea (9:00 AM por defecto, hora de Panama). */
export function startNurtureCron(): void {
  if (!env.CRON_ENABLED) return;

  // Cada dia a las 9:00 en la zona configurada.
  tarea = cron.schedule('0 9 * * *', () => void processNurtureQueue(), {
    timezone: env.CRON_TIMEZONE,
  });

  logger.info({ timezone: env.CRON_TIMEZONE }, 'Cron de nutricion de leads programado');
}

export function stopNurtureCron(): void {
  tarea?.stop();
  tarea = null;
}
