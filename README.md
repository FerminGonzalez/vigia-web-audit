# Vigía Web Audit 🛰️

Micro-SaaS B2B **100% automatizado ("Zero-Touch")** para el mercado de Panamá:
audita sitios web cada semana (rendimiento + SEO + seguridad), genera informes
en **español claro** con IA y los envía por correo a dueños de negocios locales.  
Estos informes, tendran un formato y seguiran un protocolo estandarizado, dependiendo a
las normas ISO correspondientes.

> El cliente paga → la suscripción se sincroniza por webhook → cada semana el
> sistema audita su sitio, la IA redacta el informe y se entrega por correo.
> Nadie interviene manualmente.

---

## ✨ Qué incluye

- **Landing pública con precios** (`/`) y checkout sin JavaScript (`/empezar`).
- **Motor de captación**: auditoría gratis instantánea (`/auditoria-gratis`) que envía un informe real al prospecto.
- **Secuencia de nutrición** automática de leads (5 correos, cron diario).
- **Portal del cliente** con magic link firmado (`/cuenta`) e histórico de auditorías.
- **Auditoría técnica**: HTTP + HTML (Cheerio) + Google PageSpeed Insights.
- **Informe con IA** (Anthropic Claude / OpenAI) con *fallback* local sin coste.
- **Informes bajo 5 estándares** elegibles por el cliente (y por lead): Grupo 1
  NIST SP 800-61, Grupo 2 ISO/IEC 27035, Grupo 3 ISO/IEC 27001, Grupo 4 ENISA y
  Grupo 5 SANS Incident Handler's Handbook (PICERL). La estructura del informe
  (fases/secciones) cambia según el grupo elegido.
- **Modo prueba (`PAID_OPTIONS_ENABLED=false`)**: los planes se muestran con
  fines informativos, pero el alta de pago permanece deshabilitada.
- **Pagos multi-proveedor**: Stripe y **Paddle** (imprescindible para cobrar desde Panamá).
- **Webhooks idempotentes** con verificación de firma.
- **Cron semanal** de auditorías y **cron diario** de nutrición.
- **Tests** (Vitest), **CI** (GitHub Actions) y **despliegue en la nube** (Render/Railway/Docker).

---

## 🏗️ Arquitectura

```
                    ┌──────────────────────────────────────────────────────────┐
   Landing / Portal │                    App (Express + TypeScript)              │
   ──── HTTP ──────►│  /            landing + precios                           │
                    │  /empezar     alta (crea checkout)      ──► Paddle/Stripe │
                    │  /auditoria-gratis  lead magnet (auditoría gratis)        │
                    │  /cuenta      portal del cliente (magic link)             │
                    │  /api/webhooks/:provider ──► subscription.service         │
                    │                                                            │
   Cron semanal ───►│  report.service: audit → IA → persistencia → email        │
   Cron diario  ───►│  nurture.service: secuencia de correos a leads            │
                    └───────────────┬──────────────────────────────────────────┘
                                    ▼
                         PostgreSQL (Supabase / Render)
```

---

## 📁 Estructura

```
vigia-web-audit/
├── prisma/
│   ├── schema.prisma          # Client, Site, Subscription, Audit, Report, Lead, ProcessedWebhook
│   └── seed.ts
├── src/
│   ├── index.ts / app.ts
│   ├── config/                # env.ts, logger.ts, pricing.ts
│   ├── lib/                   # prisma.ts, stripe.ts, http.ts
│   ├── controllers/           # page, public, payment, audit, health
│   ├── middlewares/           # auth, error, rate-limit
│   ├── routes/                # api, pages, webhook
│   ├── services/
│   │   ├── audit.service.ts       # 🔍 Auditoría técnica
│   │   ├── ai.service.ts          # 🤖 Informe en lenguaje de negocio
│   │   ├── email.service.ts       # ✉️ Envío transaccional (Resend)
│   │   ├── lead.service.ts        # 🧲 Lead magnet
│   │   ├── nurture.service.ts     # 📧 Secuencia de correos
│   │   ├── report.service.ts      # 🎯 Orquestador del flujo semanal
│   │   ├── subscription.service.ts# 💳 Aplica eventos de pago a la BD
│   │   ├── auth-token.service.ts  # 🔐 Magic links firmados
│   │   └── payment/               # Stripe + Paddle (adaptadores)
│   ├── jobs/                  # weekly-audit.cron, nurture.cron, run-once, run-nurture-once
│   ├── templates/             # report-email, nurture-emails
│   ├── views/                 # layout, landing, pages (HTML)
│   ├── types/ · utils/
│   └── __tests__/             # Vitest
├── docs/
│   ├── MARKETING_Y_OPERACIONES.md
│   ├── DISTRIBUTION.md
│   ├── PAYMENTS.md
│   ├── PADDLE_SETUP.md
│   └── DEPLOYMENT.md
├── .github/workflows/ci.yml
├── Dockerfile · docker-entrypoint.sh
├── render.yaml · railway.json
└── .env.example
```

