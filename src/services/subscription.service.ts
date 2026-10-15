/**
 * services/subscription.service.ts
 * -----------------------------------------------------------------------------
 * Aplica eventos de pago normalizados a la base de datos.
 * Es agnostico del proveedor: recibe `NormalizedEvent` (ver payment/types.ts).
 */
import { SubscriptionStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logger } from '../config/logger';
import { sendAdminAlert, sendWelcomeEmail } from './email.service';
import type { NormalizedEvent } from './payment/types';

/** Punto de entrada: enruta el evento normalizado a su manejador. */
export async function applyPaymentEvent(provider: string, event: NormalizedEvent): Promise<void> {
  switch (event.kind) {
    case 'checkout.completed':
      await onCheckoutCompleted(provider, event);
      break;
    case 'subscription.upsert':
      await onSubscriptionUpsert(provider, event);
      break;
    case 'subscription.canceled':
      await onSubscriptionCanceled(event.subscriptionId);
      break;
    case 'subscription.past_due':
      await onStatusChange(event.subscriptionId, SubscriptionStatus.PAST_DUE);
      break;
    case 'subscription.active':
      await onStatusChange(event.subscriptionId, SubscriptionStatus.ACTIVE);
      break;
    case 'ignored':
      break;
  }
}

// ---------------------------------------------------------------------------
// Manejadores
// ---------------------------------------------------------------------------

async function onCheckoutCompleted(
  provider: string,
  event: Extract<NormalizedEvent, { kind: 'checkout.completed' }>,
): Promise<void> {
  const { email, businessName, siteUrl, customerId } = event;

  const client = await ensureClient({
    email,
    businessName,
    siteUrl,
    customerId: customerId ?? null,
    provider,
  });

  // Marcamos como convertido cualquier lead con ese correo.
  await prisma.lead
    .updateMany({ where: { email, status: { not: 'CONVERTED' } }, data: { status: 'CONVERTED', convertedAt: new Date() } })
    .catch(() => undefined);

  logger.info({ clientId: client.id, email, provider }, 'Cliente dado de alta');
  await sendAdminAlert(
    'Nueva suscripcion',
    `Cliente: ${businessName}\nEmail: ${email}\nSitio: ${siteUrl || '(no especificado)'}\nProveedor: ${provider}`,
  );
  await sendWelcomeEmail({
    to: email,
    businessName,
    siteUrl: siteUrl || 'tu sitio web',
    clientId: client.id,
  }).catch((error) => logger.warn({ err: error.message }, 'Fallo el correo de bienvenida'));
}

/**
 * Garantiza que existe un cliente para un correo (alta idempotente).
 * Reutilizado por el flujo de checkout y por el de suscripcion (para ser
 * robustos ante cualquier orden de webhooks de Paddle).
 */
async function ensureClient(input: {
  email: string;
  businessName: string;
  siteUrl: string;
  customerId: string | null;
  provider: string;
}) {
  const { email, businessName, siteUrl, customerId, provider } = input;

  const client = await prisma.client.upsert({
    where: { email },
    create: {
      email,
      businessName,
      paymentCustomerId: customerId ?? undefined,
      paymentProvider: provider,
      sites: siteUrl ? { create: { url: siteUrl, label: businessName, isActive: true } } : undefined,
    },
    update: {
      businessName,
      paymentCustomerId: customerId ?? undefined,
      paymentProvider: provider,
    },
    include: { sites: true },
  });

  if (siteUrl && client.sites.length === 0) {
    await prisma.site.create({
      data: { clientId: client.id, url: siteUrl, label: businessName, isActive: true },
    });
  }

  return client;
}

async function onSubscriptionUpsert(
  provider: string,
  event: Extract<NormalizedEvent, { kind: 'subscription.upsert' }>,
): Promise<void> {
  let client = event.customerId
    ? await prisma.client.findFirst({ where: { paymentCustomerId: event.customerId } })
    : null;

  // Si el webhook de suscripcion llega antes que el de checkout, creamos el
  // cliente a partir del email (robustez ante cualquier orden de eventos).
  if (!client && event.email) {
    client = await ensureClient({
      email: event.email,
      businessName: event.businessName ?? event.email.split('@')[0] ?? 'Tu negocio',
      siteUrl: event.siteUrl ?? '',
      customerId: event.customerId,
      provider,
    });
  }

  if (!client) {
    logger.warn({ customerId: event.customerId }, 'Suscripcion sin cliente asociado; se omite');
    return;
  }

  await prisma.subscription.upsert({
    where: { externalSubscriptionId: event.subscriptionId },
    create: {
      clientId: client.id,
      provider,
      externalSubscriptionId: event.subscriptionId,
      externalPriceId: event.priceId,
      status: event.status,
      cancelAtPeriodEnd: event.cancelAtPeriodEnd,
      currentPeriodEnd: event.currentPeriodEnd,
    },
    update: {
      provider,
      externalPriceId: event.priceId,
      status: event.status,
      cancelAtPeriodEnd: event.cancelAtPeriodEnd,
      currentPeriodEnd: event.currentPeriodEnd,
    },
  });

  logger.info({ clientId: client.id, status: event.status }, 'Suscripcion sincronizada');
}

async function onSubscriptionCanceled(subscriptionId: string): Promise<void> {
  const sub = await prisma.subscription.findUnique({ where: { externalSubscriptionId: subscriptionId } });
  if (!sub) return;

  await prisma.subscription.update({
    where: { externalSubscriptionId: subscriptionId },
    data: { status: SubscriptionStatus.CANCELED, cancelAtPeriodEnd: false },
  });
  await prisma.site.updateMany({ where: { clientId: sub.clientId }, data: { isActive: false } });

  logger.info({ subscriptionId }, 'Suscripcion cancelada');
  await sendAdminAlert('Suscripcion cancelada', `Subscription: ${subscriptionId}`);
}

async function onStatusChange(subscriptionId: string, status: SubscriptionStatus): Promise<void> {
  const sub = await prisma.subscription.findUnique({ where: { externalSubscriptionId: subscriptionId } });
  if (!sub) return;

  await prisma.subscription.update({ where: { externalSubscriptionId: subscriptionId }, data: { status } });
  // Reactivamos los sitios cuando la suscripcion vuelve a estar activa.
  if (status === SubscriptionStatus.ACTIVE) {
    await prisma.site.updateMany({ where: { clientId: sub.clientId }, data: { isActive: true } });
  }
  logger.info({ subscriptionId, status }, 'Estado de suscripcion actualizado');
}
