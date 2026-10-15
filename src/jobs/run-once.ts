/**
 * jobs/run-once.ts
 * -----------------------------------------------------------------------------
 * Ejecuta la ronda de auditorias una sola vez y termina.
 * Util para pruebas locales, CI o un disparador externo (cron del sistema).
 *
 *   npm run audit:run
 */
import { runWeeklyAudit } from './weekly-audit.cron';
import { disconnectPrisma } from '../lib/prisma';
import { logger } from '../config/logger';

async function main(): Promise<void> {
  try {
    const resumen = await runWeeklyAudit();
    logger.info({ resumen }, 'Ejecucion unica finalizada');
    process.exitCode = resumen.fallidos > 0 ? 1 : 0;
  } catch (error) {
    logger.error({ err: (error as Error).message }, 'La ejecucion unica fallo');
    process.exitCode = 1;
  } finally {
    await disconnectPrisma();
  }
}

void main();
