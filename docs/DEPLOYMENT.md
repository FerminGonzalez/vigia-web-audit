# Despliegue en la nube — Vigía Web Audit

Guía paso a paso para poner el producto en producción. Se recomienda **Render**
(blueprint incluido en `render.yaml`) o **Railway** (`railway.json`), con la base
de datos en **Supabase**.

---

## Arquitectura de producción

```
                    ┌─────────────────────────────┐
   Usuarios  ─────► │  Servicio Web (Docker)       │  / (landing), /cuenta, /api/*
                    │  Vigia Web Audit             │
                    └──────────────┬──────────────┘
                                   │
      Cron semanal ────────────────┤
   (auditorías)                    │
      Cron diario ─────────────────┤
   (nutrición)                     │
                                   ▼
                        ┌──────────────────┐
                        │  PostgreSQL      │  (Supabase / Render)
                        └──────────────────┘
           Webhooks Stripe / Paddle ──►  /api/webhooks/{provider}
```

Componentes a desplegar:
1. **Servicio web** (Docker) — API + páginas.
2. **Cron de auditorías** — `node dist/jobs/run-once.js` semanal.
3. **Cron de nutrición** — `node dist/jobs/run-nurture-once.js` diario.
4. **Base de datos PostgreSQL**.

> En la nube, el servicio web y los crons son procesos **separados**, por eso
> en el web se define `CRON_ENABLED=false` (los crons se ejecutan como jobs).

---

## Paso 1 — Base de datos (Supabase)

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. **Project Settings → Database → Connection string (URI)**. Cópiala.
3. Si usas el *pooler* (puerto 6543) para la app, añade también `DIRECT_URL`
   (puerto 5432) y descomenta `directUrl` en `prisma/schema.prisma` para las migraciones.
4. Guarda la cadena como `DATABASE_URL`.

---

## Paso 2 — Correo (Resend)

1. Crea una cuenta en [resend.com](https://resend.com).
2. **Domains → Add Domain** y configura los registros DNS (SPF/DKIM).
3. Crea una API key → `RESEND_API_KEY`.
4. Define `EMAIL_FROM` con un remitente del dominio verificado.

---

## Paso 3 — IA

- Anthropic: crea una clave en [console.anthropic.com](https://console.anthropic.com) → `ANTHROPIC_API_KEY`.
- OpenAI: [platform.openai.com](https://platform.openai.com) → `OPENAI_API_KEY`.
- Si no configuras ninguna, el sistema usa el **generador local** (sin coste).

---

## Paso 4 — Pagos

Ver `docs/PAYMENTS.md`. Resumen:
- **Panamá → Paddle** (`PAYMENT_PROVIDER=paddle`), sin necesidad de LLC.
- **Stripe nativo → Stripe Atlas** (`PAYMENT_PROVIDER=stripe`).

Configura el webhook apuntando a:
```
https://TU_DOMINIO/api/webhooks/paddle     (o .../stripe)
```

---

## Paso 5 — Desplegar en Render (recomendado)

1. Sube el repositorio a GitHub.
2. En Render: **New → Blueprint** y selecciona el repo (usa `render.yaml`).
3. Render crea el servicio web, los 2 cron jobs y la base de datos.
4. Rellena los secretos marcados `sync: false` en el panel (Resend, IA, Paddle, tokens).
5. Espera el despliegue. El `docker-entrypoint.sh` **aplica las migraciones**
   (`prisma migrate deploy`) y arranca la app automáticamente.

**Health check:** `GET /api/health` → `{ ok: true }`.

### Alternativa: Railway
1. **New Project → Deploy from GitHub**.
2. Railway detecta `railway.json` y construye con el `Dockerfile`.
3. Añade las variables de entorno y un plugin PostgreSQL.
4. Para los crons, crea dos *Scheduled Jobs* con `node dist/jobs/run-once.js`
   y `node dist/jobs/run-nurture-once.js`.

### Alternativa: Fly.io / VPS
```bash
docker build -t vigia-web-audit .
docker run --env-file .env -p 3000:3000 vigia-web-audit
```
Programa los crons con `cron` del sistema llamando a `node dist/jobs/run-once.js`.

---

## Paso 6 — Dominio y HTTPS

1. Apunta tu dominio (ej. `vigia.pa`) al servicio web (CNAME/A según la plataforma).
2. Actualiza `APP_BASE_URL=https://vigia.pa` (afecta a enlaces de correo y checkout).
3. Verifica que el webhook de pago use el dominio final.

---

## Paso 7 — Verificación post-despliegue

```bash
# Salud
curl https://vigia.pa/api/health

# Readiness (BD + proveedor IA)
curl https://vigia.pa/api/health/ready

# Auditoría de prueba (protegida)
curl -X POST https://vigia.pa/api/admin/audits/preview \
  -H "Authorization: Bearer $ADMIN_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url":"panama.com"}'
```

---

## Costes estimados de producción

| Componente | Coste mensual |
|---|---|
| Render Web (Starter) | $7 |
| Render Postgres (Free/Starter) | $0–7 |
| Cron jobs (2) | incluido/gratis en plan bajo |
| Supabase (alternativa a Render DB) | $0–25 |
| Resend | $0–20 |
| IA (por informe) | ~$0.05–0.30 |
| **Total a ~100 clientes** | **≈ $15–60/mes** |

---

## Operación continua

- **Backups:** activa los backups automáticos de la base de datos.
- **Observabilidad:** los logs de Render/Railway ya son JSON (Pino). Conecta a Datadog/Logtail si creces.
- **Alertas:** `ADMIN_NOTIFICATION_EMAIL` recibe avisos de altas, bajas y fallos masivos.
- **Migraciones:** el entrypoint las aplica en cada despliegue; para cambios destructivos, revísalas antes.
