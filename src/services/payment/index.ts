/**
 * services/payment/index.ts
 * -----------------------------------------------------------------------------
 * Fachada de la capa de pagos: selecciona el proveedor activo y expone las
 * operaciones de alto nivel usadas por los controladores.
 */
import type { Plan } from '../../config/pricing';
import { planPriceId } from '../../config/pricing';
import { prisma } from '../../lib/prisma';
import { logger } from '../../config/logger';
import { env } from '../../config/env';
import { ValidationError } from '../../utils/errors';
import { stripeProvider } from './stripe.provider';
import { paddleProvider } from './paddle.provider';
import { applyPaymentEvent } from '../subscription.service';
import type { CheckoutParams, PaymentProvider } from './types';

/** Devuelve el proveedor por id (o el configurado por defecto). */
export function getPaymentProvider(id?: string): PaymentProvider {
  const target = id ?? env.PAYMENT_PROVIDER;
  return target === 'paddle' ? paddleProvider : stripeProvider;
}

/**
 * Procesa un webhook entrante de forma idempotente.
 * Devuelve `processed=false` si el evento ya se habia visto.
 */
export async function handlePaymentWebhook(
  providerId: string,
  rawBody: Buffer,
  headers: Record<string, string | undefined>,
): Promise<{ processed: boolean; id: string }> {
  const provider = getPaymentProvider(providerId);
  const { id, type, event } = await provider.verifyAndParse(rawBody, headers);

  const yaVisto = await prisma.processedWebhook.findUnique({ where: { id } });
  if (yaVisto) {
    logger.info({ id, type }, 'Webhook duplicado; ignorado');
    return { processed: false, id };
  }

  await applyPaymentEvent(provider.id, event);
  await prisma.processedWebhook.create({ data: { id, provider: provider.id, type } });
  return { processed: true, id };
}

/** Crea el checkout para un plan con el proveedor activo. */
export async function createCheckoutForPlan(
  plan: Plan,
  params: Omit<CheckoutParams, 'priceId'>,
): Promise<string> {
  const provider = getPaymentProvider();
  const priceId = planPriceId(plan, provider.id);
  if (!priceId) {
    throw new ValidationError(`El plan ${plan.name} no esta configurado en ${provider.id}`);
  }
  return provider.createCheckout({ ...params, priceId });
}

/** Crea el portal de autogestion para un cliente. */
export async function createPortalForClient(
  customerId: string,
  returnUrl: string,
): Promise<string> {
  return getPaymentProvider().createPortalSession(customerId, returnUrl);
}
