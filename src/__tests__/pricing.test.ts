/**
 * Pruebas de la configuracion de precios.
 */
import { describe, expect, it } from 'vitest';
import { PLANS, getPlan, planPriceId } from '../config/pricing';

describe('pricing', () => {
  it('define tres planes comerciales', () => {
    expect(PLANS).toHaveLength(3);
    expect(PLANS.map((p) => p.id)).toEqual(['basico', 'pro', 'agencia']);
  });

  it('los precios son crecientes', () => {
    const precios = PLANS.map((p) => p.priceUsd);
    expect(precios[0]).toBeLessThan(precios[1] ?? 0);
    expect(precios[1]).toBeLessThan(precios[2] ?? 0);
  });

  it('getPlan devuelve el plan correcto o undefined', () => {
    expect(getPlan('pro')?.name).toBe('Pro');
    expect(getPlan('inexistente')).toBeUndefined();
  });

  it('planPriceId resuelve el precio de Stripe configurado', () => {
    const basico = getPlan('basico');
    expect(basico).toBeDefined();
    expect(planPriceId(basico!, 'stripe')).toBe('price_test_basico');
  });

  it('planPriceId devuelve undefined si el proveedor no esta configurado', () => {
    const basico = getPlan('basico');
    expect(planPriceId(basico!, 'paddle')).toBeUndefined();
  });
});
