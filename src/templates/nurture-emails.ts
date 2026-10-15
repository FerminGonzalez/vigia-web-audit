/**
 * templates/nurture-emails.ts
 * -----------------------------------------------------------------------------
 * Secuencia de nutricion (drip) que se envia a los leads captados por la
 * auditoria gratis. Cada paso esta disenado para mover al prospecto hacia el
 * plan de pago.
 *
 * El paso 1 (informe de muestra) se envia en la captacion (lead.service).
 * Aqui se definen los pasos 2 a 5.
 */
import { escapeHtml } from './report-email';

export interface NurtureContext {
  businessName: string;
  score: number | null;
  unsubscribeUrl: string;
  pricingUrl: string;
}

export interface NurtureStep {
  /** Numero de paso (2..5). */
  step: number;
  /** Dias de espera desde el paso anterior. */
  delayDays: number;
  subject: (ctx: NurtureContext) => string;
  html: (ctx: NurtureContext) => string;
}

function wrap(contenido: string, ctx: NurtureContext, ctaTexto: string, ctaUrl: string): string {
  return `<!DOCTYPE html><html lang="es"><body style="font-family:Arial,Helvetica,sans-serif;background:#f4f6fb;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:28px;border:1px solid #e5e7eb;">
    ${contenido}
    <p style="margin:26px 0;">
      <a href="${ctaUrl}" style="background:#2563eb;color:#fff;padding:13px 24px;border-radius:10px;text-decoration:none;font-weight:600;">${escapeHtml(ctaTexto)}</a>
    </p>
    <p style="color:#9ca3af;font-size:12px;border-top:1px solid #e5e7eb;padding-top:16px;margin-top:24px;">
      Recibes esto porque solicitaste una auditoria de tu web. 
      <a href="${ctx.unsubscribeUrl}" style="color:#9ca3af;">Cancelar suscripcion</a>.
    </p>
  </div>
</body></html>`;
}

export const NURTURE_STEPS: NurtureStep[] = [
  {
    step: 2,
    delayDays: 2,
    subject: (ctx) => `El costo oculto de una web lenta, ${ctx.businessName}`,
    html: (ctx) =>
      wrap(
        `<h2 style="color:#1f2937;">Una web lenta te cuesta clientes cada día</h2>
         <p style="color:#374151;line-height:1.6;">Hola ${escapeHtml(ctx.businessName)},</p>
         <p style="color:#374151;line-height:1.6;">
           En tu informe vimos que tu sitio tiene margen de mejora. Imagina esto: si <strong>1 de cada 10 visitantes</strong>
           se va porque la página tarda, y recibes 100 visitas al día, estás perdiendo clientes todos los días.
         </p>
         <p style="color:#374151;line-height:1.6;">
           La buena noticia: la mayoría de esos problemas se corrigen en horas, no semanas.
         </p>`,
        ctx,
        'Ver planes',
        ctx.pricingUrl,
      ),
  },
  {
    step: 3,
    delayDays: 2,
    subject: () => `Así mejoró una ferretería su visibilidad en Google`,
    html: (ctx) =>
      wrap(
        `<h2 style="color:#1f2937;">Caso real: de la página 5 a la 1</h2>
         <p style="color:#374151;line-height:1.6;">Hola ${escapeHtml(ctx.businessName)},</p>
         <p style="color:#374151;line-height:1.6;">
           Un negocio parecido al tuyo tenía su página invisible en Google. Corrigió el título, las descripciones
           y la velocidad. En tres semanas empezó a recibir consultas por su web.
         </p>
         <p style="color:#374151;line-height:1.6;">
           Nosotros te avisamos cada semana de exactamente qué revisar, sin que tengas que estudiar tecnología.
         </p>`,
        ctx,
        'Quiero que me avisen',
        ctx.pricingUrl,
      ),
  },
  {
    step: 4,
    delayDays: 3,
    subject: (ctx) => `Tu oferta de bienvenida, ${ctx.businessName}`,
    html: (ctx) =>
      wrap(
        `<h2 style="color:#1f2937;">Empieza vigilando tu web sin riesgos</h2>
         <p style="color:#374151;line-height:1.6;">Hola ${escapeHtml(ctx.businessName)},</p>
         <p style="color:#374151;line-height:1.6;">
           Queremos que lo pruebes sin compromiso: tu primer mes con descuento y cancelación en un clic.
         </p>
         <p style="color:#374151;line-height:1.6;">
           Cada semana recibirás un informe claro: qué va bien, qué mejorar y qué hacer primero.
         </p>`,
        ctx,
        'Aprovechar la oferta',
        ctx.pricingUrl,
      ),
  },
  {
    step: 5,
    delayDays: 5,
    subject: () => `Última llamada: ¿dejamos de avisarte?`,
    html: (ctx) =>
      wrap(
        `<h2 style="color:#1f2937;">¿Seguimos pendientes de tu web?</h2>
         <p style="color:#374151;line-height:1.6;">Hola ${escapeHtml(ctx.businessName)},</p>
         <p style="color:#374151;line-height:1.6;">
           Este es nuestro último correo sobre esto. Si no quieres recibir el informe semanal, no pasa nada.
         </p>
         <p style="color:#374151;line-height:1.6;">
           Pero si te interesa que alguien revise tu web cada semana y te lo explique en simple, todavía estás a tiempo.
         </p>`,
        ctx,
        'Ver planes',
        ctx.pricingUrl,
      ),
  },
];

/** Devuelve el paso con ese numero (o undefined). */
export function getNurtureStep(step: number): NurtureStep | undefined {
  return NURTURE_STEPS.find((s) => s.step === step);
}
