/**
 * middlewares/auth.middleware.ts
 * -----------------------------------------------------------------------------
 * Autenticacion sencilla por token para los endpoints administrativos.
 * En produccion, considera sustituirlo por un proveedor de identidad
 * (Supabase Auth, Auth0, Clerk, etc.).
 */
import type { RequestHandler } from 'express';
import { env } from '../config/env';
import { UnauthorizedError } from '../utils/errors';

export const requireAdminToken: RequestHandler = (req, _res, next) => {
  const header = req.header('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  // Comparamos en tiempo constante para evitar ataques de temporizacion.
  if (!token || !timingSafeEqual(token, env.ADMIN_API_TOKEN)) {
    next(new UnauthorizedError('Token administrativo invalido o ausente'));
    return;
  }
  next();
};

/** Comparacion de strings resistente a ataques de temporizacion. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let resultado = 0;
  for (let i = 0; i < a.length; i += 1) {
    resultado |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return resultado === 0;
}
