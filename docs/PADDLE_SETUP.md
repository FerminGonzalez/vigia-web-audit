# Configuración de Paddle — Paso a paso

Todo el código ya está preparado para Paddle. Este documento cubre **solo lo que
tú tienes que hacer en el panel de Paddle**. Cuando termines, pegas los valores
en las variables de entorno y ejecutas `npm run check:config`.

> Entra en [paddle.com](https://www.paddle.com) y crea una cuenta **Paddle Billing**.
> Cada entorno (Sandbox y Production) tiene **sus propias** claves, precios y
> secretos de webhook. No los mezcles.

---

## 0. Decide el entorno

| Entorno | Cuándo | Aprobación |
|---|---|---|
| **Sandbox** | Para probar todo el flujo ya mismo | Inmediata, sin verificación |
| **Production** | Para cobrar de verdad | Requiere verificación de negocio (1–3 días) |

Recomendación: prueba primero en **Sandbox** y luego repite en **Production**.

---

## 1. Crear los 3 productos y precios recurrentes

`Catalog → Products → Create product`. Crea uno por plan:

| Producto | Precio | Periodicidad | Moneda |
|---|---|---|---|
| Básico | 29 | Monthly (recurring) | USD |
| Pro | 59 | Monthly (recurring) | USD |
| Agencia | 149 | Monthly (recurring) | USD |

Para cada producto, añade un **Price** *Recurring / Monthly* y **copia su Price ID**
(empieza por `pri_...`).

➡️ Estos 3 IDs van a:
```
PADDLE_PRICE_ID=pri_...        (Básico)
PADDLE_PRICE_ID_PRO=pri_...    (Pro)
PADDLE_PRICE_ID_AGENCY=pri_... (Agencia)
```

> La categoría de impuesto recomendada para SaaS: *Standard digital service* o
> *Software as a service*. Paddle calcula los impuestos por ti.

---

## 2. Crear la API key

`Developer Tools → Authentication → Create API key`.

- Permisos mínimos necesarios:
  - `price:read`, `customer:read` (para el verificador de configuración)
  - `transaction:write` (para crear los checkouts)
- Copia la clave (empieza por `pdl_live_...` en producción o `pdl_sdbx_...` en sandbox).

➡️ Va a:
```
PADDLE_API_KEY=pdl_...
```

---

## 3. Crear el webhook (notificaciones)

`Developer Tools → Notifications → New destination`.

- **URL:** `https://TU_DOMINIO/api/webhooks/paddle`
- **Suscríbete a estos eventos:**
  - `transaction.completed`
  - `subscription.created`
  - `subscription.activated`
  - `subscription.trialing`
  - `subscription.updated`
  - `subscription.canceled`
  - `subscription.past_due`
  - `subscription.paused`
  - `subscription.resumed`
- Copia el **Secret key** que Paddle muestra al crear el destino (empieza por `pdl_ntfset_...`).

➡️ Va a:
```
PADDLE_WEBHOOK_SECRET=pdl_ntfset_...
```

> **Importante:** el webhook necesita una URL pública. Si aún no despliegas,
> usa un túnel (p. ej. `ngrok http 3000`) y pon esa URL en Paddle para probar.

---

## 4. Ajustes de checkout (recomendado)

`Checkout → Checkout settings`:

- **Dominio / allowed domains:** añade tu dominio si vas a embeber el checkout.
  Para el flujo por redirección (el que usa esta app) basta con el dominio del
  webhook.
- **Moneda por defecto:** USD.
- **Métodos de pago:** activa tarjeta y los que quieras ofrecer.

---

## 5. (Producción) Verificación de negocio

`Settings → Business` (o el asistente de activación):

- Datos legales, dirección en Panamá, RUC/identificación fiscal.
- Cuenta bancaria donde Paddle te pagará (banco panameño válido).
- Paddle revisa y aprueba. Mientras tanto, usa Sandbox.

---

## 6. Pega los valores y verifica

En tu `.env` (o en el panel de la nube):

```
PAYMENT_PROVIDER=paddle
PADDLE_ENVIRONMENT=production        # o sandbox
PADDLE_API_KEY=pdl_...
PADDLE_WEBHOOK_SECRET=pdl_ntfset_...
PADDLE_PRICE_ID=pri_...
PADDLE_PRICE_ID_PRO=pri_...
PADDLE_PRICE_ID_AGENCY=pri_...
```

Y ejecuta el verificador (comprueba que cada `pri_...` existe y coincide con el importe):

```bash
npm run check:config
```

Si todo está bien verás `✅ Configuracion lista para desplegar`.

---

## Resumen: lo único que necesitas obtener de Paddle

| # | Qué | Dónde | Variable |
|---|---|---|---|
| 1 | 3 Price IDs mensuales | Catalog → Products | `PADDLE_PRICE_ID`, `..._PRO`, `..._AGENCY` |
| 2 | 1 API key | Developer Tools → Authentication | `PADDLE_API_KEY` |
| 3 | 1 Webhook secret | Developer Tools → Notifications | `PADDLE_WEBHOOK_SECRET` |
| 4 | (Prod) Verificación de negocio + banco | Settings → Business | — |

Con esos 5 valores (3 precios + API key + webhook secret) el sistema queda
operativo de punta a punta: alta, cobro recurrente, cancelación y pagos fallidos.

---

## Qué hace el sistema automáticamente por ti

- **Crea el checkout** (`POST /transactions`) con los datos del negocio.
- **Al completar el pago:** crea el cliente, su sitio, envía el correo de bienvenida.
- **Sincroniza la suscripción** (estado, periodo, precio) desde los webhooks.
- **Cancela / reactiva:** en `subscription.canceled` desactiva los sitios; en `active` los reactiva.
- **Pagos fallidos:** marca la suscripción como `PAST_DUE` y avisa al administrador.
- **Idempotencia y firma:** verifica el HMAC del webhook y descarta eventos duplicados o reenviados.

> Nota: Paddle no expone un "portal de facturación" con sesión como Stripe. El
> cliente gestiona su suscripción a través de los correos de Paddle o contactando
> a soporte. El botón de portal queda oculto automáticamente en ese caso.
