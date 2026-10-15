/**
 * controllers/page.controller.ts
 * -----------------------------------------------------------------------------
 * Controladores de las paginas HTML publicas y del portal del cliente.
 * Renderizado en servidor (sin framework): rapido, indexable y sin JS.
 */
import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import { createCheckoutForPlan, createPortalForClient } from '../services/payment';
import { getPlan, PLANS } from '../config/pricing';
import { verifyClientToken } from '../services/auth-token.service';
import { renderLanding } from '../views/landing';
import { renderMessage, renderPortal, renderThanks } from '../views/pages';
import { layout, BRAND } from '../views/layout';
import { unsubscribeLead } from '../services/nurture.service';
import { NotFoundError, ValidationError } from '../utils/errors';
import { escapeHtml } from '../templates/report-email';

/** GET / - Landing publica. */
export function landingPage(_req: Request, res: Response): void {
  res.type('html').send(renderLanding());
}

/** GET /gracias - Confirmacion tras el pago. */
export function thanksPage(_req: Request, res: Response): void {
  res.type('html').send(renderThanks());
}

/** GET /empezar?plan=pro - Formulario de alta (previo a Stripe). */
export function checkoutFormPage(req: Request, res: Response): void {
  const planId = typeof req.query.plan === 'string' ? req.query.plan : 'basico';
  const plan = getPlan(planId) ?? getPlan('basico');
  if (!plan) throw new NotFoundError('Plan no encontrado');

  const body = `<section><div class="container" style="max-width:560px;">
    <h1 style="font-size:26px;">Empezar con el plan ${escapeHtml(plan.name)}</h1>
    <p class="muted">${escapeHtml(plan.tagline)} · ${"$" + plan.priceUsd}/mes</p>
    <form class="grid" method="POST" action="/empezar" style="gap:14px;margin-top:20px;">
      <input type="hidden" name="plan" value="${escapeHtml(plan.id)}" />
      <input type="text" name="businessName" placeholder="Nombre de tu negocio" required />
      <input type="email" name="email" placeholder="Correo electrónico" required />
      <input type="url" name="siteUrl" placeholder="https://tu-negocio.com" required />
      <button class="btn btn-primary" type="submit">Continuar al pago seguro</button>
    </form>
    <p class="muted" style="font-size:13px;margin-top:14px;">
      Pago procesado por Stripe. No almacenamos datos de tu tarjeta.
    </p>
  </div></section>`;
  res.type('html').send(layout({ title: `Suscribirme - ${plan.name}`, body }));
}

const checkoutFormSchema = z.object({
  plan: z.string().default('basico'),
  businessName: z.string().min(2).max(120),
  email: z.string().email(),
  siteUrl: z.string().url(),
});

/** POST /empezar - Crea la sesion de Stripe y redirige. */
export async function checkoutFormSubmit(req: Request, res: Response): Promise<void> {
  const data = checkoutFormSchema.parse(req.body);
  const plan = getPlan(data.plan) ?? PLANS[0];
  if (!plan) throw new ValidationError('Plan invalido');

  const url = await createCheckoutForPlan(plan, {
    email: data.email,
    businessName: data.businessName,
    siteUrl: data.siteUrl,
    successUrl: `${env.APP_BASE_URL}/gracias`,
    cancelUrl: `${env.APP_BASE_URL}/#precios`,
  });

  res.redirect(303, url);
}

/** GET /cuenta?token=... - Portal del cliente (magic link). */
export async function portalPage(req: Request, res: Response): Promise<void> {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  const clientId = verifyClientToken(token);

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      sites: { orderBy: { createdAt: 'asc' } },
      subscription: true,
    },
  });
  if (!client) throw new NotFoundError('Cliente no encontrado');

  // Historico unificado de sus sitios.
  const audits = await prisma.audit.findMany({
    where: { site: { clientId: client.id } },
    orderBy: { createdAt: 'desc' },
    take: 12,
    select: { createdAt: true, overallScore: true, performanceScore: true, seoScore: true },
  });

  let portalUrl: string | null = null;
  if (client.paymentCustomerId) {
    try {
      portalUrl = await createPortalForClient(
        client.paymentCustomerId,
        `${env.APP_BASE_URL}/cuenta?token=${encodeURIComponent(token)}`,
      );
    } catch {
      portalUrl = null;
    }
  }

  res.type('html').send(
    renderPortal({
      businessName: client.businessName,
      email: client.email,
      subscriptionStatus: client.subscription?.status ?? 'SIN_SUSCRIPCION',
      sites: client.sites.map((s) => ({ id: s.id, url: s.url, isActive: s.isActive })),
      audits,
      portalUrl,
    }),
  );
}

/** GET /cancelar?token=... - Redirige al portal de facturacion para cancelar. */
export async function cancelPage(req: Request, res: Response): Promise<void> {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  const clientId = verifyClientToken(token);

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client?.paymentCustomerId) {
    res
      .type('html')
      .send(renderMessage('Gestiona tu suscripcion', `Escribenos a ${BRAND.email} para cancelar.`, false));
    return;
  }

  const url = await createPortalForClient(client.paymentCustomerId, `${env.APP_BASE_URL}/`);
  res.redirect(303, url);
}

/** GET /baja?token=... - Baja de la secuencia de correos (leads). */
export async function unsubscribePage(req: Request, res: Response): Promise<void> {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  const leadId = verifyClientToken(token);
  await unsubscribeLead(leadId);
  res
    .type('html')
    .send(renderMessage('Listo', 'Te dimos de baja de la secuencia de correos. No volveras a recibir mensajes.', true));
}
