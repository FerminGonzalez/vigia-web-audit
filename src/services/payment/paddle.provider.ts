/**
 * services/payment/paddle.provider.ts
 * -----------------------------------------------------------------------------
 * Adaptador de Paddle (Merchant of Record).
 *
 * Paddle es la via recomendada para facturar desde Panama: acepta empresas
 * panameñas con cuenta bancaria local y gestiona los impuestos globales.
 *
 * Documentacion: https://developer.paddle.com/webhooks/overview
 * Firma: cabecera `Paddle-Signature: ts=<unix>;h1=<hmac_sha256_hex>`.
 * El HMAC se calcula sobre `${ts}:${rawBody}` con el secreto del webhook.
 *
 * Nota: los webhooks de Paddle envian `customer_id` pero no siempre el email;
 * por eso el adaptador consulta la API para obtenerlo y asi ser robusto ante
 * cualquier orden de eventos.
 */
import crypto from 'node:crypto';
import { SubscriptionStatus } from '@prisma/client';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { ExternalServiceError } from '../../utils/errors';
import type { CheckoutParams, ParsedWebhook, PaymentProvider, NormalizedEvent } from './types';

const TOLERANCIA_SEGUNDOS = 5 * 60;

function apiBase(): string {
  return env.PADDLE_ENVIRONMENT === 'production'
    ? 'https://api.paddle.com'
    : 'https://sandbox-api.paddle.com';
}

/** Verifica la firma del webhook de Paddle. */
function verificarFirma(rawBody: Buffer, header: string | undefined): void {
  if (!header || !env.PADDLE_WEBHOOK_SECRET) {
    throw new Error('Falta la firma o el secreto de Paddle');
  }

  const partes = Object.fromEntries(
    header.split(';').map((kv) => kv.split('=') as [string, string]),
  );
  const ts = partes.ts;
  const h1 = partes.h1;
  if (!ts || !h1) throw new Error('Cabecera Paddle-Signature mal formada');

  const ahora = Math.floor(Date.now() / 1000);
  if (Math.abs(ahora - Number(ts)) > TOLERANCIA_SEGUNDOS) {
    throw new Error('El webhook de Paddle es demasiado antiguo (posible replay)');
  }

  const esperado = crypto
    .createHmac('sha256', env.PADDLE_WEBHOOK_SECRET)
    .update(`${ts}:${rawBody.toString('utf8')}`)
    .digest('hex');

  const a = Buffer.from(esperado);
  const b = Buffer.from(h1);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error('Firma de Paddle invalida');
  }
}

/** Mapea los estados de Paddle a nuestro enum. */
function mapStatus(status: string): SubscriptionStatus {
  switch (status) {
    case 'active':
    case 'trialing':
      return SubscriptionStatus.ACTIVE;
    case 'past_due':
      return SubscriptionStatus.PAST_DUE;
    case 'canceled':
      return SubscriptionStatus.CANCELED;
    case 'paused':
      return SubscriptionStatus.PAUSED;
    default:
      return SubscriptionStatus.INCOMPLETE;
  }
}

