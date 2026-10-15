/**
 * vitest.config.ts
 * -----------------------------------------------------------------------------
 * Configuracion de las pruebas unitarias.
 * Inyecta variables de entorno de prueba para que `config/env.ts` valide sin
 * depender de un .env real.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      PAYMENT_PROVIDER: 'stripe',
      STRIPE_SECRET_KEY: 'sk_test_dummy',
      STRIPE_WEBHOOK_SECRET: 'whsec_dummy',
      STRIPE_PRICE_ID: 'price_test_basico',
      PADDLE_API_KEY: 'pdl_test_dummy',
      PADDLE_WEBHOOK_SECRET: 'paddle_test_secret',
      RESEND_API_KEY: 're_test_dummy',
      EMAIL_FROM: 'Test <test@example.com>',
      ADMIN_API_TOKEN: 'token-de-prueba-1234567890',
      PORTAL_SIGNING_SECRET: 'firma-de-prueba-1234567890',
      CRON_ENABLED: 'false',
    },
  },
});
