# Vigía Web Audit — Descripción de producto (Hackathon)

> **Tagline:** *Tu sitio web, vigilado y mejorado cada semana — sin que hagas nada.*

---

## 1. Pitch en una frase

**Vigía Web Audit** es un micro-SaaS 100 % automatizado ("Zero-Touch") que **audita el sitio web de una PyME cada semana** (rendimiento, SEO, seguridad y disponibilidad), **redacta un informe en español claro con IA** y lo **envía por correo** — estructurado según el estándar que el cliente elija (NIST, ISO, ENISA o SANS).

---

## 2. El problema

- La mayoría de PyMEs **no tiene equipo técnico** ni presupuesto para un consultor.
- Su web **carga lento, no aparece en Google o no usa HTTPS**, y **no lo saben**.
- Las herramientas existentes (Lighthouse, GTmetrix, SEMrush) devuelven **datos técnicos** que un dueño de negocio no puede interpretar ni priorizar.
- Contratar un **análisis profesional** es caro (cientos de dólares) y **puntual**, no continuo.

**Consecuencia:** siguen perdiendo clientes por un sitio lento o inseguro, sin saber qué arreglar primero.

---

## 3. La solución

Un servicio **de suscripción** que actúa como un **"consultor digital automático"**:

1. **Audita** el sitio cada semana (velocidad real en móvil, SEO on-page, seguridad y disponibilidad).
2. **Traduce** los hallazgos técnicos a **lenguaje de negocio** ("tus clientes esperan demasiado", no "alto TBT").
3. **Estructura** el informe según el **estándar que el cliente use internamente**.
4. **Entrega** el informe por correo, con histórico y portal de cliente.
5. **Todo sin intervención humana**: el cliente paga y el sistema se encarga del resto.

---

## 4. Cómo funciona (flujo Zero-Touch)

```
Cliente paga  →  webhook (Stripe/Paddle)  →  suscripción sincronizada
                                              │
        ┌─────────────────────────────────────┘
        ▼  cada semana (cron)
  Auditoría técnica  →  Informe con IA  →  Correo al cliente  →  histórico en el portal
        │                    │
   HTTP + HTML(SEO)     Claude/OpenAI
   + PageSpeed          (+ fallback local sin coste)
   + cabeceras
```

- **Motor de captación (lead magnet):** auditoría **gratis instantánea** desde la landing → envía un informe real al prospecto y arranca una **secuencia de nutrición de 5 correos**.
- **Portal del cliente** con **magic link firmado** (sin contraseñas) e histórico de auditorías.
- **Cron semanal** (auditorías) y **diario** (nutrición) — hoy ejecutados con **GitHub Actions** (coste cero).

---

## 5. Estándares de informe (diferenciador clave) 🎯

El cliente elige la norma y **la estructura del informe cambia**:

| Grupo | Estándar | Enfoque |
|---|---|---|
| 1 | **NIST SP 800-61** | Preparación · Detección y análisis · Contención/erradicación/recuperación · Actividad posterior |
| 2 | **ISO/IEC 27035** | Planificación · Detección y reporte · Valoración y respuesta · Mejora continua |
| 3 | **ISO/IEC 27001** | Contexto del SGSI · Evaluación de riesgo · Controles · Operación y mejora |
| 4 | **ENISA** | Gestión de incidentes · Clasificación de amenazas · Respuesta y notificación · Resiliencia |
| 5 | **SANS Incident Handler's Handbook (PICERL)** | Preparación · Identificación · Contención/erradicación · Recuperación y lecciones |

> **Por qué importa:** alinea el informe técnico con los **marcos de cumplimiento** que ya usan empresas, aseguradoras y auditores. Convierte un "informe de marketing" en un **artefacto de gobernanza**.

---

## 6. Diferenciadores

1. **Informes en lenguaje humano**, no dashboards técnicos.
2. **Multi-estándar** (NIST / ISO 27035 / ISO 27001 / ENISA / SANS) seleccionable por cliente.
3. **100 % automatizado**: captación, onboarding, auditoría, redacción y entrega.
4. **IA con degradación elegante**: usa Claude/OpenAI y, si fallan o no hay coste, un **generador local** garantiza que el informe siempre salga.
5. **Enfocado a PyMEs de Panamá** (español neutro local, contexto de negocio local).
6. **Seguro desde el diseño** (ver §9).

---

## 7. Arquitectura y stack

```
┌ Landing / Portal ┐   ┌──────────── App (Express + TypeScript) ───────────┐
│  HTML sin JS     │──►│ /  /empezar  /auditoria-gratis  /cuenta  /api/*    │
└──────────────────┘   │ webhooks idempotentes · magic links · rate limit    │
                       └───────────────┬───────────────────────────────────┘
                                       ▼
                          PostgreSQL (Supabase)  ·  Resend (correo)
        GitHub Actions ─► cron semanal / diario / keep-warm / redeploy
```

