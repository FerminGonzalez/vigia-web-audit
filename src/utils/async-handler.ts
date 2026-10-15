/**
 * utils/async-handler.ts
 * -----------------------------------------------------------------------------
 * Envuelve controladores async de Express para que los rechazos de promesa
 * lleguen al middleware de errores (Express 4 no lo hace por si solo).
 */
import type { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncFn = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export const asyncHandler =
  (fn: AsyncFn): RequestHandler =>
  (req, res, next) => {
    void Promise.resolve(fn(req, res, next)).catch(next);
  };

/** Convierte un valor a booleano de forma tolerante. */
export function parseBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return ['true', '1', 'si', 'sí', 'yes'].includes(value.toLowerCase());
  return fallback;
}
