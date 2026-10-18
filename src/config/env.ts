/**
 * config/env.ts
 * -----------------------------------------------------------------------------
 * Validacion estricta de variables de entorno con Zod.
 *
 * Filosofia "fail-fast": si falta una variable critica o tiene un formato
 * invalido, el proceso NO arranca. Esto evita errores silenciosos en
 * produccion (por ejemplo, enviar correos con un remitente vacio).
 *
 * El bloque de pagos es condicional: solo se exigen las credenciales del
 * proveedor seleccionado (PAYMENT_PROVIDER).
 */
import 'dotenv/config';
import { z } from 'zod';

/** Convierte "true"/"1"/"false"/"0" en boolean real. */
const booleanish = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1');

const envSchema = z
  .object({
    // --- Aplicacion ---
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    APP_BASE_URL: z.string().url().default('http://localhost:3000'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),

    // --- Base de datos ---
    DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatorio (PostgreSQL/Supabase)'),

    // --- Pagos: proveedor activo ---
    PAYMENT_PROVIDER: z.enum(['stripe', 'paddle']).default('stripe'),

    // --- Stripe (opcional si usas Paddle) ---
    STRIPE_SECRET_KEY: z.string().startsWith('sk_').optional(),
    STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),
    STRIPE_PRICE_ID: z.string().startsWith('price_').optional(),
    STRIPE_PRICE_ID_PRO: z.string().startsWith('price_').optional(),
    STRIPE_PRICE_ID_AGENCY: z.string().startsWith('price_').optional(),

    // --- Paddle (opcional si usas Stripe) ---
    PADDLE_API_KEY: z.string().optional(),
    PADDLE_WEBHOOK_SECRET: z.string().optional(),
    PADDLE_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),
    PADDLE_PRICE_ID: z.string().optional(),
    PADDLE_PRICE_ID_PRO: z.string().optional(),
    PADDLE_PRICE_ID_AGENCY: z.string().optional(),

    // --- Correo ---
    RESEND_API_KEY: z.string().startsWith('re_', 'RESEND_API_KEY debe empezar por re_'),
    EMAIL_FROM: z.string().min(3, 'EMAIL_FROM es obligatorio (ej: "Nombre <a@b.com>")'),
    EMAIL_REPLY_TO: z.string().email().optional(),
    ADMIN_NOTIFICATION_EMAIL: z.string().email().optional(),

    // --- IA ---
    AI_PROVIDER: z.enum(['auto', 'anthropic', 'openai']).default('auto'),
    ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-').optional(),
    OPENAI_API_KEY: z.string().startsWith('sk-').optional(),
    AI_MODEL: z.string().optional(),
    AI_MAX_TOKENS: z.coerce.number().int().positive().default(1500),

    // --- Auditoria ---
    PAGESPEED_API_KEY: z.string().optional(),
    AUDIT_TIMEOUT_MS: z.coerce.number().int().positive().default(20000),
    MAX_AUDIT_CONCURRENCY: z.coerce.number().int().positive().max(20).default(4),

    // --- Cron ---
    CRON_ENABLED: booleanish.default('true'),
    CRON_SCHEDULE: z.string().default('0 8 * * 1'),
    CRON_TIMEZONE: z.string().default('America/Panama'),

    // --- Seguridad ---
    ADMIN_API_TOKEN: z.string().min(16, 'ADMIN_API_TOKEN debe tener al menos 16 caracteres'),
    PORTAL_SIGNING_SECRET: z.string().min(16).optional(),
  })
  .superRefine((value, ctx) => {
    // Validacion condicional: solo exigimos credenciales del proveedor activo.
    if (value.PAYMENT_PROVIDER === 'stripe') {
      if (!value.STRIPE_SECRET_KEY) {
        ctx.addIssue({ code: 'custom', path: ['STRIPE_SECRET_KEY'], message: 'Requerido cuando PAYMENT_PROVIDER=stripe' });
      }
      if (!value.STRIPE_WEBHOOK_SECRET) {
        ctx.addIssue({ code: 'custom', path: ['STRIPE_WEBHOOK_SECRET'], message: 'Requerido cuando PAYMENT_PROVIDER=stripe' });
      }
    }
    if (value.PAYMENT_PROVIDER === 'paddle') {
      if (!value.PADDLE_API_KEY) {
        ctx.addIssue({ code: 'custom', path: ['PADDLE_API_KEY'], message: 'Requerido cuando PAYMENT_PROVIDER=paddle' });
      }
      if (!value.PADDLE_WEBHOOK_SECRET) {
        ctx.addIssue({ code: 'custom', path: ['PADDLE_WEBHOOK_SECRET'], message: 'Requerido cuando PAYMENT_PROVIDER=paddle' });
      }
    }

    // En produccion exigimos una clave dedicada para firmar los magic links.
    // Si no, caeria en ADMIN_API_TOKEN y un unico secreto gobernaria tanto el
    // portal de clientes como la API administrativa.
    if (value.NODE_ENV === 'production' && !value.PORTAL_SIGNING_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['PORTAL_SIGNING_SECRET'],
        message: 'Requerido en produccion; no reutilices ADMIN_API_TOKEN',
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const detalle = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(raiz)'}: ${issue.message}`)
    .join('\n');

  // Usamos console porque el logger aun no esta disponible.
  // eslint-disable-next-line no-console
  console.error(`\n❌ Configuracion de entorno invalida:\n${detalle}\n`);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;

/** Indica si la app corre en produccion. */
export const isProduction = env.NODE_ENV === 'production';

/**
 * Resuelve que proveedor de IA usar segun la configuracion.
 * Devuelve `null` si no hay credenciales -> se usara el generador local.
 */
export type AiProvider = 'anthropic' | 'openai';

export function resolveAiProvider(): AiProvider | null {
  if (env.AI_PROVIDER === 'anthropic') return env.ANTHROPIC_API_KEY ? 'anthropic' : null;
  if (env.AI_PROVIDER === 'openai') return env.OPENAI_API_KEY ? 'openai' : null;

  // auto: prefiere Anthropic, luego OpenAI.
  if (env.ANTHROPIC_API_KEY) return 'anthropic';
  if (env.OPENAI_API_KEY) return 'openai';
  return null;
}

/** Secreto usado para firmar los enlaces del portal y de baja. */
export function portalSigningSecret(): string {
  return env.PORTAL_SIGNING_SECRET ?? env.ADMIN_API_TOKEN;
}