---

## 🚀 Inicio rápido (local)

```bash
npm install
cp .env.example .env            # rellena credenciales
npx prisma migrate dev --name init
npm run prisma:seed             # cliente demo (opcional)
npm run dev                     # http://localhost:3000
```

Scripts útiles:

```bash
npm run typecheck     # verificación de tipos
npm test              # pruebas (Vitest)
npm run build         # compilar a dist/
npm run audit:run     # ronda de auditorías ahora
npm run nurture:run   # procesar cola de nutrición ahora
```

---

## 🔌 Rutas

### Páginas (HTML)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Landing + precios |
| GET/POST | `/empezar` | Alta de suscripción (crea checkout) |
| POST | `/auditoria-gratis` | Auditoría gratis (lead magnet, con rate limit) |
| GET | `/cuenta?token=` | Portal del cliente |
| GET | `/cancelar?token=` · `/baja?token=` | Gestión / baja |
| GET | `/gracias` | Confirmación post-pago |

### API (JSON)
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/health` · `/api/health/ready` | — | Salud / readiness |
| POST | `/api/billing/checkout` | — | Crea checkout |
| POST | `/api/billing/portal` | — | Portal de facturación |
| POST | `/api/webhooks/stripe` · `/api/webhooks/paddle` | Firma | Webhooks de pago |
| POST | `/api/admin/audits/run` | Admin | Ronda completa o un sitio |
| POST | `/api/admin/audits/preview` | Admin | Solo auditoría técnica |
| GET | `/api/admin/clients` · `/api/admin/sites/:id/history` | Admin | Datos |

Admin: `Authorization: Bearer <ADMIN_API_TOKEN>`.

---

## 💳 Pagos

El proveedor se elige con `PAYMENT_PROVIDER` (`stripe` | `paddle`).

> **Panamá:** Stripe no admite cuentas comerciales panameñas. Usa **Paddle**
> (Merchant of Record) para facturar sin LLC, o constituye vía **Stripe Atlas**
> para Stripe nativo. Detalles en [`docs/PAYMENTS.md`](docs/PAYMENTS.md) y los
> pasos concretos en [`docs/PADDLE_SETUP.md`](docs/PADDLE_SETUP.md).
>
> Verifica tu configuración con `npm run check:config` antes de desplegar.

---

## ☁️ Despliegue

Guía completa en [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). Resumen:

- **Render:** `New → Blueprint` con `render.yaml` (web + 2 crons + PostgreSQL).
- **Railway:** detecta `railway.json` y el `Dockerfile`.
- **Docker/Fly/VPS:** `docker build` + `docker run`; el entrypoint aplica migraciones.

Health check: `GET /api/health`.

---

## 💰 Modelo de negocio y crecimiento

Modelo **Productized Service + SaaS**, con precios en `config/pricing.ts`:

| Plan | Precio | Sitios |
|---|---|---|
| Básico | $29/mes | 1 |
| Pro | $59/mes | 1 (+ extras) |
| Agencia | $149/mes | 10 (white-label) |

- Estrategia y organización: [`docs/MARKETING_Y_OPERACIONES.md`](docs/MARKETING_Y_OPERACIONES.md)
- Playbook de captación: [`docs/DISTRIBUTION.md`](docs/DISTRIBUTION.md)
- Margen bruto esperado: **> 90%** (coste marginal casi cero).

---

## 🧠 Decisiones de diseño

- **Degradación elegante de la IA:** sin credenciales o si falla, se usa un generador local. El SaaS nunca deja de enviar informes.
- **Pagos intercambiables:** `payment/` normaliza eventos; añadir un proveedor no toca la lógica de negocio.
- **Idempotencia:** webhooks en `ProcessedWebhook`; crons con control anti-solape y ventana de 6 días.
- **Seguridad:** firmas verificadas, tokens HMAC constant-time, rate limiting, secretos redactados en logs.
- **Fail-fast:** `config/env.ts` valida el entorno (con reglas condicionales por proveedor de pago) y aborta si algo falta.

---

## 📄 Licencia

Propietaria / UNLICENSED.
