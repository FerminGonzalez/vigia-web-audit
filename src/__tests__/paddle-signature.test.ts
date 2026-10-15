/**
 * Pruebas de la verificacion de firma de Paddle.
 */
import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { _verificarFirmaPaddleForTests } from '../services/payment/paddle.provider';

const SECRET = 'paddle_test_secret';

function firmar(body: string, ts: number): string {
  const h1 = crypto.createHmac('sha256', SECRET).update(`${ts}:${body}`).digest('hex');
  return `ts=${ts};h1=${h1}`;
}

describe('firma de Paddle', () => {
  it('acepta una firma valida y reciente', () => {
    const body = JSON.stringify({ event_id: 'evt_1', event_type: 'subscription.created' });
    const ts = Math.floor(Date.now() / 1000);
    expect(() =>
      _verificarFirmaPaddleForTests(Buffer.from(body), firmar(body, ts)),
    ).not.toThrow();
  });

  it('rechaza una firma incorrecta', () => {
    const body = JSON.stringify({ event_id: 'evt_1' });
    const ts = Math.floor(Date.now() / 1000);
    expect(() =>
      _verificarFirmaPaddleForTests(Buffer.from(body), `ts=${ts};h1=deadbeef`),
    ).toThrow();
  });

  it('rechaza un evento demasiado antiguo (replay)', () => {
    const body = JSON.stringify({ event_id: 'evt_1' });
    const ts = Math.floor(Date.now() / 1000) - 3600;
    expect(() => _verificarFirmaPaddleForTests(Buffer.from(body), firmar(body, ts))).toThrow();
  });

  it('rechaza una cabecera mal formada', () => {
    expect(() => _verificarFirmaPaddleForTests(Buffer.from('{}'), 'basura')).toThrow();
  });
});
