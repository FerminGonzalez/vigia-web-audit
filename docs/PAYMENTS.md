# Pagos — Guía de decisión para Panamá

El sistema soporta **dos pasarelas** mediante un adaptador intercambiable
(`src/services/payment/`). El proveedor se elige con `PAYMENT_PROVIDER`.

---

## El problema real

**Stripe no permite cuentas comerciales radicadas en Panamá.** Puedes integrar
el código, pero no podrás activar cobros sin una estructura en un país soportado.
Por eso el producto incluye **Paddle** como vía recomendada.

---

## Opciones comparadas

| Opción | Cómo funciona | Pros | Contras | Cuándo elegirla |
|---|---|---|---|---|
| **Paddle** (`PAYMENT_PROVIDER=paddle`) | Merchant of Record: Paddle vende en su nombre y liquida contigo | Acepta empresa panameña con banco local; gestiona impuestos globales (IVA/VAT); sin LLC | Comisión ~5% + fija | ✅ **Empezar a facturar ya desde Panamá** |
| **Lemon Squeezy** | Similar a Paddle (MoR) | Muy simple, popular en micro-SaaS | Menos flexible | Alternativa a Paddle |
| **Stripe Atlas** (`PAYMENT_PROVIDER=stripe`) | Constituyes una LLC en EE.UU. y usas Stripe nativo | Stripe nativo, control total, ecosistema | Coste de constitución + cumplimiento fiscal en EE.UU. | Cuando planeas escalar y formalizar |
| **PayPal Business Panamá** | Cobros puntuales | Conocido por clientes | Mala gestión de suscripciones recurrentes | Solo como apoyo |
| **Yappy (Banco General)** | Cobro en balboa | Dominante localmente | No maneja recurrencia | Complemento para el upsell "done-for-you" |

---

## Cómo cambiar de proveedor

Todo está aislado. Para pasar a Paddle solo:

1. Crea cuenta en [paddle.com](https://www.paddle.com) y es aprobado.
2. En **Catalog → Products**, crea 3 precios recurrentes (Básico/Pro/Agencia) y copia sus `priceId` (`pri_...`).
3. Define en el entorno:
   ```
   PAYMENT_PROVIDER=paddle
   PADDLE_ENVIRONMENT=production
   PADDLE_API_KEY=...
   PADDLE_WEBHOOK_SECRET=...
   PADDLE_PRICE_ID=pri_...
   PADDLE_PRICE_ID_PRO=pri_...
   PADDLE_PRICE_ID_AGENCY=pri_...
   ```
4. En **Developer Tools → Notifications**, crea un webhook a:
   ```
   https://TU_DOMINIO/api/webhooks/paddle
   ```
   Suscríbete a: `transaction.completed`, `subscription.created`,
   `subscription.updated`, `subscription.canceled`, `subscription.past_due`.

No hay que tocar la lógica de negocio: `subscription.service.ts` aplica eventos
normalizados igual para cualquier proveedor.

---

## Idempotencia y seguridad (ya implementadas)

- **Verificación de firma:** Stripe (`stripe-signature`) y Paddle
  (`paddle-signature`, HMAC sobre `ts:body`, con tolerancia anti-replay de 5 min).
- **Idempotencia:** cada evento se registra en `ProcessedWebhook`; los duplicados se ignoran.
- **Aislamiento:** ningún secreto de pago se registra en logs.

---

## Flujo de alta (end-to-end)

```
Cliente elige plan en /#precios
   → POST /empezar  (o /api/billing/checkout)
   → payment.createCheckoutForPlan(plan)  → URL del proveedor
   → Cliente paga
   → Webhook checkout/transaction.completed
   → subscription.service: crea Client + Site + correo de bienvenida
   → Webhook subscription.*  → sincroniza Subscription (estado, periodo)
   → Cron semanal empieza a auditar y enviar informes
```

Canciones y pagos fallidos actualizan el estado (`CANCELED`, `PAST_DUE`) y
**desactivan/reactivan** los sitios automáticamente.

---

## Nota fiscal

Con un Merchant of Record (Paddle/Lemon Squeezy), **ellos** son el vendedor
legal ante el cliente final y gestionan el IVA/impuesto sobre ventas global.
Consulta a un contador local para tu situación particular en Panamá (DGI).
