/**
 * scripts/check-config.ts
 * -----------------------------------------------------------------------------
 * Verifica la configuracion de produccion ANTES de desplegar:
 *   - Variables de entorno validas (las exige config/env.ts).
 *   - Precios de cada plan existen en el proveedor de pago y coinciden en importe.
 *   - Servicios clave presentes (correo, IA).
 *
 * Uso:  npm run check:config
 * Devuelve codigo de salida 1 si algo critico falla.
 */
import { env, resolveAiProvider } from '../config/env';
import { PLANS, planPriceId } from '../config/pricing';

let fallos = 0;

function ok(msg: string): void {
  console.log(`  ✅ ${msg}`);
}
function warn(msg: string): void {
  console.log(`  ⚠️  ${msg}`);
}
function fail(msg: string): void {
  console.log(`  ❌ ${msg}`);
  fallos += 1;
}

async function verificarPrecioPaddle(priceId: string, esperadoUsd: number): Promise<boolean> {
  const base =
    env.PADDLE_ENVIRONMENT === 'production'
      ? 'https://api.paddle.com'
      : 'https://sandbox-api.paddle.com';

  const res = await fetch(`${base}/prices/${priceId}`, {
    headers: { authorization: `Bearer ${env.PADDLE_API_KEY}` },
  });
  if (!res.ok) return false;

  const json = (await res.json()) as {
    data?: { unit_price?: { amount?: string }; billing_cycle?: { interval?: string }; status?: string };
  };
  const amount = Number(json.data?.unit_price?.amount ?? 0) / 100;
  const intervalo = json.data?.billing_cycle?.interval;
  const activo = json.data?.status === 'active';

  if (amount !== esperadoUsd) {
    fail(`Precio ${priceId}: importe ${amount} USD, se esperaba ${esperadoUsd} USD`);
    return false;
  }
  if (intervalo && intervalo !== 'month') {
    warn(`Precio ${priceId}: intervalo "${intervalo}" (se esperaba mensual)`);
  }
  if (!activo) warn(`Precio ${priceId}: no esta activo en Paddle`);
  return true;
}

async function verificarPrecioStripe(priceId: string, esperadoUsd: number): Promise<boolean> {
  const { getStripe } = await import('../lib/stripe');
  try {
    const price = await getStripe().prices.retrieve(priceId);
    const amount = (price.unit_amount ?? 0) / 100;
    if (amount !== esperadoUsd) {
      fail(`Precio ${priceId}: importe ${amount} USD, se esperaba ${esperadoUsd} USD`);
      return false;
    }
    if (!price.active) warn(`Precio ${priceId}: no esta activo en Stripe`);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  console.log('\n🔎 Verificacion de configuracion de Vigia Web Audit\n');

  console.log('Aplicacion');
  ok(`Entorno: ${env.NODE_ENV}`);
  ok(`URL base: ${env.APP_BASE_URL}`);
  ok(
    `Opciones de pago: ${
      env.PAID_OPTIONS_ENABLED ? 'habilitadas' : 'modo informativo (alta deshabilitada)'
    }`,
  );

  console.log('\nProveedor de pago');
  ok(`Proveedor activo: ${env.PAYMENT_PROVIDER}`);
  if (env.PAYMENT_PROVIDER === 'paddle') {
    ok(`Entorno Paddle: ${env.PADDLE_ENVIRONMENT}`);
    ok(`API key: ${env.PADDLE_API_KEY ? 'presente' : 'FALTA'}`);
    ok(`Webhook secret: ${env.PADDLE_WEBHOOK_SECRET ? 'presente' : 'FALTA'}`);
  }

  console.log('\nPrecios por plan');
  const provider = env.PAYMENT_PROVIDER;
  for (const plan of PLANS) {
    const priceId = planPriceId(plan, provider);
    if (!priceId) {
      fail(`Plan ${plan.name}: falta configurar el priceId`);
      continue;
    }
    let valido = false;
    try {
      valido =
        provider === 'paddle'
          ? await verificarPrecioPaddle(priceId, plan.priceUsd)
          : await verificarPrecioStripe(priceId, plan.priceUsd);
    } catch (error) {
      fail(`Plan ${plan.name}: error consultando el precio (${(error as Error).message})`);
      continue;
    }
    if (valido) ok(`Plan ${plan.name}: ${priceId} → ${plan.priceUsd} USD/mes`);
    else fail(`Plan ${plan.name}: el precio ${priceId} no existe o no es accesible`);
  }

  console.log('\nCorreo e IA');
  ok(`Remitente: ${env.EMAIL_FROM}`);
  const ai = resolveAiProvider();
  ai ? ok(`IA: ${ai}`) : warn('IA: sin credenciales → se usara el generador local (gratis)');

  console.log('\nSeguridad');
  ok(`ADMIN_API_TOKEN: ${env.ADMIN_API_TOKEN.length} caracteres`);
  ok(`PORTAL_SIGNING_SECRET: ${env.PORTAL_SIGNING_SECRET ? 'configurado' : 'usa ADMIN_API_TOKEN'}`);

  console.log('');
  if (fallos > 0) {
    console.log(`❌ ${fallos} problema(s) critico(s). Corrige antes de desplegar.\n`);
    process.exit(1);
  }
  console.log('✅ Configuracion lista para desplegar.\n');
}

main().catch((error) => {
  console.error('Error inesperado en la verificacion:', error);
  process.exit(1);
});
