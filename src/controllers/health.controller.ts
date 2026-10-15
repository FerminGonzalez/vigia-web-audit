/**
 * controllers/health.controller.ts
 * -----------------------------------------------------------------------------
 * Endpoints de salud para balanceadores, Kubernetes o uptime monitors.
 */
import type { Request, Response } from 'express';
import { pingDatabase } from '../lib/prisma';
import { env, resolveAiProvider } from '../config/env';
import { PLANS, planPriceId } from '../config/pricing';

/** GET /health - liveness: responde si el proceso esta vivo. */
export function liveness(_req: Request, res: Response): void {
  res.json({ ok: true, servicio: 'vigia-web-audit', uptime: process.uptime() });
}

/** GET /health/ready - readiness: comprueba dependencias y configuracion. */
export async function readiness(_req: Request, res: Response): Promise<void> {
  const db = await pingDatabase();
  const ai = resolveAiProvider();
  const plansConfigurados = PLANS.filter((p) => planPriceId(p, env.PAYMENT_PROVIDER)).length;
  const estado = db ? 200 : 503;

  res.status(estado).json({
    ok: db,
    checks: {
      database: db ? 'ok' : 'error',
      aiProvider: ai ?? 'fallback-local',
      paymentProvider: env.PAYMENT_PROVIDER,
      planesConfigurados: `${plansConfigurados}/${PLANS.length}`,
      cronEnabled: env.CRON_ENABLED,
    },
  });
}
