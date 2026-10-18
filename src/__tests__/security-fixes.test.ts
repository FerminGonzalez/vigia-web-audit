/**
 * Pruebas de las correcciones criticas de seguridad:
 *  - Guard SSRF (src/lib/ssrf-guard.ts)
 *  - Normalizacion de pagos de Paddle: un pago sin email no se descarta en silencio
 */
import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { assertPublicUrl, ipBloqueada } from '../lib/ssrf-guard';
import { paddleProvider } from '../services/payment/paddle.provider';

describe('ssrf-guard: ipBloqueada', () => {
  it('bloquea rangos internos, loopback y metadata cloud', () => {
    for (const ip of [
      '127.0.0.1',
      '10.1.2.3',
      '172.16.5.5',
      '192.168.1.1',
      '169.254.169.254',
      '0.0.0.0',
      '100.64.0.1',
      '224.0.0.1',
      '::1',
      'fe80::1',
      'fc00::1',
      '::ffff:127.0.0.1',
    ]) {
      expect(ipBloqueada(ip), ip).toBe(true);
    }
  });

  it('permite direcciones publicas', () => {
    expect(ipBloqueada('8.8.8.8')).toBe(false);
    expect(ipBloqueada('1.1.1.1')).toBe(false);
  });
});

describe('ssrf-guard: assertPublicUrl', () => {
  it('rechaza IPs internas y de metadata (sin tocar la red)', async () => {
    await expect(assertPublicUrl('http://169.254.169.254/latest/meta-data/')).rejects.toThrow();
    await expect(assertPublicUrl('http://127.0.0.1:8080/')).rejects.toThrow();
    await expect(assertPublicUrl('http://10.0.0.5/')).rejects.toThrow();
    await expect(assertPublicUrl('http://[::1]/')).rejects.toThrow();
    await expect(assertPublicUrl('http://[::ffff:127.0.0.1]/')).rejects.toThrow();
  });

  it('rechaza esquemas no http(s) y credenciales embebidas', async () => {
    await expect(assertPublicUrl('file:///etc/passwd')).rejects.toThrow();
    await expect(assertPublicUrl('gopher://example.com/')).rejects.toThrow();
    await expect(assertPublicUrl('http://user:pass@8.8.8.8/')).rejects.toThrow();
  });

  it('permite una IP literal publica', async () => {
    await expect(assertPublicUrl('http://8.8.8.8/')).resolves.toBeInstanceOf(URL);
  });
});

// --- Normalizacion de pagos de Paddle ---

function firmar(body: string, ts: number): string {
  const h1 = crypto.createHmac('sha256', 'paddle_test_secret').update(`${ts}:${body}`).digest('hex');
  return `ts=${ts};h1=${h1}`;
}

function evento(type: string, data: Record<string, unknown>): {
  body: Buffer;
  headers: Record<string, string | undefined>;
} {
  const body = JSON.stringify({ event_id: 'evt_test', event_type: type, data });
  const ts = Math.floor(Date.now() / 1000);
  return { body: Buffer.from(body), headers: { 'paddle-signature': firmar(body, ts) } };
}

describe('Paddle: no perder pagos en silencio', () => {
  it('rechaza (reintentable) un pago sin email resoluble', async () => {
    const { body, headers } = evento('transaction.completed', { customer_id: null });
    await expect(paddleProvider.verifyAndParse(body, headers)).rejects.toThrow(/email/i);
  });

  it('rechaza un evento de suscripcion sin subscription_id', async () => {
    const { body, headers } = evento('subscription.updated', { status: 'active' });
    await expect(paddleProvider.verifyAndParse(body, headers)).rejects.toThrow(/subscription_id/i);
  });
});
