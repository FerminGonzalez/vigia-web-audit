# Vigía Web Audit — Marketing y Organización del Negocio

> Documento vivo. Define cómo se vende, cómo se organiza y cómo escala el
> Micro-SaaS. Revisar cada trimestre.

---

## 1. El modelo de negocio: Productized Service + SaaS

No es "una agencia con web" ni "un SaaS frío". Es la combinación que mejor
funciona en B2B local: **un servicio empaquetado, con precio fijo, entregado de
forma 100% automática**.

| Modelo probado | Referencia | Cómo lo adaptamos |
|---|---|---|
| **Productized Service** (servicio empaquetado, precio fijo, alcance definido) | DesignJoy (diseño por suscripción), Zirtual (asistentes) | "Auditoría web semanal" con alcance y precio cerrados. El cliente no compra horas, compra un resultado recurrente. |
| **SaaS por suscripción con tiers** | base de casi todo el SaaS B2B | 3 planes (Básico/Pro/Agencia) que crecen con la necesidad. |
| **Lead magnet / Freemium como motor** | HubSpot, agencias SEO | Auditoría gratis instantánea → captura del correo → conversión a pago. Ya está implementado (`/auditoria-gratis`). |
| **Reseller / White-label para agencias** | Programas de partners de Ahrefs/SEMrush | El plan Agencia convierte a otras agencias en canal de venta. |
| **Servicio "done-for-you" como upsell** | Agencias locales | La app avisa; nosotros (o un partner) aplicamos las mejoras. Alto margen, poca escalabilidad manual. |

**Por qué funciona en Panamá:** el mercado PYME local no compra "software", compra
**tranquilidad y un informe que entiende**. El valor no es la herramienta, es la
vigilancia continua + la traducción a lenguaje de negocio.

### Ventaja injusta (moat)
1. **Datos históricos acumulados** por sitio (tendencias semanales) — difícil de replicar por un competidor nuevo.
2. **Coste marginal casi cero** → precios agresivos imposibles para una agencia tradicional.
3. **Automatización real** (cron + IA) → no depende de la capacidad operativa del fundador para entregar.

---

## 2. Posicionamiento y mensaje

**Categoría:** "Vigilancia web para negocios" (no "herramienta SEO").

**Cliente ideal (ICP) inicial:**
- PYME panameña con sitio web propio (o de un freelance), 5–50 empleados.
- Sectores de mayor dolor: clínicas, restaurantes, inmobiliarias, colegios privados, ferreterías, e-commerce local, hoteles.
- Señal de compra: sitio **lento, sin HTTPS, mal en celular o abandonado**.

**Mensaje núcleo (una frase):**
> "Tu página web pierde clientes cada día y no lo sabes. Nosotros la revisamos cada semana y te lo explicamos en español, claro y accionable."

**Regla de tono:** cero jerga. Beneficio de negocio, no métrica técnica.
- ❌ "Tu LCP es de 4.2s" → ✅ "Tu página tarda en abrir; los clientes se van antes de ver tus precios."
- ❌ "Falta H1 y meta description" → ✅ "Google no sabe bien qué vendes, por eso no apareces."

---

## 3. Marketing: el embudo completo

```
       CAPTACIÓN            →      ACTIVACIÓN        →     CONVERSIÓN      →   RETENCIÓN
  (auditoría gratis)          (informe de muestra)      (suscripción)        (uso continuo)
  Landing + outbound          Correo automático          Checkout Stripe      Informe semanal
  + partners                  con el score real          + onboarding         + portal + alertas
```

### 3.1 El motor central: la auditoría gratis (ya construido)
Es el activo de marketing más potente del producto. **Nadie más audita tu sitio
y te lo manda con tu score en 60 segundos.** Reemplaza cualquier argumento de venta.

**Cómo se usa en cada canal:** nunca vendas primero. **Audita el sitio del prospecto, y muestra el resultado.** El informe *es* el pitch.

### 3.2 Canales, por orden de ROI probado en B2B local

**Fase temprana (0–3 meses): solo outbound hiper-segmentado. CAC ≈ 0.**
1. **Investigación en Google Maps / directorios locales**: lista de 200–500 PYMEs por sector y zona (Casco Antiguo, Vía España, Costa del Este, David, Colón…).
2. **Pre-auditar cada sitio** con `/auditoria-gratis` (o el endpoint admin).
3. **Contacto personalizado** por WhatsApp / LinkedIn / email:
   *"Hola [nombre], revisé la web de [negocio]. Encontré que [1 problema concreto]. Te paso el informe completo sin compromiso, ¿te lo envío?"*
