/**
 * routes/api.routes.ts
 * -----------------------------------------------------------------------------
 * Router principal de la API (JSON).
 */
import { Router } from 'express';
import { liveness, readiness } from '../controllers/health.controller';
import { createCheckout, createPortal } from '../controllers/payment.controller';
import {
  listClients,
  previewAudit,
  siteHistory,
  triggerAudit,
} from '../controllers/audit.controller';
import { requireAdminToken } from '../middlewares/auth.middleware';
import { rateLimit } from '../middlewares/rate-limit.middleware';
import { asyncHandler } from '../utils/async-handler';

export const apiRouter = Router();

// --- Salud ---
apiRouter.get('/health', liveness);
apiRouter.get('/health/ready', asyncHandler(readiness));

// --- Facturacion (publico, con limite de tasa por IP) ---
apiRouter.post('/billing/checkout', rateLimit({ max: 20, windowMs: 60 * 60 * 1000 }), asyncHandler(createCheckout));
apiRouter.post('/billing/portal', rateLimit({ max: 30, windowMs: 60 * 60 * 1000 }), asyncHandler(createPortal));

// --- Administracion (protegido por token) ---
const admin = Router();
admin.use(requireAdminToken);
admin.post('/audits/run', asyncHandler(triggerAudit));
admin.post('/audits/preview', asyncHandler(previewAudit));
admin.get('/clients', asyncHandler(listClients));
admin.get('/sites/:id/history', asyncHandler(siteHistory));
apiRouter.use('/admin', admin);
