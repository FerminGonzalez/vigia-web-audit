/**
 * lib/http.ts
 * -----------------------------------------------------------------------------
 * Cliente HTTP ligero sobre `fetch` nativo (Node 18+) con:
 *  - timeout via AbortController
 *  - reintentos con backoff exponencial
 *  - user-agent identificable
 */
import { logger } from '../config/logger';

export interface FetchOptions extends RequestInit {
  /** Timeout en milisegundos (por defecto 15s). */
  timeoutMs?: number;
  /** Numero de reintentos ante errores transitorios (por defecto 2). */
  retries?: number;
  /** Etiqueta para trazabilidad en logs. */
  label?: string;
}

export const USER_AGENT =
  'VigiaWebAuditBot/0.1 (+https://vigia.example.com/bot; auditoria-tecnica)';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Realiza una peticion HTTP con timeout y reintentos.
 * Lanza un Error si todas las tentativas fallan.
 */
export async function fetchWithTimeout(url: string, options: FetchOptions = {}): Promise<Response> {
  const { timeoutMs = 15_000, retries = 2, label = url, ...init } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          'user-agent': USER_AGENT,
          'accept-language': 'es-PA,es;q=0.9,en;q=0.8',
          ...(init.headers ?? {}),
        },
      });
      clearTimeout(timer);
      return response;
    } catch (error) {
      clearTimeout(timer);
      lastError = error;

      const esUltimo = attempt === retries;
      if (esUltimo) break;

      const espera = 300 * 2 ** attempt;
      logger.warn(
        { label, intento: attempt + 1, esperaMs: espera, err: (error as Error).message },
        'Fallo de red, reintentando...',
      );
      await sleep(espera);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Fallo la peticion a ${label}`);
}

/**
 * Obtiene el cuerpo de texto de una URL de forma segura.
 * Devuelve `null` en lugar de lanzar, para auditorias no bloqueantes.
 */
export async function safeFetchText(
  url: string,
  options: FetchOptions = {},
): Promise<{ ok: boolean; status: number; text: string } | null> {
  try {
    const res = await fetchWithTimeout(url, options);
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } catch (error) {
    logger.debug({ url, err: (error as Error).message }, 'safeFetchText fallo');
    return null;
  }
}
