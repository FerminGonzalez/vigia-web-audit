/**
 * lib/ssrf-guard.ts
 * -----------------------------------------------------------------------------
 * Defensa SSRF (Server-Side Request Forgery).
 *
 * Antes de realizar cualquier peticion saliente hacia una URL controlada por el
 * usuario (auditorias, robots.txt, etc.) validamos que el destino sea publico:
 *  - solo se permiten esquemas http/https;
 *  - se rechazan credenciales embebidas (http://user:pass@host);
 *  - se resuelve el host y se rechaza si apunta a loopback, rangos privados,
 *    link-local (metadata cloud 169.254.169.254), CGNAT, multicast, reservados
 *    o direcciones IPv6 internas (incluidas las IPv4 mapeadas ::ffff:*).
 *
 * Si el host no puede resolverse se permite continuar: sin resolucion no hay IP
 * interna a la que apuntar y el `fetch` fallara por si solo. Esto evita romper
 * dominios momentaneamente caidos sin abrir una via SSRF.
 */
import dns from 'node:dns/promises';
import net from 'node:net';
import { ValidationError } from '../utils/errors';

const PROTOCOLOS_PERMITIDOS = new Set(['http:', 'https:']);

/** True si una direccion IPv4 pertenece a un rango no publico o reservado. */
function ipv4Bloqueada(ip: string): boolean {
  const partes = ip.split('.');
  if (partes.length !== 4) return true;
  const octetos = partes.map((p) => Number(p));
  if (octetos.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;

  const [a, b] = octetos as [number, number, number, number];
  if (a === 0) return true; // 0.0.0.0/8 "this network"
  if (a === 10) return true; // 10.0.0.0/8 privado
  if (a === 127) return true; // loopback
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  if (a === 169 && b === 254) return true; // link-local / metadata 169.254.0.0/16
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 privado
  if (a === 192 && b === 0) return true; // 192.0.0.0/24 y 192.0.2.0/24 (docs)
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 privado
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking 198.18.0.0/15
  if (a === 198 && b === 51) return true; // 198.51.100.0/24 (docs)
  if (a === 203 && b === 0) return true; // 203.0.113.0/24 (docs)
  if (a >= 224) return true; // multicast 224.0.0.0/4 + reservado 240.0.0.0/4 + broadcast
  return false;
}

/** True si una direccion IPv6 es no publica (o encapsula una IPv4 interna). */
function ipv6Bloqueada(ip: string): boolean {
  const direccion = (ip.split('%')[0] ?? ip).toLowerCase();

  // IPv4 mapeada (::ffff:a.b.c.d). El parser de URL puede comprimirla a la
  // forma hexadecimal (::ffff:7f00:1), asi que contemplamos ambas.
  if (direccion.startsWith('::ffff:')) {
    const cola = direccion.slice('::ffff:'.length);
    if (cola.includes('.')) return ipv4Bloqueada(cola);
    const grupos = cola.split(':');
    if (grupos.length === 2) {
      const hi = Number.parseInt(grupos[0] as string, 16);
      const lo = Number.parseInt(grupos[1] as string, 16);
      if (Number.isFinite(hi) && Number.isFinite(lo)) {
        const v4 = `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`;
        return ipv4Bloqueada(v4);
      }
    }
    return true; // forma de IPv4 mapeada no reconocida -> bloquear
  }

  if (direccion === '::' || direccion === '::1') return true; // no especificada / loopback
  if (/^f[cd]/.test(direccion)) return true; // fc00::/7 unique local
  if (/^fe[89ab]/.test(direccion)) return true; // fe80::/10 link-local
  if (/^ff/.test(direccion)) return true; // ff00::/8 multicast
  if (direccion.startsWith('2001:db8')) return true; // 2001:db8::/32 (docs)
  if (direccion.startsWith('64:ff9b')) return true; // NAT64
  return false;
}

/** True si la cadena IP debe bloquearse por ser no publica o no reconocida. */
export function ipBloqueada(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) return ipv4Bloqueada(ip);
  if (version === 6) return ipv6Bloqueada(ip);
  return true; // no es una IP valida -> bloquear por precaucion
}

/**
 * Valida que `rawUrl` sea una URL http(s) con destino publico.
 * Devuelve la URL ya parseada o lanza `ValidationError` si no es segura.
 */
export async function assertPublicUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new ValidationError('La direccion del sitio no es valida');
  }

  if (!PROTOCOLOS_PERMITIDOS.has(url.protocol)) {
    throw new ValidationError('Solo se permiten direcciones http:// o https://');
  }
  if (url.username || url.password) {
    throw new ValidationError('La direccion no puede incluir credenciales');
  }

  const host = url.hostname.replace(/^\[|\]$/g, '');

  // Host que ya es una IP literal: se valida directamente, sin DNS.
  if (net.isIP(host)) {
    if (ipBloqueada(host)) throw new ValidationError('Ese destino no esta permitido');
    return url;
  }

  let direcciones: { address: string }[];
  try {
    direcciones = await dns.lookup(host, { all: true, verbatim: true });
  } catch {
    // No resoluble: no hay IP interna a la que apuntar; el fetch fallara solo.
    return url;
  }

  if (direcciones.some((d) => ipBloqueada(d.address))) {
    throw new ValidationError('Ese destino no esta permitido');
  }
  return url;
}
