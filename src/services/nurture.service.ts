/**
 * services/nurture.service.ts
 * -----------------------------------------------------------------------------
 * Procesa la cola de nutricion de leads: envia el siguiente correo de la
 * secuencia a quienes les corresponde y reprograma el siguiente.
 *
 * Se ejecuta a diario desde `nurture.cron`.
 */
import { prisma } from '../lib/prisma';
import { logger } from '../config/logger';
import { env } from '../config/env';
import { sendNurtureEmail } from './email.service';
import { signClientToken } from './auth-token.service';
import { NURTURE_STEPS, getNurtureStep } from '../templates/nurture-emails';

export interface NurtureSummary {
  procesados: number;
  enviados: number;
  fallidos: number;
}

const MAX_STEP = NURTURE_STEPS.length + 1; // el paso 1 es la captacion

export async function processNurtureQueue(limit = 100): Promise<NurtureSummary> {
  const resumen: NurtureSummary = { procesados: 0, enviados: 0, fallidos: 0 };

  const leads = await prisma.lead.findMany({
    where: {
      status: 'NURTURING',
      sequenceStep: { lt: MAX_STEP },
      nextEmailAt: { lte: new Date() },
    },
    orderBy: { nextEmailAt: 'asc' },
    take: limit,
  });

  for (const lead of leads) {
    resumen.procesados += 1;
    const siguiente = lead.sequenceStep + 1;
    const step = getNurtureStep(siguiente);

    if (!step) {
      // No hay mas pasos: cerramos la secuencia.
      await prisma.lead.update({ where: { id: lead.id }, data: { nextEmailAt: null } });
      continue;
    }

    const token = signClientToken(lead.id, 365);
    const ctx = {
      businessName: lead.businessName ?? 'tu negocio',
      score: lead.overallScore,
      unsubscribeUrl: `${env.APP_BASE_URL}/baja?token=${encodeURIComponent(token)}`,
      pricingUrl: `${env.APP_BASE_URL}/empezar?plan=pro`,
    };

    try {
      await sendNurtureEmail({ to: lead.email, subject: step.subject(ctx), html: step.html(ctx) });

      // Programamos el siguiente paso (o cerramos si era el ultimo).
      const siguientePaso = getNurtureStep(siguiente + 1);
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          sequenceStep: siguiente,
          nextEmailAt: siguientePaso
            ? new Date(Date.now() + siguientePaso.delayDays * 86_400_000)
            : null,
        },
      });
      resumen.enviados += 1;
    } catch (error) {
      resumen.fallidos += 1;
      logger.error({ leadId: lead.id, err: (error as Error).message }, 'Fallo el correo de nutricion');
    }
  }

  if (resumen.procesados > 0) {
    logger.info({ ...resumen }, 'Cola de nutricion procesada');
  }
  return resumen;
}

/** Da de baja a un lead (enlace del correo). */
export async function unsubscribeLead(leadId: string): Promise<void> {
  await prisma.lead.update({
    where: { id: leadId },
    data: { status: 'UNSUBSCRIBED', unsubscribedAt: new Date(), nextEmailAt: null },
  });
}
