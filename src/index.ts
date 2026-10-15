/**
 * index.ts
 * -----------------------------------------------------------------------------
 * Arranque del servidor HTTP + registro de la tarea programada + apagado
 * ordenado (graceful shutdown).
 */
import { createApp } from './app';
import { env, resolveAiProvider } from './config/env';
import { logger } from './config/logger';
import { disconnectPrisma, pingDatabase } from './lib/prisma';
import {
  startWeeklyAuditCron,
  stopWeeklyAuditCron,
} from './jobs/weekly-audit.cron';
import { startNurtureCron, stopNurtureCron } from './jobs/nurture.cron';

async function bootstrap(): Promise<void> {
  // Verificamos la base de datos antes de aceptar trafico.
  const dbOk = await pingDatabase();
  if (!dbOk) {
    logger.error('No se pudo conectar a la base de datos. Abortando arranque.');
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(
      {
        puerto: env.PORT,
        entorno: env.NODE_ENV,
        aiProvider: resolveAiProvider() ?? 'fallback-local',
      },
      `🚀 Vigia Web Audit escuchando en ${env.APP_BASE_URL}`,
    );
  });

  // Arrancamos la automatizacion desatendida.
  startWeeklyAuditCron();
  startNurtureCron();

  // --- Apagado ordenado ---
  const shutdown = (signal: string) => {
    logger.info({ signal }, 'Recibida senal de apagado; cerrando...');
    stopWeeklyAuditCron();
    stopNurtureCron();
    server.close(() => {
      void disconnectPrisma().finally(() => process.exit(0));
    });
    // Failsafe si algo se cuelga.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Promesa rechazada no manejada');
  });
  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error.message, stack: error.stack }, 'Excepcion no capturada');
    shutdown('uncaughtException');
  });
}

void bootstrap();
