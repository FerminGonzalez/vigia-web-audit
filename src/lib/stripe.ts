/**
 * lib/stripe.ts
 * -----------------------------------------------------------------------------
 * Cliente Stripe con inicializacion perezosa (lazy).
 *
 * Se crea solo cuando se usa, para que la app arranque con PAYMENT_PROVIDER=paddle
 * sin necesidad de credenciales de Stripe.
 */
import Stripe from 'stripe';
import { env } from '../config/env';

let _stripe: Stripe | null = null;

/** Devuelve el cliente Stripe (lo crea la primera vez). */
export function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY no esta configurada');
  }
  if (!_stripe) {
    _stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
      appInfo: { name: 'Vigia Web Audit', version: '0.1.0' },
    });
  }
  return _stripe;
}

/**
 * Crea una sesion de Checkout para una nueva suscripcion.
 * Usado por el endpoint publico de alta.
 */
export async function createCheckoutSession(params: {
  email: string;
  businessName: string;
  siteUrl: string;
  /** Precio recurrente a cobrar. Si se omite, usa STRIPE_PRICE_ID. */
  priceId?: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  const priceId = params.priceId ?? env.STRIPE_PRICE_ID;
  if (!priceId) throw new Error('No hay un priceId de Stripe configurado para este plan');

  const session = await getStripe().checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: params.email,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      businessName: params.businessName,
      siteUrl: params.siteUrl,
    },
    subscription_data: {
      metadata: {
        businessName: params.businessName,
        siteUrl: params.siteUrl,
      },
    },
  });

  if (!session.url) throw new Error('Stripe no devolvio una URL de checkout');
  return session.url;
}

/** Crea una sesion del portal de facturacion (autogestion del cliente). */
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string,
): Promise<string> {
  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return session.url;
}
