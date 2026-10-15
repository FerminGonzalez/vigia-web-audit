/**
 * services/payment/stripe.provider.ts
 * -----------------------------------------------------------------------------
 * Adaptador de Stripe.
 * Traduce los eventos de Stripe a `NormalizedEvent`.
 */
import type Stripe from 'stripe';
import { SubscriptionStatus } from '@prisma/client';
import { env } from '../../config/env';
import { getStripe, createCheckoutSession, createBillingPortalSession } from '../../lib/stripe';
import type { CheckoutParams, ParsedWebhook, PaymentProvider } from './types';

/** Normaliza un campo que puede ser string u objeto con id. */
function asId(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id;
}

function toDate(unixSeconds: number | null | undefined): Date | null {
  return typeof unixSeconds === 'number' ? new Date(unixSeconds * 1000) : null;
}

function mapStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'active':
    case 'trialing':
      return SubscriptionStatus.ACTIVE;
    case 'past_due':
    case 'unpaid':
      return SubscriptionStatus.PAST_DUE;
    case 'canceled':
      return SubscriptionStatus.CANCELED;
    case 'incomplete':
    case 'incomplete_expired':
      return SubscriptionStatus.INCOMPLETE;
    case 'paused':
      return SubscriptionStatus.PAUSED;
    default:
      return SubscriptionStatus.INCOMPLETE;
  }
}

export const stripeProvider: PaymentProvider = {
  id: 'stripe',

  verifyAndParse(rawBody, headers) {
    const signature = headers['stripe-signature'];
    if (!signature || !env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('Falta la firma o el secreto de Stripe');
    }
    const event = getStripe().webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    return { id: event.id, type: event.type, event: normalizeStripeEvent(event) };
  },

  createCheckout(params: CheckoutParams) {
    return createCheckoutSession(params);
  },

  createPortalSession(customerId, returnUrl) {
    return createBillingPortalSession(customerId, returnUrl);
  },
};

function normalizeStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object as Stripe.Checkout.Session;
      const email = s.customer_details?.email ?? s.customer_email ?? null;
      if (!email) return { kind: 'ignored' as const };
      return {
        kind: 'checkout.completed' as const,
        email,
        businessName: s.metadata?.businessName ?? s.metadata?.business_name ?? email.split('@')[0] ?? 'Tu negocio',
        siteUrl: s.metadata?.siteUrl ?? '',
        customerId: asId(s.customer),
      };
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      return {
        kind: 'subscription.upsert' as const,
        customerId: asId(sub.customer),
        subscriptionId: sub.id,
        priceId: sub.items.data[0]?.price?.id ?? null,
        status: mapStatus(sub.status),
        currentPeriodEnd: toDate(sub.current_period_end),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      };
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      return { kind: 'subscription.canceled' as const, subscriptionId: sub.id };
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = asId(invoice.subscription);
      return subscriptionId
        ? { kind: 'subscription.active' as const, subscriptionId }
        : { kind: 'ignored' as const };
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = asId(invoice.subscription);
      return subscriptionId
        ? { kind: 'subscription.past_due' as const, subscriptionId }
        : { kind: 'ignored' as const };
    }

    default:
      return { kind: 'ignored' as const };
  }
}