4. Tasa de respuesta realista: 10–20% (por el gancho concreto). Conversión a pago: 5–10%.

**Fase de tracción (3–9 meses): alianzas + contenido.**
5. **Programa de partners con agencias y freelancers** (plan Agencia white-label). Un solo partner puede traer 10–30 sitios. Meta: 10–15 partners activos.
6. **Gremios y cámaras**: Cámara de Comercio (CCIAP), APEDE, gremios sectoriales. Ofrecer el taller/charla gratuita *"¿Por qué tu web no vende?"* con auditorías en vivo.
7. **SEO local de cola larga**: "auditoría web Panamá", "por qué mi página está lenta", "SEO para restaurantes Panamá". Artículos + el lead magnet al final.
8. **Contenido en LinkedIn**: publicar casos reales ("A esta ferretería le subimos el score de 42 a 88 en 3 semanas").

**Fase de escala (9–18 meses): demanda + referidos.**
9. **Programa de referidos**: 1 mes gratis por cada cliente referido que paga.
10. **Publicidad pagada** (Meta + Google) solo cuando el CAC de la fase 2 esté medido y el LTV sea claro.
11. **Testimonios y casos de estudio** como prueba social en la landing.

### 3.3 Secuencia de correo del lead (automatizable)
Tras la auditoría gratis, cadencia de 5 correos:
1. **(inmediato)** Informe de muestra + "resumen" (ya implementado).
2. **Día 2:** "¿Sabías que [problema del informe] puede costarte X clientes al mes?"
3. **Día 4:** Caso de éxito de un negocio similar.
4. **Día 7:** Oferta de arranque (primer mes con descuento / 14 días de prueba).
5. **Día 12:** Cierre suave + última llamada.

### 3.4 Métricas del embudo (a instrumentar)
| Etapa | Métrica | Meta inicial |
|---|---|---|
| Visitas landing | — | — |
| Auditorías gratis | leads/mes | 150 |
| Lead → cliente | conversión | 4–8% |
| Clientes nuevos | /mes | 8–12 |
| Churn mensual | % bajas | < 5% |
| CAC (fase outbound) | USD | ~0 (tiempo) |
| LTV/CAC | ratio | > 5 |

---

## 4. Organización del negocio

### 4.1 Etapa 1 — Solopreneur (0 → ~30 clientes)
Una sola persona (o dos fundadores) hace todo. **La clave: el producto hace la operación.**

| Área | Rol | Carga |
|---|---|---|
| Ventas | Fundador | 60% del tiempo |
| Producto/soporte técnico | Fundador | 20% |
| Soporte al cliente | Fundador | 20% (baja por la automatización) |

**Procesos mínimos:**
- Onboarding 100% automático (Stripe → webhook → BD → primer informe). *Nada manual.*
- Soporte por WhatsApp/email con SLA de 24 h, usando plantillas.
- Revisión semanal del dashboard: cancelaciones, fallos de cron, calidad de informes IA.

### 4.2 Etapa 2 — Primeras contrataciones (30 → ~100 clientes)
| Rol | Cuándo | Misión |
|---|---|---|
| **Customer Success / Soporte** (part-time primero) | ~30–40 clientes | Retención, onboarding asistido, casos de éxito |
| **SDR / Ventas** (comisión) | ~50 clientes | Outbound y gestión de leads |
| **Marketing/Contenido** (freelance) | ~60 clientes | SEO, LinkedIn, casos |

El fundador se libera de ventas y pasa a producto + partnerships.

### 4.3 Etapa 3 — Equipo (100 → 250+ clientes)
- **Head of Growth** (marketing + ventas).
- **Customer Success Manager** + 1 soporte.
- **1–2 desarrolladores** (producto, fiabilidad, nuevas features).
- **Partnerships Manager** (red de agencias).

**Regla de oro de escalado:** no contratar para algo que todavía no está
**documentado como proceso** (`docs/`). Automatizar antes de contratar.

