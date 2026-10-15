/**
 * services/payment/types.ts
 * -----------------------------------------------------------------------------
 * Contrato comun de la capa de pagos.
 *
 * Cada pasarela (Stripe, Paddle) traduce sus eventos crudos a un
 * `NormalizedEvent`. El resto del sistema (suscripciones, correos, BD) solo
 * conoce esta representacion, por lo que anadir un nuevo proveedor no obliga a
 * tocar la logica de negocio.
 */
import type { SubscriptionStatus } from '@prisma/client';

export type NormalizedEvent =
  | {
      kind: 'checkout.completed';
      email: string;
      businessName: string;
      siteUrl: string;
      customerId?: string | null;
    }
  | {
      kind: 'subscription.upsert';
      customerId: string | null;
      subscriptionId: string;
      priceId: string | null;
      status: SubscriptionStatus;
      currentPeriodEnd: Date | null;
      cancelAtPeriodEnd: boolean;
      /** Datos de identidad opcionales (permiten crear el cliente si el webhook de checkout llega despues). */
      email?: string | null;
      businessName?: string | null;
      siteUrl?: string | null;
    }
  | { kind: 'subscription.canceled'; subscriptionId: string }
  | { kind: 'subscription.past_due'; subscriptionId: string }
  | { kind: 'subscription.active'; subscriptionId: string }
  | { kind: 'ignored' };

export interface ParsedWebhook {
  /** Identificador unico del evento (para idempotencia). */
  id: string;
  /** Tipo de evento original del proveedor. */
  type: string;
  event: NormalizedEvent;
}

export interface CheckoutParams {
  email: string;
  businessName: string;
  siteUrl: string;
  successUrl: string;
  cancelUrl: string;
  /** Identificador de precio del proveedor. */
  priceId: string;
}

export interface PaymentProvider {
  id: 'stripe' | 'paddle';
  /**
   * Verifica la firma y normaliza el evento. Lanza si la firma es invalida.
   * Puede ser asincrono (Paddle necesita consultar datos del cliente).
   */
  verifyAndParse(
    rawBody: Buffer,
    headers: Record<string, string | undefined>,
  ): ParsedWebhook | Promise<ParsedWebhook>;
  /** Crea una sesion de pago y devuelve la URL a la que redirigir. */
  createCheckout(params: CheckoutParams): Promise<string>;
  /** Crea una sesion del portal de autogestion (o lanza si no aplica). */
  createPortalSession(customerId: string, returnUrl: string): Promise<string>;
}