- **Backend:** Node 20 + **TypeScript**, **Express**, **Prisma** (ORM), **PostgreSQL** (Supabase), validación con **Zod**, logs con **Pino**.
- **Frontend:** HTML renderizado en servidor (rápido, indexable, **funciona sin JavaScript**).
- **Auditoría técnica:** `fetch` HTTP + **Cheerio** (SEO on-page) + **Google PageSpeed/Lighthouse** + cabeceras de seguridad.
- **IA:** **Anthropic Claude** / **OpenAI** con **fallback local determinista**.
- **Infra:** **Docker** → **Render** (región Ohio); **GitHub Actions** para CI, crons, keep-warm y despliegue; **Cloudflare** para DNS.
- **Pagos:** adaptadores **Stripe** y **Paddle** (Merchant of Record, ideal para Panamá).
- **Calidad:** **Vitest** (39 pruebas) + **CI** en cada push.

---

## 8. Modelo de negocio

| Plan | Precio | Para quién |
|---|---|---|
| **Básico** | **$29/mes** | Un sitio, informe semanal |
| **Pro** | **$59/mes** | + plan de acción priorizado, alertas de caída, tendencias |
| **Agencia** | **$149/mes** | Hasta 10 sitios, informes white-label, panel multi-cliente |

- Ingreso **recurrente** (MRR) y **coste marginal casi nulo** (auditorías y generador local de IA sin coste; correo gratuito hasta miles/mes).
- **Embudo:** auditoría gratis → secuencia de correos → suscripción.
- **Cobro desde Panamá** vía Paddle (sin necesidad de LLC en EE. UU.).

---

## 9. Seguridad (lo que nos distingue en un hackathon) 🔐

Endurecido tras un **auditoría de seguridad con agentes especializados**:

- **Anti-SSRF:** guard que valida cada destino (bloquea loopback, rangos privados, `169.254.169.254`, IPv6 internas) **y cada salto de redirección**. *(La auditoría descarga webs de terceros: era el riesgo #1.)*
- **Sin IDOR:** el portal de facturación exige **token firmado del cliente** (HMAC-SHA256, comparación en tiempo constante); nunca se resuelve por email.
- **Webhooks confiables:** verificación de **firma sobre el cuerpo crudo**, **idempotencia atómica** (reserva del evento y liberación ante fallo) → no se pierden ni se duplican pagos.
- **No se pierden pagos en silencio:** ante email/cliente no resoluble, se **relanza para reintento** en vez de marcar el evento como procesado.
- **Rate limiting** en endpoints públicos y **sin cabeceras basura** (`x-powered-by` off).
- **Secretos separados** (firma de portal ≠ token admin) y **fail-fast** en producción.
- **Modo prueba:** en la versión de prueba **no se exigen credenciales de pago**.

---

## 10. Estado actual (demo en vivo)

| Componente | Estado |
|---|---|
| **App en línea** | ✅ `https://vigia-web-audit.onrender.com` (Docker en Render) |
| **Base de datos** | ✅ Supabase (PostgreSQL), migraciones aplicadas |
| **Correo real** | ✅ **Resend** con dominio verificado (`gestion2026.online`); informes entregados |
| **Informes por estándar** | ✅ probados en vivo (NIST y SANS) |
| **Captación + nutrición** | ✅ auditoría gratis + secuencia de correos |
| **Crons** | ✅ GitHub Actions (semanal + diario) |
| **Keep-warm / redeploy** | ✅ GitHub Actions |
| **Tests / CI** | ✅ 39 pruebas, CI verde |
| **Pagos** | 🟡 informativos (modo prueba; adaptadores Stripe/Paddle listos) |

---

## 11. Roadmap

1. **Activar pagos** (Stripe/Paddle) y habilitar el alta.
2. **Informes PDF** y **white-label** para agencias.
3. **Alertas inmediatas** si el sitio se cae (hoy: informes semanales).
4. **Palabras clave / competencia** y tendencias mes a mes.
5. **Multi-idioma** y expansión regional (Centroamérica).

---

## 12. Guion de demo (2–3 min)

1. Landing → **Auditoría gratis** con el selector de norma (elegir **SANS**): pego una URL y mi correo.
2. Mostrar el **correo recibido** (informe estructurado con las fases PICERL).
3. Mostrar el **portal del cliente** (magic link) con el histórico.
4. Mostrar **GitHub Actions**: cron semanal/diario, keep-warm y deploy.
5. Cerrar con el **muro de seguridad** (§9): SSRF, IDOR y pagos idempotentes.

> Regla de oro de la demo: el informe **llega por correo en menos de un minuto** — prueba tangible del valor.

---

## 13. Por qué gana

- **Problema real y doloroso** para un mercado enorme (PyMEs) y desatendido.
- **Producto completo y en vivo**, no una maqueta: pagos, IA, correo, portal, crons y seguridad.
- **Diferenciador defendible:** informes alineados a **marcos de cumplimiento (NIST/ISO/ENISA/SANS)**.
- **Unidad de negocio**: ingreso recurrente con **coste marginal casi cero**.
- **Ejecución técnica de nivel producción**: Docker, CI, tests y hardening tras una auditoría de seguridad.

---

*Vigía Web Audit — auditoría web automática, continua y en lenguaje humano. Hecho para Panamá, listo para la región.*