/** Consulta la API de Paddle para obtener el email del cliente. */
async function fetchCustomerEmail(customerId: string | null): Promise<string | null> {
  if (!customerId) return null;
  try {
    const res = await fetch(`${apiBase()}/customers/${customerId}`, {
      headers: { authorization: `Bearer ${env.PADDLE_API_KEY}` },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { email?: string } };
    return json.data?.email ?? null;
  } catch (error) {
    logger.warn({ customerId, err: (error as Error).message }, 'No se pudo obtener el cliente de Paddle');
    return null;
  }
}

/**
 * Errores de normalizacion. Al lanzarlos, el controlador responde 5xx y el
 * proveedor reintenta el webhook: nunca perdemos un pago en silencio.
 */
function emailRequerido(email: string | null): string {
  if (!email) {
    throw new Error('No se pudo determinar el email del cliente de Paddle; el evento se reintentara');
  }
  return email;
}

function subscriptionIdRequerido(id: string): string {
  if (!id) {
    throw new Error('Evento de Paddle sin subscription_id; el evento se reintentara');
  }
  return id;
}

interface PaddleEvent {
  event_id: string;
  event_type: string;
  data: Record<string, unknown>;
}

interface PaddleData {
  custom_data?: { businessName?: string; siteUrl?: string } | null;
  customer_id?: string | null;
  subscription_id?: string | null;
  id?: string;
  status?: string;
  items?: { price?: { id?: string } }[];
  current_billing_period?: { ends_at?: string } | null;
  scheduled_change?: { action?: string } | null;
  customer?: { email?: string } | null;
}

async function normalizePaddleEvent(event: PaddleEvent): Promise<NormalizedEvent> {
  const data = event.data as PaddleData;

  switch (event.event_type) {
    case 'transaction.completed': {
      const customerId = data.customer_id ?? null;
      const email = emailRequerido(data.customer?.email ?? (await fetchCustomerEmail(customerId)));
      return {
        kind: 'checkout.completed',
        email,
        businessName: data.custom_data?.businessName ?? email.split('@')[0] ?? 'Tu negocio',
        siteUrl: data.custom_data?.siteUrl ?? '',
        customerId,
      };
    }

    case 'subscription.created':
    case 'subscription.updated':
    case 'subscription.activated':
    case 'subscription.trialing':
    case 'subscription.paused':
    case 'subscription.resumed': {
      const customerId = data.customer_id ?? null;
      const email = data.customer?.email ?? (await fetchCustomerEmail(customerId));
      return {
        kind: 'subscription.upsert',
        customerId,
        subscriptionId: subscriptionIdRequerido(data.id ?? data.subscription_id ?? ''),
        priceId: data.items?.[0]?.price?.id ?? null,
        status: mapStatus(data.status ?? 'active'),
        currentPeriodEnd: data.current_billing_period?.ends_at
          ? new Date(data.current_billing_period.ends_at)
          : null,
        cancelAtPeriodEnd: data.scheduled_change?.action === 'cancel',
        email,
        businessName: data.custom_data?.businessName ?? (email ? email.split('@')[0] : null),
        siteUrl: data.custom_data?.siteUrl ?? null,
      };
    }

    case 'subscription.canceled':
      return { kind: 'subscription.canceled', subscriptionId: subscriptionIdRequerido(data.id ?? '') };

    case 'subscription.past_due':
      return { kind: 'subscription.past_due', subscriptionId: subscriptionIdRequerido(data.id ?? '') };

    default:
      return { kind: 'ignored' };
  }
}

export const paddleProvider: PaymentProvider = {
  id: 'paddle',

  async verifyAndParse(rawBody, headers) {
    verificarFirma(rawBody, headers['paddle-signature']);
    const parsed = JSON.parse(rawBody.toString('utf8')) as PaddleEvent;
    return { id: parsed.event_id, type: parsed.event_type, event: await normalizePaddleEvent(parsed) };
  },

  async createCheckout(params: CheckoutParams): Promise<string> {
    const res = await fetch(`${apiBase()}/transactions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.PADDLE_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        items: [{ price_id: params.priceId, quantity: 1 }],
        custom_data: { businessName: params.businessName, siteUrl: params.siteUrl },
      }),
    });

    if (!res.ok) {
      throw new ExternalServiceError('Paddle', `No se pudo crear el checkout (${res.status})`);
    }

    const json = (await res.json()) as { data?: { checkout?: { url?: string } } };
    const url = json.data?.checkout?.url;
    if (!url) throw new ExternalServiceError('Paddle', 'Paddle no devolvio una URL de checkout');
    return url;
  },

  async createPortalSession(): Promise<string> {
    // Paddle gestiona la autogestion a traves de su portal de cliente. No existe
    // un endpoint de sesion equivalente al de Stripe, por lo que el cliente se
    // gestiona mediante los correos de Paddle o contactando a soporte.
    throw new ExternalServiceError(
      'Paddle',
      'El portal de autogestion no esta disponible; escribe a soporte para gestionar tu suscripcion.',
    );
  },
};

export { verificarFirma as _verificarFirmaPaddleForTests };
