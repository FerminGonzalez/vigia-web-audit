/**
 * config/logger.ts
 * -----------------------------------------------------------------------------
 * Logger central basado en Pino.
 * En desarrollo usa salida "pretty" con colores; en produccion emite JSON
 * estructurado, ideal para agregadores (Datadog, Logtail, etc.).
 */
import pino from 'pino';
import { env, isProduction } from './env';

export const logger = pino({
  level: env.LOG_LEVEL,
  base: { servicio: 'vigia-web-audit', entorno: env.NODE_ENV },
  redact: {
    // Nunca registramos secretos en los logs.
    paths: [
      'req.headers.authorization',
      'req.headers["stripe-signature"]',
      '*.password',
      '*.apiKey',
      '*.token',
    ],
    censor: '[REDACTADO]',
  },
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
        },
      }),
});
