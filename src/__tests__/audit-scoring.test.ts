/**
 * Pruebas de la logica de puntuacion SEO y normalizacion de URLs.
 */
import { describe, expect, it } from 'vitest';
import { computeSeoScore, normalizeUrl } from '../services/audit.service';
import type { SeoAnalysis } from '../types';

function baseSeo(overrides: Partial<SeoAnalysis> = {}): SeoAnalysis {
  return {
    score: null,
    title: { value: 'Un titulo suficientemente largo', length: 32, ok: true },
    metaDescription: {
      value: 'Una descripcion suficientemente larga para superar los setenta caracteres exigidos por la heuristica local.',
      length: 105,
      ok: true,
    },
    h1Count: 1,
    headingCount: 5,
    images: { total: 4, missingAlt: 0 },
    hasViewport: true,
    hasCanonical: true,
    hasOpenGraph: true,
    hasLangAttribute: true,
    lang: 'es',
    robotsTxt: true,
    sitemapXml: true,
    ...overrides,
  };
}

describe('normalizeUrl', () => {
  it('anade https si falta el protocolo', () => {
    expect(normalizeUrl('panama.com')).toBe('https://panama.com');
  });
  it('respeta el protocolo existente', () => {
    expect(normalizeUrl('http://panama.com')).toBe('http://panama.com');
  });
});

describe('computeSeoScore', () => {
  it('otorga 100 a un sitio bien optimizado', () => {
    expect(computeSeoScore(baseSeo())).toBe(100);
  });

  it('penaliza la ausencia de titulo', () => {
    const score = computeSeoScore(
      baseSeo({ title: { value: null, length: 0, ok: false } }),
    );
    expect(score).toBeLessThan(100);
    expect(score).toBeLessThanOrEqual(75);
  });

  it('penaliza imagenes sin texto alternativo', () => {
    const score = computeSeoScore(baseSeo({ images: { total: 10, missingAlt: 10 } }));
    expect(score).toBeLessThan(100);
  });

  it('nunca devuelve menos de 0', () => {
    const score = computeSeoScore(
      baseSeo({
        title: { value: null, length: 0, ok: false },
        metaDescription: { value: null, length: 0, ok: false },
        h1Count: 0,
        images: { total: 10, missingAlt: 10 },
        hasViewport: false,
        hasCanonical: false,
        hasOpenGraph: false,
        hasLangAttribute: false,
        robotsTxt: false,
      }),
    );
    expect(score).toBeGreaterThanOrEqual(0);
  });
});
