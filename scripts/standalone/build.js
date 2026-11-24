// Builds ONE self-contained HTML file of the whole website (all pages, pictures, fonts and styles inside).
// Run:  npm run build:standalone      (the website must be running at http://localhost:3000, or set SITE_URL)
// Writes: website.html (to send by WhatsApp/email) and docs/index.html (served by GitHub Pages).
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const BASE = process.env.SITE_URL || 'http://localhost:3000';
const db = JSON.parse(fs.readFileSync(`${ROOT}/data/db.json`, 'utf8'));
const S = Object.fromEntries(db.website_settings.map((r) => [r.key, r.value]));
const get = async (p) => { const r = await fetch(BASE + p); if (!r.ok) throw new Error(`${p} -> ${r.status}`); return r; };
const getText = async (p) => (await get(p)).text();
const mime = { svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', woff2: 'font/woff2' };
const dataUri = (buf, ext) => `data:${mime[ext]};base64,${Buffer.from(buf).toString('base64')}`;

const sharp = require('sharp');
const IMGMAP = {};   // key -> data URI (every picture stored once)
const IMGKEY = {};   // public path -> key
const prepared = {}; // public path -> shrunk data URI
async function prepareImages() {
  const dir = `${ROOT}/public/images`;
  for (const f of fs.readdirSync(dir).filter((x) => /\.(jpg|png)$/i.test(x))) {
    const hero = f.startsWith('hero');
    const buf = await sharp(`${dir}/${f}`).resize({ width: hero ? 1280 : 800, withoutEnlargement: true }).jpeg({ quality: hero ? 68 : 72, mozjpeg: true }).toBuffer();
    prepared[`/images/${f}`] = dataUri(buf, 'jpg');
  }
  prepared['/logo.png'] = dataUri(await sharp(`${ROOT}/public/logo.png`).resize({ width: 256 }).png({ compressionLevel: 9 }).toBuffer(), 'png');
}
function keyFor(p) { if (!(p in IMGKEY)) { IMGKEY[p] = 'i' + Object.keys(IMGKEY).length; IMGMAP[IMGKEY[p]] = prepared[p]; } return IMGKEY[p]; }
function inlineImages(html) {
  // Next.js serves pictures as /_next/image?url=...; the file has no server, so point each <img> at the embedded original instead
  return html.replace(/<img\b[^>]*>/g, (tag) => {
    let p = null;
    const m = /\ssrc="\/_next\/image\?url=([^"&]+)[^"]*"/.exec(tag);
    if (m) p = decodeURIComponent(m[1].replace(/&amp;/g, '&'));
    else { const m2 = /\ssrc="(\/(?:images\/[^"]+|logo\.png))"/.exec(tag); if (m2) p = m2[1]; }
    if (!p || !prepared[p]) return tag;
    return tag.replace(/\ssrcset="[^"]*"/i, '').replace(/\ssizes="[^"]*"/, '').replace(/\ssrc="[^"]*"/, ` data-i="${keyFor(p)}"`);
  });
}
const rewriteLinks = (html) => html.replace(/href="(\/[^"]*)"/g, (m, p) => (p.startsWith('/_next') || p.startsWith('/images') || p.startsWith('//') || p === '/logo.png' ? m : `href="#${p}"`));
const clean = (html) => html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<link[^>]*>/g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<noscript>[\s\S]*?<\/noscript>/g, '');
const mainOf = (html) => /<main[^>]*>([\s\S]*)<\/main>/.exec(html)[1];
const titleOf = (html) => ((/<title>(.*?)<\/title>/.exec(html) || [])[1] || S.business_name).replace(/&amp;/g, '&').replace(/&#x27;/g, "'");
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

(async () => {
  await prepareImages();
  const homeRaw = await getText('/');
  const header = clean(/<header[\s\S]*?<\/header>/.exec(homeRaw)[0]);
  const footer = clean(/<footer[\s\S]*?<\/footer>/.exec(homeRaw)[0]);
  const waFloat = (/<a href="https:\/\/wa\.me[^>]*aria-label="Chat on WhatsApp"[\s\S]*?<\/a>/.exec(homeRaw) || [''])[0];
  const htmlClass = /<html[^>]*class="([^"]*)"/.exec(homeRaw)[1];
  const bodyClass = /<body[^>]*class="([^"]*)"/.exec(homeRaw)[1];

  // ---- CSS: find the stylesheet(s) the page uses, keep only the Latin font files, embed them
  const sheetHrefs = [...homeRaw.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map((m) => m[1].split('?')[0]);
  let css = '';
  for (const href of sheetHrefs) css += await getText(href);
  const faces = css.match(/@font-face\s*\{[^}]*\}/g) || [];
  for (const face of faces) {
    const latin = /unicode-range:[^;}]*U\+\?\?/.test(face);                    // U+?? = U+0000-00FF = Latin
    if (!latin) { css = css.replace(face, ''); continue; }
    let out = face;
    for (const u of face.matchAll(/url\((?:\.\.\/media\/|\/_next\/static\/media\/)([^)]+?\.woff2)\)/g)) {
      const buf = Buffer.from(await (await get(`/_next/static/media/${u[1]}`)).arrayBuffer());
      out = out.replace(u[0], `url(${dataUri(buf, 'woff2')})`);
    }
    css = css.replace(face, out);
  }  css += `
.reveal{opacity:1!important;transform:none!important}
[hidden]{display:none!important}
.nav-active{color:#D9AE6A!important}
html{scroll-behavior:smooth}`;
  css = css.replace(/url\(["']?\/images\/wood-tile\.jpg["']?\)/g, () => `url(${prepared['/images/wood-tile.jpg']})`);

  // ---- data for the script
  const cats = db.categories.map((c) => ({ slug: c.slug, name: c.name, parent: c.parent_id ? db.categories.find((x) => x.id === c.parent_id).slug : null }));
  const catById = Object.fromEntries(db.categories.map((c) => [c.id, c]));
  const brandById = Object.fromEntries(db.brands.map((b) => [b.id, b]));
  const topSlug = (c) => (c.parent_id ? catById[c.parent_id].slug : c.slug);
  const products = {};
  db.products.filter((p) => p.is_published).forEach((p) => {
    const c = catById[p.category_id]; const b = brandById[p.brand_id];
    products[p.slug] = { name: p.name, brand: b ? b.name : '', brandSlug: b ? b.slug : '', cat: c ? c.slug : '', catName: c ? c.name : '', top: c ? topSlug(c) : '', desc: p.description || '',
      variants: db.product_variants.filter((v) => v.product_id === p.id).sort((a, b2) => a.sort_order - b2.sort_order).map((v) => v.label) };
  });
  const brands = db.brands.map((b) => ({ slug: b.slug, name: b.name }));
  const DATA = { business: S.business_name, wa: (S.whatsapp_number || '').replace(/\D/g, ''), cats, brands, products };

  // ---- pages
  const pages = [];
  const addPage = (path, html, title) => pages.push(`<div data-page="${path}" data-title="${esc(title)}" hidden class="page-in">${html}</div>`);
  const prep = (h) => inlineImages(rewriteLinks(clean(h)));

  addPage('/', prep(mainOf(homeRaw)), titleOf(homeRaw));
  for (const p of ['/about', '/brands']) { const raw = await getText(p); addPage(p, prep(mainOf(raw)), titleOf(raw)); }

  // gallery: tag items with their category and the chips
  {
    const raw = await getText('/gallery'); let m = mainOf(raw);
    const galCat = Object.fromEntries(db.gallery_images.map((g) => [g.url, g.category]));
    m = m.replace(/<button([^>]*class="group relative mb-4[^"]*"[^>]*)>(\s*<img[^>]*src="([^"]+)")/g, (all, a, b, src) => `<button${a} data-gal data-cat="${esc(galCat[src] || '')}">${b}`);
    m = m.replace(/(<div class="mt-10 flex flex-wrap gap-2">)([\s\S]*?)(<\/div>)/, (all, a, b, c) => a + b.replace(/<button/g, '<button data-chip') + c);
    addPage('/gallery', prep(m), titleOf(raw));
  }

  // products listing (rebuilt as static sections, cards taken from the server-rendered page)
  {
    const raw = await getText('/products');
    const cards = {}; for (const m of raw.matchAll(/<article[\s\S]*?<\/article>/g)) { const slug = /href="\/products\/([^"]+)"/.exec(m[0])[1]; cards[slug] = m[0]; }
    const tops = db.categories.filter((c) => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order);
    const sections = tops.map((t) => {
      const list = db.products.filter((p) => p.is_published && catById[p.category_id] && topSlug(catById[p.category_id]) === t.slug && cards[p.slug]);
      if (!list.length) return '';
      return `<section id="sec-${t.slug}" data-sec="${t.slug}" class="mt-14 scroll-mt-28"><div class="flex flex-wrap items-end justify-between gap-3"><div><p class="eyebrow">${esc(t.name)}</p><h2 class="h-display mt-2 text-2xl sm:text-3xl">${esc(t.name)} Collection</h2></div>${t.description ? `<p class="max-w-md text-sm text-cream/60">${esc(t.description)}</p>` : ''}</div><div class="gold-rule mt-4"></div><div class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">${list.map((p) => cards[p.slug].replace('<article', `<article data-slug="${p.slug}"`)).join('')}</div></section>`;
    }).join('');
    const html = `<section class="section container-x"><p class="eyebrow">Catalogue</p><h1 class="h-display mt-3 text-4xl sm:text-5xl">Our Products</h1><div class="gold-rule mt-6"></div>
<div class="mt-10"><div class="card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
<div><label class="label" for="pf-q">Search</label><input id="pf-q" class="input" placeholder="Name, brand…"></div>
<div><label class="label" for="pf-c">Category</label><select id="pf-c" class="input"></select></div>
<div id="pf-b-wrap"><label class="label" for="pf-b">Brand</label><select id="pf-b" class="input"></select></div>
<div id="pf-t-wrap"><label class="label" for="pf-t">Thickness / Size</label><select id="pf-t" class="input"></select></div></div>
<div class="mt-6 flex items-center justify-between text-sm text-cream/60"><span id="pf-count"></span><button id="pf-clear" type="button" class="text-gold-soft underline underline-offset-4" hidden>Clear filters</button></div>
<div id="pf-none" class="card mt-6 p-12 text-center text-cream/60" hidden>No products match your filters.</div>${sections}</div></section>`;
    addPage('/products', prep(html), titleOf(raw));
  }

  // product detail pages
  for (const p of db.products.filter((x) => x.is_published)) {
    const raw = await getText(`/products/${p.slug}`); addPage(`/products/${p.slug}`, prep(mainOf(raw)), titleOf(raw));
  }

  // quotation + contact: forms rebuilt (no server in a single file -> they open WhatsApp)
  const L = (id, t, extra = '') => `<div><label class="label" for="${id}">${t}</label><input id="${id}" class="input" ${extra}></div>`;
  const qform = `<form id="qform" novalidate class="mt-10 space-y-8">
<fieldset class="card grid gap-5 p-6 sm:grid-cols-2"><legend class="eyebrow px-2">Your details</legend>${L('q-name', 'Customer name *', 'autocomplete="name"')}${L('q-phone', 'Phone number *', 'type="tel" autocomplete="tel"')}${L('q-co', 'Company name')}${L('q-email', 'Email', 'type="email"')}</fieldset>
<fieldset class="card space-y-5 p-6"><legend class="eyebrow px-2">Your requirement</legend><div class="grid gap-5 sm:grid-cols-2">
<div><label class="label" for="q-cat">Product category</label><select id="q-cat" class="input"><option value="">Select…</option><option>Plywood</option><option>Laminates</option><option>Timber</option><option>Multiple / Other</option></select></div>
${L('q-loc', 'Delivery location')}${L('q-qty', 'Overall quantity', 'placeholder="e.g. 100 sheets"')}${L('q-dim', 'Dimensions', 'placeholder="e.g. 8 x 4 ft, 18 mm"')}</div>
<div><label class="label" for="q-req">Product requirements *</label><textarea id="q-req" rows="4" class="input" placeholder="Describe what you need…"></textarea></div>
<div><label class="label" for="q-msg">Additional message</label><textarea id="q-msg" rows="3" class="input"></textarea></div></fieldset>
<fieldset class="card p-6"><legend class="eyebrow px-2">Products (optional – add several)</legend><div id="q-items" class="space-y-3"></div><button id="q-add" type="button" class="mt-4 text-sm text-gold-soft underline underline-offset-4">+ Add another product</button></fieldset>
<p data-err hidden class="rounded-sm border border-red-400/40 p-4 text-sm text-red-300" role="alert"></p>
<button class="btn-gold w-full sm:w-auto">Send Quotation Request on WhatsApp</button></form>`;
  {
    const raw = await getText('/quotation'); let m = mainOf(raw); m = m.replace(/<form[\s\S]*<\/form>/, qform);
    addPage('/quotation', prep(m), titleOf(raw));
  }
  {
    const raw = await getText('/contact'); let m = mainOf(raw);
    const cform = `<form id="cform" novalidate class="card space-y-5 p-6"><h2 class="font-display text-2xl">Send us a message</h2>${L('c-name', 'Name *')}${L('c-phone', 'Phone *', 'type="tel"')}<div><label class="label" for="c-msg">Message *</label><textarea id="c-msg" rows="5" class="input"></textarea></div><p data-err hidden class="text-sm text-red-300" role="alert"></p><button class="btn-gold">Send on WhatsApp</button></form>`;
    m = m.replace(/<form[\s\S]*<\/form>/, cform);
    addPage('/contact', prep(m), titleOf(raw));
  }

  const logo = prepared['/logo.png'];
  const app = fs.readFileSync(`${__dirname}/app.js`, 'utf8');
  const out = `<!DOCTYPE html>
<html lang="en" class="${htmlClass}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titleOf(homeRaw))}</title>
<meta name="description" content="Quality plywood, premium laminates and timber solutions. Individual and bulk enquiries welcome.">
<link rel="icon" href="${logo}">
<style>${css}</style></head>
<body class="${bodyClass}">
${prep(header)}
${pages.join('\n')}
${prep(footer)}
${prep(waFloat)}
<script>window.IMG=${JSON.stringify(IMGMAP)};</script>
<script>window.DATA=${JSON.stringify(DATA).replace(/</g, '\\u003c')};</script>
<script>${app}</script>
</body></html>`;
  fs.writeFileSync(`${ROOT}/website.html`, out);
  fs.mkdirSync(`${ROOT}/docs`, { recursive: true });
  fs.writeFileSync(`${ROOT}/docs/index.html`, out);
  fs.writeFileSync(`${ROOT}/docs/.nojekyll`, '');   // tell GitHub Pages to serve the file as it is
  console.log('written', (out.length / 1024).toFixed(0) + ' KB', pages.length + ' pages');
})().catch((e) => { console.error('BUILD FAILED', e); process.exit(1); });
