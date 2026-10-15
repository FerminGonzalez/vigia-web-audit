/**
 * routes/pages.routes.ts
 * -----------------------------------------------------------------------------
 * Rutas HTML (sin prefijo /api). Renderizado en servidor.
 * El endpoint de captacion esta limitado por tasa para evitar abuso.
 */
import { Router } from 'express';
import {
  cancelPage,
  checkoutFormPage,
  checkoutFormSubmit,
  landingPage,
  portalPage,
  thanksPage,
  unsubscribePage,
} from '../controllers/page.controller';
import { requestFreeAudit } from '../controllers/public.controller';
import { rateLimit } from '../middlewares/rate-limit.middleware';
import { asyncHandler } from '../utils/async-handler';

export const pagesRouter = Router();

// --- Paginas publicas ---
pagesRouter.get('/', landingPage);
pagesRouter.get('/gracias', thanksPage);
pagesRouter.get('/empezar', checkoutFormPage);
pagesRouter.post('/empezar', asyncHandler(checkoutFormSubmit));

// --- Motor de captacion (auditoria gratis): 5 por hora por IP ---
pagesRouter.post(
  '/auditoria-gratis',
  rateLimit({ max: 5, windowMs: 60 * 60 * 1000 }),
  asyncHandler(requestFreeAudit),
);

// --- Portal del cliente (magic link firmado) ---
pagesRouter.get('/cuenta', asyncHandler(portalPage));
pagesRouter.get('/cancelar', asyncHandler(cancelPage));
pagesRouter.get('/baja', asyncHandler(unsubscribePage));
