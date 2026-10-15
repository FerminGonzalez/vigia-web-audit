/**
 * middlewares/rate-limit.middleware.ts
 * -----------------------------------------------------------------------------
 * Limitador de tasa en memoria (ventana deslizante simple).
 *
 * Suficiente para una instancia unica. En despliegues multi-instancia usa
 * Redis (Upstash) o el limitador de tu plataforma.
 */
import type { Request, RequestHandler, Response } from 'express';

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Limpieza periodica para no crecer sin limite.
setInterval(() => {
  const ahora = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < ahora) buckets.delete(key);
  }
}, 60_000).unref();

export interface RateLimitOptions {
  /** Numero maximo de peticiones por ventana. */
  max: number;
  /** Duracion de la ventana en milisegundos. */
  windowMs: number;
}

export function rateLimit(options: RateLimitOptions): RequestHandler {
  return (req: Request, res: Response, next) => {
    const key = req.ip ?? 'desconocido';
    const ahora = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt < ahora) {
      buckets.set(key, { count: 1, resetAt: ahora + options.windowMs });
      next();
      return;
    }

    if (bucket.count >= options.max) {
      const retryAfter = Math.ceil((bucket.resetAt - ahora) / 1000);
      res.setHeader('Retry-After', retryAfter);
      res.status(429).json({
        ok: false,
        error: { code: 'RATE_LIMITED', message: 'Demasiadas solicitudes. Intenta mas tarde.' },
      });
      return;
    }

    bucket.count += 1;
    next();
  };
}
