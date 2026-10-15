/**
 * middlewares/error.middleware.ts
 * -----------------------------------------------------------------------------
 * Middleware central de errores: normaliza cualquier error a una respuesta
 * JSON consistente y evita filtrar detalles internos en produccion.
 */
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { logger } from '../config/logger';
import { isProduction } from '../config/env';

/** Ruta no encontrada (404). */
export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    ok: false,
    error: { code: 'NOT_FOUND', message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` },
  });
};

/** Manejador global de errores (debe ir al final de la cadena). */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // Errores de validacion de Zod -> 400 con detalle de campos.
  if (err instanceof ZodError) {
    res.status(400).json({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Datos de entrada invalidos',
        details: err.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })),
      },
    });
    return;
  }

  // Errores de aplicacion tipados.
  if (err instanceof AppError) {
    logger.warn({ code: err.code, msg: err.message }, 'AppError controlado');
    res.status(err.statusCode).json({
      ok: false,
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  // Errores inesperados.
  const error = err as Error;
  logger.error({ err: error.message, stack: error.stack }, 'Error no controlado');
  res.status(500).json({
    ok: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isProduction ? 'Error interno del servidor' : error.message,
    },
  });
};
