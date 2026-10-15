# Go-Live Checklist — Vigía Web Audit

Secuencia para pasar de "código listo" a "cobrando". Marca cada casilla.
Bloque A puede hacerse ya; los bloques B–E cuando lo legal (Paddle/LLC) esté listo.

---

## Bloque A — Repositorio y base (se puede hacer ya)

- [ ] Repo privado en GitHub creado y con el código subido.
- [ ] `npm install` sin errores.
- [ ] `npx prisma generate` OK.
- [ ] `npm run typecheck` sin errores.
- [ ] `npm test` → 26/26 en verde.
- [ ] `npm run build` OK.
- [ ] Proyecto de base de datos creado (Supabase o Render Postgres) y `DATABASE_URL` guardada.
- [ ] Cuenta de **Resend** creada y **dominio verificado** (SPF/DKIM).

## Bloque B — Paddle (cuando la cuenta esté aprobada)

Ver `docs/PADDLE_SETUP.md` para el detalle.

- [ ] Cuenta Paddle Billing creada.
- [ ] (Producción) Verificación de negocio + cuenta bancaria panameña aprobada.
- [ ] 3 productos con precio **mensual** (Básico $29 / Pro $59 / Agencia $149).
- [ ] 3 `pri_...` copiados.
- [ ] API key creada (`pdl_...`) con `price:read`, `customer:read`, `transaction:write`.
- [ ] Webhook creado apuntando a `https://TU_DOMINIO/api/webhooks/paddle` con los 9 eventos.
- [ ] Webhook secret copiado (`pdl_ntfset_...`).

## Bloque C — Variables de entorno

Rellenar en `.env` local y en el panel de la nube:

- [ ] `APP_BASE_URL` = dominio final (https).
- [ ] `DATABASE_URL`.
- [ ] `PAYMENT_PROVIDER=paddle`, `PADDLE_ENVIRONMENT`, `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, 3 `PADDLE_PRICE_ID*`.
- [ ] `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `ADMIN_NOTIFICATION_EMAIL`.
- [ ] `ANTHROPIC_API_KEY` o `OPENAI_API_KEY` (o ninguna → generador local).
- [ ] `PAGESPEED_API_KEY` (opcional).
- [ ] `ADMIN_API_TOKEN` y `PORTAL_SIGNING_SECRET` (secretos largos, distintos entre sí).
- [ ] `CRON_ENABLED=false` en el servicio web (los crons van como jobs aparte).

Validación:

- [ ] `npm run check:config` → `✅ Configuracion lista para desplegar`.

## Bloque D — Despliegue

- [ ] Blueprint `render.yaml` desplegado (web + 2 crons + PostgreSQL).
      *o* Railway con `railway.json` *o* Docker + VPS.
- [ ] Migraciones aplicadas (el entrypoint ejecuta `prisma migrate deploy`).
- [ ] `GET /api/health` → `{ ok: true }`.
- [ ] `GET /api/health/ready` → `database: ok`, `paymentProvider: paddle`, `planesConfigurados: 3/3`.
- [ ] Dominio personalizado apuntando al servicio + HTTPS activo.
- [ ] URL del webhook de Paddle actualizada al dominio final.

## Bloque E — Pruebas de humo (Sandbox primero)

- [ ] Auditoría gratis: enviar `POST /auditoria-gratis` con una URL → llega el informe por correo.
- [ ] Checkout: entrar a `/empezar?plan=pro`, pagar con tarjeta de prueba de Paddle → redirige a `/gracias`.
- [ ] El webhook crea el cliente (revisar `/api/admin/clients`).
- [ ] Llega el correo de bienvenida con el enlace del portal.
- [ ] Portal `/cuenta?token=...` muestra datos e histórico.
- [ ] Auditoría manual: `POST /api/admin/audits/run` con `{ "siteId": "..." }`.
- [ ] Cancelación: cancelar en Paddle → suscripción `CANCELED` y sitios desactivados.
- [ ] Repetir E en **Production** con una transacción real pequeña.

## Bloque F — Post-lanzamiento

- [ ] Backups automáticos de la base de datos activados.
- [ ] Alertas internas: confirmar que llegan correos a `ADMIN_NOTIFICATION_EMAIL`.
- [ ] Monitor externo de uptime apuntando a `/api/health`.
- [ ] Empezar el playbook de captación (`docs/DISTRIBUTION.md`).

---

## Comandos de referencia rápida

```bash
# Calidad
npm run typecheck
npm test
npm run build

# Verificación de configuración
npm run check:config

# Aplicar migraciones en producción
npx prisma migrate deploy

# Disparar tareas manualmente
npm run audit:run
npm run nurture:run
```
