/**
 * services/auth-token.service.ts
 * -----------------------------------------------------------------------------
 * Tokens firmados (HMAC-SHA256) para acceder al portal del cliente y a los
 * enlaces de baja, sin necesidad de usuario/contrasena.
 *
 * Formato:  base64url(payload).base64url(firma)
 * payload:  { sub: clientId, exp: <unix segundos> }
 *
 * Es un mecanismo "magic link" minimo: cada correo lleva un enlace valido por
 * un tiempo limitado. No almacenamos sesiones en servidor.
 */
import crypto from 'node:crypto';
import { portalSigningSecret } from '../config/env';
import { UnauthorizedError } from '../utils/errors';

interface PortalTokenPayload {
  sub: string;
  exp: number;
}

function sign(data: string): string {
  return crypto.createHmac('sha256', portalSigningSecret()).update(data).digest('base64url');
}

/** Comparacion en tiempo constante de dos firmas. */
function firmasIguales(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Genera un enlace-token firmado para un cliente. */
export function signClientToken(clientId: string, ttlDays = 30): string {
  const payload: PortalTokenPayload = {
    sub: clientId,
    exp: Math.floor(Date.now() / 1000) + ttlDays * 86_400,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${data}.${sign(data)}`;
}

/** Verifica un token y devuelve el clientId. Lanza si es invalido o expirado. */
export function verifyClientToken(token: string): string {
  const [data, firma] = token.split('.');
  if (!data || !firma) throw new UnauthorizedError('Enlace invalido');

  if (!firmasIguales(firma, sign(data))) {
    throw new UnauthorizedError('Enlace invalido');
  }

  let payload: PortalTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as PortalTokenPayload;
  } catch {
    throw new UnauthorizedError('Enlace invalido');
  }

  if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) {
    throw new UnauthorizedError('El enlace ha expirado. Solicita uno nuevo.');
  }
  return payload.sub;
}
