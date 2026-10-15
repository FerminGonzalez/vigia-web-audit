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
import { asyncHandler } from '../utils/async-handler';

export const apiRouter = Router();

// --- Salud ---
apiRouter.get('/health', liveness);
apiRouter.get('/health/ready', asyncHandler(readiness));

// --- Facturacion (publico) ---
apiRouter.post('/billing/checkout', asyncHandler(createCheckout));
apiRouter.post('/billing/portal', asyncHandler(createPortal));

// --- Administracion (protegido por token) ---
const admin = Router();
admin.use(requireAdminToken);
admin.post('/audits/run', asyncHandler(triggerAudit));
admin.post('/audits/preview', asyncHandler(previewAudit));
admin.get('/clients', asyncHandler(listClients));
admin.get('/sites/:id/history', asyncHandler(siteHistory));
apiRouter.use('/admin', admin);
