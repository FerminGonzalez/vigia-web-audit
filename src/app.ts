/**
 * app.ts
 * -----------------------------------------------------------------------------
 * Construccion de la aplicacion Express (sin arrancar el servidor).
 * Separar `app` de `index` facilita los tests de integracion con Supertest.
 */
import express, { type Express } from 'express';
import { apiRouter, pagesRouter, webhookRouter } from './routes';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { logger } from './config/logger';

export function createApp(): Express {
  const app = express();

  // Confiamos en el proxy (nginx, Railway, Render...) para IPs reales.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // --- Webhook de Stripe PRIMERO, con cuerpo crudo ---
  // Debe registrarse antes de express.json() para preservar el Buffer.
  app.use('/api/webhooks', express.raw({ type: 'application/json', limit: '1mb' }), webhookRouter);

  // --- Parsers para el resto (JSON API + formularios HTML) ---
  app.use(express.json({ limit: '256kb' }));
  app.use(express.urlencoded({ extended: false, limit: '256kb' }));

  // Trazabilidad basica de peticiones.
  app.use((req, _res, next) => {
    logger.debug({ method: req.method, url: req.originalUrl }, 'Peticion HTTP');
    next();
  });

  // --- API JSON ---
  app.use('/api', apiRouter);

  // --- Paginas HTML (landing, portal, checkout) ---
  app.use('/', pagesRouter);

  // 404 y manejo de errores (siempre al final).
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
