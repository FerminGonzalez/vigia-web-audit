/**
 * views/layout.ts
 * -----------------------------------------------------------------------------
 * Layout HTML compartido por las paginas publicas y el portal.
 * CSS en linea, sin dependencias, para carga instantanea y facil despliegue.
 */
import { escapeHtml } from '../templates/report-email';

export const BRAND = {
  name: 'Vigía Web Audit',
  tagline: 'Tu sitio web, vigilado y mejorado cada semana.',
  email: 'hola@vigia.pa',
  whatsapp: '+507 6000-0000',
};

export function baseStyles(): string {
  return `
    :root {
      --bg:#0b1020; --card:#ffffff; --ink:#0f172a; --muted:#64748b;
      --primary:#2563eb; --primary-dark:#1d4ed8; --accent:#0ea5e9;
      --good:#059669; --warn:#d97706; --bad:#dc2626; --border:#e2e8f0;
    }
    * { box-sizing: border-box; }
    body { margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
      color:var(--ink); background:#f8fafc; line-height:1.6; }
    a { color:var(--primary); text-decoration:none; }
    .container { max-width:1080px; margin:0 auto; padding:0 20px; }
    .nav { display:flex; align-items:center; justify-content:space-between; padding:18px 0; }
    .brand { font-weight:800; font-size:18px; color:var(--ink); letter-spacing:-0.02em; }
    .brand span { color:var(--primary); }
    .btn { display:inline-block; padding:12px 22px; border-radius:10px; font-weight:600; cursor:pointer;
      border:1px solid transparent; font-size:15px; }
    .btn-primary { background:var(--primary); color:#fff; }
    .btn-primary:hover { background:var(--primary-dark); }
    .btn-ghost { background:#fff; color:var(--ink); border-color:var(--border); }
    .hero { background:radial-gradient(1200px 500px at 50% -10%,#1e3a8a22,transparent),#0b1020; color:#fff;
      padding:72px 0 88px; }
    .hero h1 { font-size:44px; line-height:1.1; margin:0 0 16px; letter-spacing:-0.03em; }
    .hero p { font-size:19px; color:#c7d2fe; max-width:620px; margin:0 0 28px; }
    .pill { display:inline-block; background:#1e293b; color:#93c5fd; border:1px solid #334155;
      padding:6px 14px; border-radius:999px; font-size:13px; margin-bottom:20px; }
    .grid { display:grid; gap:20px; }
    .grid-3 { grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); }
    .card { background:var(--card); border:1px solid var(--border); border-radius:16px; padding:28px; }
    .price { font-size:40px; font-weight:800; letter-spacing:-0.03em; }
    .price small { font-size:15px; font-weight:500; color:var(--muted); }
    .plan-name { font-size:18px; font-weight:700; margin-bottom:4px; }
    .plan-tag { color:var(--muted); font-size:14px; margin-bottom:18px; min-height:42px; }
    .features { list-style:none; padding:0; margin:18px 0 0; }
    .features li { padding:8px 0 8px 26px; position:relative; font-size:15px; }
    .features li:before { content:"✓"; position:absolute; left:0; color:var(--good); font-weight:700; }
    .highlighted { border:2px solid var(--primary); box-shadow:0 20px 45px -25px #2563eb; position:relative; }
    .badge { position:absolute; top:-12px; left:50%; transform:translateX(-50%); background:var(--primary);
      color:#fff; font-size:12px; font-weight:700; padding:4px 14px; border-radius:999px; }
    section { padding:64px 0; }
    h2 { font-size:30px; letter-spacing:-0.02em; margin:0 0 8px; }
    .section-sub { color:var(--muted); font-size:17px; margin:0 0 36px; }
    .field { display:flex; gap:10px; flex-wrap:wrap; }
    input[type=email],input[type=url],input[type=text] { flex:1; min-width:220px; padding:13px 15px; font-size:15px;
      border:1px solid var(--border); border-radius:10px; }
    footer { background:#0b1020; color:#94a3b8; padding:40px 0; font-size:14px; }
    .muted { color:var(--muted); }
    .score-big { font-size:52px; font-weight:800; }
    table { width:100%; border-collapse:collapse; }
    th,td { text-align:left; padding:12px 10px; border-bottom:1px solid var(--border); font-size:14px; }
    th { color:var(--muted); font-weight:600; font-size:13px; text-transform:uppercase; letter-spacing:0.04em; }
    @media (max-width:600px){ .hero h1{font-size:32px;} }
  `;
}

export interface LayoutOptions {
  title: string;
  description?: string;
  body: string;
  showNav?: boolean;
}

export function layout(options: LayoutOptions): string {
  const { title, description = BRAND.tagline, body, showNav = true } = options;
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} · ${BRAND.name}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <style>${baseStyles()}</style>
</head>
<body>
  ${showNav ? nav() : ''}
  ${body}
  ${footer()}
</body>
</html>`;
}

function nav(): string {
  return `<div class="container"><div class="nav">
    <a class="brand" href="/">Vigía<span>Web</span></a>
    <div style="display:flex;gap:8px;align-items:center;">
      <a class="muted" href="/#precios" style="margin-right:12px;">Precios</a>
      <a class="btn btn-primary" href="/#auditoria">Auditoría gratis</a>
    </div>
  </div></div>`;
}

function footer(): string {
  return `<footer><div class="container" style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:16px;">
    <div>
      <div class="brand" style="color:#fff;">Vigía<span>Web</span></div>
      <p style="max-width:340px;margin:8px 0 0;">Auditoría web automática de rendimiento y SEO para negocios en Panamá.</p>
    </div>
    <div>
      <p style="margin:0;"><strong style="color:#e2e8f0;">Contacto</strong></p>
      <p style="margin:6px 0 0;"><a href="mailto:${BRAND.email}">${BRAND.email}</a></p>
      <p style="margin:6px 0 0;">${BRAND.whatsapp}</p>
    </div>
  </div></footer>`;
}
