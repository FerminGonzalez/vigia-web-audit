/**
 * jobs/run-nurture-once.ts
 * -----------------------------------------------------------------------------
 * Procesa la cola de nutricion una sola vez y termina.
 * Pensado para cron jobs en la nube (Render/Railway/Fly).
 *
 *   npm run nurture:run
 */
import { processNurtureQueue } from '../services/nurture.service';
import { disconnectPrisma } from '../lib/prisma';
import { logger } from '../config/logger';

async function main(): Promise<void> {
  try {
    const resumen = await processNurtureQueue();
    logger.info({ resumen }, 'Cola de nutricion finalizada');
    process.exitCode = resumen.fallidos > 0 ? 1 : 0;
  } catch (error) {
    logger.error({ err: (error as Error).message }, 'La cola de nutricion fallo');
    process.exitCode = 1;
  } finally {
    await disconnectPrisma();
  }
}

void main();
