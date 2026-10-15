/**
 * routes/webhook.routes.ts
 * -----------------------------------------------------------------------------
 * Router aislado para los webhooks de pago.
 * Se monta con `express.raw()` porque la verificacion de firma requiere el
 * cuerpo SIN parsear (Buffer).
 *
 *   POST /api/webhooks/stripe
 *   POST /api/webhooks/paddle
 */
import { Router } from 'express';
import { paymentWebhook } from '../controllers/payment.controller';
import { asyncHandler } from '../utils/async-handler';

export const webhookRouter = Router();

webhookRouter.post('/:provider', asyncHandler(paymentWebhook));