### 4.4 Procesos y herramientas internas
| Necesidad | Herramienta |
|---|---|
| CRM y pipeline | HubSpot Free / Notion |
| Soporte | WhatsApp Business + bandeja de correo |
| Facturación | Stripe/Paddle + portal |
| Documentación | este repo `docs/` + Notion |
| Analítica de producto | Metabase/PostHog sobre la BD |
| Alertas internas | email `ADMIN_NOTIFICATION_EMAIL` (ya implementado) |

### 4.5 Estructura de costes (margen bruto esperado > 90%)
| Concepto | Coste mensual estimado |
|---|---|
| Hosting (Render/Railway/Fly) | $7–25 |
| Base de datos (Supabase) | $0–25 |
| Correo (Resend) | $0–20 |
| IA (por informe) | $0.05–0.30 × clientes |
| PageSpeed | $0 (cuota gratuita) |
| **Total a 100 clientes** | **≈ $50–90/mes** |

Con ARPU de ~$45 → 100 clientes ≈ **$4.500 MRR** con coste < $100. El negocio es
una máquina de margen.

---

## 5. Precios, cobro y realidad fiscal en Panamá

### 5.1 Estructura de precios (ya en `config/pricing.ts`)
| Plan | Precio | Objetivo |
|---|---|---|
| Básico | $29/mes | Entrada, negocios de 1 sitio |
| Pro | $59/mes | Negocio que quiere crecer (más popular) |
| Agencia | $149/mes | Agencias/multi-sucursal (white-label) |

Tácticas a probar: **14 días de prueba**, **descuento anual** (~2 meses gratis),
**primer mes con descuento** para leads calientes.

### 5.2 Aceptación de pagos — LA advertencia clave ⚠️
**Stripe no permite cuentas comerciales radicadas en Panamá** para procesar
pagos. El código ya está preparado para Stripe, pero para operar necesitas una de:

| Opción | Pros | Contras | Recomendación |
|---|---|---|---|
| **Paddle** (Merchant of Record) | Manejan impuestos globales, aceptan empresa panameña con cuenta bancaria local, sin LLC | Comisión mayor (~5% + fija) | ✅ **Empezar aquí** si quieres facturar ya |
| **Lemon Squeezy** (MoR) | Similar a Paddle, más simple, muy usado por micro-SaaS | Menos flexible | ✅ Alternativa directa |
| **Stripe Atlas** | Te da Stripe nativo + LLC en EE.UU. | Requiere constituir empresa en EE.UU. y cumplimiento fiscal | ✅ Si quieres Stripe real y plan de escala |
| **PayPal Business Panamá** | Sencillo, conocido | Mala experiencia de suscripción/recurrente | Solo como apoyo |
| **Yappy (Banco General)** | Dominante localmente, cobro en balboa | No gestiona suscripciones recurrentes | Complemento para "done-for-you" |

**Conclusión:** el sistema actual sigue siendo válido porque el adaptador de pagos
está aislado. Para producción se recomienda **añadir un adaptador Paddle/Lemon
Squeezy** (misma firma: webhook → actualizar suscripción) o constituir vía
**Stripe Atlas**. Documentar en `docs/PAYMENTS.md` al implementarlo.

---

## 6. Plan de 90 días

**Mes 1 — Validar que convierte**
- [ ] Publicar landing + auditoría gratis en un dominio propio.
- [ ] Lista de 300 PYMEs segmentadas; auditar y contactar 20/día.
- [ ] Primeros 5–10 clientes de pago.
- [ ] Medir conversión real del embudo.

**Mes 2 — Sistematizar**
- [ ] Secuencia de 5 correos automatizada.
- [ ] Página de casos de éxito con los primeros clientes.
- [ ] Primeros 3–5 partners de agencia.
- [ ] Llegar a 20–30 clientes.

**Mes 3 — Escalar**
- [ ] Programa de referidos.
- [ ] Contenido SEO local (4–6 artículos).
- [ ] Primer contratado (soporte/CS).
- [ ] Meta: 40–60 clientes, > $2.000 MRR.

---

## 7. Principios que no se negocian
1. **El informe es el producto y el pitch.** Si el informe es claro y útil, el negocio crece solo.
2. **Automatizar antes de contratar.** Cada tarea repetida debe volverse proceso o código.
3. **Un mensaje, una promesa.** "Vigilamos tu web cada semana y te decimos cómo vender más."
4. **La retención es sagrada.** Un cliente que ve valor cada semana no se da de baja. Churn < 5%.
