/**
 * lib/prisma.ts
 * -----------------------------------------------------------------------------
 * Cliente Prisma como singleton. Evita crear multiples conexiones durante el
 * hot-reload de `tsx watch` y en entornos serverless.
 */
import { Prisma, PrismaClient } from '@prisma/client';
import { env, isProduction } from '../config/env';
import { logger } from '../config/logger';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: isProduction
      ? ['error', 'warn']
      : [
          { emit: 'event', level: 'query' },
          { emit: 'stdout', level: 'error' },
          { emit: 'stdout', level: 'warn' },
        ],
  });

if (!isProduction) {
  // En desarrollo registramos consultas lentas para detectar problemas de N+1.
  // (Se castea porque el tipado de $on depende de la configuracion de `log`.)
  const conEventos = prisma as unknown as {
    $on: (event: 'query', cb: (e: Prisma.QueryEvent) => void) => void;
  };
  conEventos.$on('query', (e) => {
    if (e.duration > 150) {
      logger.warn({ duracionMs: e.duration }, 'Consulta Prisma lenta detectada');
    }
  });
}

if (!isProduction) global.__prisma = prisma;

/** Cierra la conexion de forma limpia (usado en shutdown). */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Conexion Prisma cerrada');
}

/** Verifica que la base de datos responde (usado en el healthcheck). */
export async function pingDatabase(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error({ err: error }, 'La base de datos no responde');
    return false;
  }
}

// Referenciamos env para asegurar que la validacion se ejecuta en el arranque.
void env;
