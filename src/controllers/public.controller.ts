/**
 * controllers/public.controller.ts
 * -----------------------------------------------------------------------------
 * Endpoint publico del motor de captacion: auditoria gratis por formulario.
 * Responde HTML (funciona sin JavaScript) y redirige a una pagina de aviso.
 */
import type { Request, Response } from 'express';
import { z } from 'zod';
import { captureLead } from '../services/lead.service';
import { getReportStandard } from '../config/report-standards';
import { renderMessage } from '../views/pages';
import { logger } from '../config/logger';

const leadSchema = z.object({
  email: z.string().email(),
  url: z.string().min(3),
  businessName: z.string().max(120).optional(),
  // Norma elegida por el cliente (Grupo 1..5). Si falta o es invalida se usa la
  // de por defecto (getReportStandard).
  standard: z.string().optional(),
});

/** POST /auditoria-gratis - Audita el sitio y envia el informe de muestra. */
export async function requestFreeAudit(req: Request, res: Response): Promise<void> {
  const data = leadSchema.parse(req.body);

  try {
    const resultado = await captureLead(data);
    const standard = getReportStandard(resultado.standardId);
    res.type('html').send(
      renderMessage(
        '¡Tu informe va en camino!',
        `Analizamos tu sitio (puntuacion ${resultado.overallScore}/100) y te enviamos el informe a ${data.email}, estructurado segun Grupo ${standard.group} - ${standard.code}. Revisa tu correo en un momento.`,
        true,
      ),
    );
  } catch (error) {
    logger.error({ err: (error as Error).message }, 'Fallo la auditoria gratuita');
    res
      .status(200)
      .type('html')
      .send(
        renderMessage(
          'No pudimos analizar tu sitio',
          'Verifica que la direccion sea correcta e intentalo de nuevo en unos minutos.',
          false,
        ),
      );
  }
}
