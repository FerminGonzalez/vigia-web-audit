/**
 * controllers/payment.controller.ts
 * -----------------------------------------------------------------------------
 * Controladores de la pasarela de pagos (agnosticos del proveedor).
 *  - webhook:  recibe eventos de Stripe o Paddle y sincroniza suscripciones.
 *  - checkout: crea la sesion de pago para un nuevo cliente.
 *  - portal:   abre el portal de autogestion de la suscripcion.
 */
import type { Request, Response } from 'express';
import { z } from 'zod';
import { handlePaymentWebhook, createCheckoutForPlan, createPortalForClient } from '../services/payment';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import { getPlan, PLANS } from '../config/pricing';
import { ValidationError, NotFoundError } from '../utils/errors';

/**
 * POST /api/webhooks/:provider
 * Requiere el cuerpo CRUDO (Buffer); se monta con express.raw() en las rutas.
 */
export async function paymentWebhook(req: Request, res: Response): Promise<void> {
  const providerId = req.params.provider ?? env.PAYMENT_PROVIDER;

  try {
    const { processed } = await handlePaymentWebhook(
      providerId,
      req.body as Buffer,
      req.headers as Record<string, string | undefined>,
    );
    res.json({ ok: true, received: true, processed });
  } catch (error) {
    // 400 si la firma es invalida (no reintentar); 500 para que el proveedor reintente.
    const mensaje = (error as Error).message;
    const esFirma = /firma|signature|secreto|mal formada|antiguo/i.test(mensaje);
    res
      .status(esFirma ? 400 : 500)
      .json({ ok: false, error: { code: esFirma ? 'INVALID_SIGNATURE' : 'WEBHOOK_PROCESSING_FAILED', message: mensaje } });
  }
}

/** Esquema de validacion para el alta de suscripcion. */
const checkoutSchema = z.object({
  email: z.string().email(),
  businessName: z.string().min(2).max(120),
  siteUrl: z.string().url(),
  plan: z.string().optional(),
});

/** POST /api/billing/checkout */
export async function createCheckout(req: Request, res: Response): Promise<void> {
  const data = checkoutSchema.parse(req.body);
  const plan = data.plan ? getPlan(data.plan) : PLANS[0];
  if (!plan) throw new ValidationError('Plan invalido');

  const url = await createCheckoutForPlan(plan, {
    email: data.email,
    businessName: data.businessName,
    siteUrl: data.siteUrl,
    successUrl: `${env.APP_BASE_URL}/gracias`,
    cancelUrl: `${env.APP_BASE_URL}/#precios`,
  });

  res.json({ ok: true, url });
}

/** POST /api/billing/portal  { clientId } o { email } */
export async function createPortal(req: Request, res: Response): Promise<void> {
  const body = z
    .object({ clientId: z.string().optional(), email: z.string().email().optional() })
    .refine((v) => v.clientId || v.email, 'Debes indicar clientId o email')
    .parse(req.body);

  const client = await prisma.client.findFirst({
    where: body.clientId ? { id: body.clientId } : { email: body.email },
  });

  if (!client?.paymentCustomerId) {
    throw new NotFoundError('Cliente sin suscripcion asociada a una pasarela de pago');
  }

  const url = await createPortalForClient(client.paymentCustomerId, `${env.APP_BASE_URL}/cuenta`);
  res.json({ ok: true, url });
}
