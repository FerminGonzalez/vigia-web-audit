/**
 * Pruebas de los tokens firmados del portal / baja.
 */
import { describe, expect, it } from 'vitest';
import { signClientToken, verifyClientToken } from '../services/auth-token.service';

describe('auth-token', () => {
  it('firma y verifica un token correctamente', () => {
    const token = signClientToken('cliente_123', 30);
    expect(verifyClientToken(token)).toBe('cliente_123');
  });

  it('rechaza un token manipulado', () => {
    const token = signClientToken('cliente_123', 30);
    const manipulado = `${token.slice(0, -2)}XX`;
    expect(() => verifyClientToken(manipulado)).toThrow();
  });

  it('rechaza un token mal formado', () => {
    expect(() => verifyClientToken('basura')).toThrow();
  });

  it('rechaza un token expirado', () => {
    const expirado = signClientToken('cliente_123', -1);
    expect(() => verifyClientToken(expirado)).toThrow();
  });
});
