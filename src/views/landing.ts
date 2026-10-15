/**
 * views/landing.ts
 * -----------------------------------------------------------------------------
 * Landing publica: propuesta de valor, motor de captacion (auditoria gratis)
 * y tabla de precios coherente con `config/pricing.ts`.
 */
import { escapeHtml } from '../templates/report-email';
import { PLANS, formatPrice } from '../config/pricing';
import { layout, BRAND } from './layout';

function planCard(planIndex: number): string {
  const plan = PLANS[planIndex];
  if (!plan) return '';
  return `<div class="card ${plan.highlighted ? 'highlighted' : ''}">
    ${plan.highlighted ? '<span class="badge">Mas popular</span>' : ''}
    <div class="plan-name">${escapeHtml(plan.name)}</div>
    <div class="price">${formatPrice(plan)}<small>/mes</small></div>
    <div class="plan-tag">${escapeHtml(plan.tagline)} · ${plan.sites} sitio${plan.sites > 1 ? 's' : ''}</div>
    <a class="btn ${plan.highlighted ? 'btn-primary' : 'btn-ghost'}" style="width:100%;text-align:center;"
       href="/empezar?plan=${plan.id}">Suscribirme</a>
    <ul class="features">${plan.features.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}</ul>
  </div>`;
}

export function renderLanding(): string {
  const body = `
  <div class="hero">
    <div class="container">
      <span class="pill">🛰️ Auditoría automática · cada semana · sin que hagas nada</span>
      <h1>Tu sitio web más rápido, más visible y sin sorpresas.</h1>
      <p>Analizamos tu página cada semana, te explicamos en español qué mejorar (sin tecnicismos)
         y te enviamos el informe a tu correo. Tú solo te enfocas en tu negocio.</p>
      <a class="btn btn-primary" href="#auditoria">Quiero mi auditoría gratis</a>
      <a class="btn btn-ghost" href="#precios" style="margin-left:8px;">Ver precios</a>
    </div>
  </div>

  <section>
    <div class="container">
      <h2>¿Qué revisa Vigía Web?</h2>
      <p class="section-sub">Tres áreas que impactan directamente en tus ventas.</p>
      <div class="grid grid-3">
        <div class="card"><div style="font-size:28px;">⚡</div><h3>Velocidad</h3>
          <p class="muted">Si tu página carga lento, los clientes se van antes de ver tu oferta. Medimos los tiempos reales en celulares.</p></div>
        <div class="card"><div style="font-size:28px;">🔎</div><h3>Posicionamiento (SEO)</h3>
          <p class="muted">Revisamos títulos, descripciones y estructura para que Google entienda tu negocio y te muestre.</p></div>
        <div class="card"><div style="font-size:28px;">🔒</div><h3>Seguridad y confianza</h3>
          <p class="muted">HTTPS y cabeceras de seguridad: detalles que hacen que tus visitantes confíen en ti.</p></div>
      </div>
    </div>
  </section>

  <section style="background:#fff;">
    <div class="container">
      <h2 id="auditoria">Prueba gratis: analiza tu sitio ahora</h2>
      <p class="section-sub">Te enviamos un informe real en menos de un minuto. Sin tarjeta.</p>
      <form class="field" method="POST" action="/auditoria-gratis">
        <input type="url" name="url" placeholder="https://tu-negocio.com" required />
        <input type="text" name="businessName" placeholder="Nombre de tu negocio" />
        <input type="email" name="email" placeholder="tu@correo.com" required />
        <button class="btn btn-primary" type="submit">Analizar gratis</button>
      </form>
      <p class="muted" style="font-size:13px;margin-top:10px;">Al enviar aceptas recibir tu informe por correo. No compartimos tus datos.</p>
    </div>
  </section>

  <section>
    <div class="container">
      <h2 id="precios">Planes simples y claros</h2>
      <p class="section-sub">Cancela cuando quieras. Sin contratos ni letra pequeña.</p>
      <div class="grid grid-3">
        ${PLANS.map((_, i) => planCard(i)).join('')}
      </div>
      <p class="muted" style="text-align:center;margin-top:24px;">
        ¿Necesitas algo a medida o gestionar varios negocios? Escríbenos a ${BRAND.email}
      </p>
    </div>
  </section>

  <section style="background:#fff;">
    <div class="container">
      <h2>Preguntas frecuentes</h2>
      <div class="grid" style="grid-template-columns:1fr;gap:8px;">
        ${faq('¿Necesito saber de tecnología?', 'No. El informe está escrito en lenguaje claro y cada punto es una acción concreta.')}
        ${faq('¿Los cambios los hacen ustedes?', 'El servicio es de vigilancia y recomendación. Si quieres que apliquemos las mejoras, ofrecemos un servicio adicional.')}
        ${faq('¿Cómo pago?', 'Con tarjeta mediante una pasarela segura. La suscripción se renueva mensualmente y puedes cancelar desde el portal.')}
        ${faq('¿Puedo cancelar cuando quiera?', 'Sí, en un clic desde el enlace de tu correo o el portal del cliente.')}
      </div>
    </div>
  </section>
  `;
  return layout({ title: 'Auditoría web automática para negocios en Panamá', body });
}

function faq(q: string, a: string): string {
  return `<div class="card"><strong>${escapeHtml(q)}</strong><p class="muted" style="margin:6px 0 0;">${escapeHtml(a)}</p></div>`;
}
