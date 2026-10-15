/**
 * config/pricing.ts
 * -----------------------------------------------------------------------------
 * Fuente unica de verdad de los planes comerciales.
 *
 * La landing, el endpoint de checkout y los correos leen de aqui, de modo que
 * precios y caracteristicas NUNCA quedan desincronizados.
 *
 * El `priceId` de Stripe se resuelve desde variables de entorno para no
 * hardcodear identificadores.
 */
import { env } from './env';

export interface Plan {
  id: 'basico' | 'pro' | 'agencia';
  name: string;
  priceUsd: number;
  interval: 'month';
  tagline: string;
  /** Numero de sitios webs incluidos. */
  sites: number;
  features: string[];
  highlighted?: boolean;
  /** Variable de entorno con el priceId de Stripe. */
  envKey: 'STRIPE_PRICE_ID' | 'STRIPE_PRICE_ID_PRO' | 'STRIPE_PRICE_ID_AGENCY';
  /** Variable de entorno con el priceId de Paddle. */
  paddleEnvKey: 'PADDLE_PRICE_ID' | 'PADDLE_PRICE_ID_PRO' | 'PADDLE_PRICE_ID_AGENCY';
}

export const PLANS: Plan[] = [
  {
    id: 'basico',
    name: 'Basico',
    priceUsd: 29,
    interval: 'month',
    tagline: 'Para tu negocio, un sitio.',
    sites: 1,
    envKey: 'STRIPE_PRICE_ID',
    paddleEnvKey: 'PADDLE_PRICE_ID',
    features: [
      'Auditoria automatica cada semana',
      'Informe en espanol por correo',
      'Rendimiento, SEO y seguridad',
      'Historico en el portal del cliente',
      'Soporte por correo',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    priceUsd: 59,
    interval: 'month',
    tagline: 'Para negocios que quieren crecer.',
    sites: 1,
    highlighted: true,
    envKey: 'STRIPE_PRICE_ID_PRO',
    paddleEnvKey: 'PADDLE_PRICE_ID_PRO',
    features: [
      'Todo lo del plan Basico',
      'Informe con plan de accion priorizado',
      'Alertas inmediatas si el sitio se cae',
      'Comparativa mes a mes (tendencias)',
      'Seguimiento de palabras clave clave',
      'Soporte prioritario por WhatsApp',
    ],
  },
  {
    id: 'agencia',
    name: 'Agencia',
    priceUsd: 149,
    interval: 'month',
    tagline: 'Para agencias y multiples sucursales.',
    sites: 10,
    envKey: 'STRIPE_PRICE_ID_AGENCY',
    paddleEnvKey: 'PADDLE_PRICE_ID_AGENCY',
    features: [
      'Todo lo del plan Pro',
      'Hasta 10 sitios webs',
      'Informes con tu marca (white-label)',
      'Panel multi-cliente',
      'Exportacion PDF/CSV',
      'Gestor de cuenta dedicado',
    ],
  },
];

/** Devuelve el plan por id. */
export function getPlan(id: string): Plan | undefined {
  return PLANS.find((plan) => plan.id === id);
}

/** Devuelve el priceId configurado para un plan y proveedor (o undefined). */
export function planPriceId(plan: Plan, provider: 'stripe' | 'paddle' = 'stripe'): string | undefined {
  return provider === 'paddle' ? env[plan.paddleEnvKey] : env[plan.envKey];
}

export function formatPrice(plan: Plan): string {
  return `$${plan.priceUsd}`;
}
