// Local-only data store: a JSON file (data/db.json) that behaves like the Supabase tables.
// Server-side only. Used automatically while the Supabase keys in .env.local are placeholders.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DATA_DIR } from './paths';

const FILE = path.join(DATA_DIR, 'db.json');
const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID();

const REL = {
  products: {
    category: ['categories', 'category_id', 'one'], brand: ['brands', 'brand_id', 'one'],
    images: ['product_images', 'product_id', 'many'], specs: ['product_specifications', 'product_id', 'many'],
    variants: ['product_variants', 'product_id', 'many'],
  },
  enquiries: { items: ['enquiry_items', 'enquiry_id', 'many'] },
  quotations: { enquiry: ['enquiries', 'enquiry_id', 'one'] },
};
const UNIQUE = { categories: ['slug'], brands: ['slug'], products: ['slug', 'sku'], enquiries: ['reference'] };
const DEFAULTS = {
  products: { availability: 'on_request', is_published: false, is_featured: false, stock_quantity: null, price: null },
  enquiries: { status: 'New' }, quotations: { status: 'Pending', amount: null, notes: null, sent_at: null },
};

function seed() {
  const t = now();
  const mk = (o) => ({ id: uid(), created_at: t, updated_at: t, ...o });
  const categories = [];
  const top = (name, slug, sort_order, description, image_url) => { const c = mk({ parent_id: null, name, slug, description, image_url, sort_order }); categories.push(c); return c; };
  const sub = (p, name, slug, sort_order) => categories.push(mk({ parent_id: p.id, name, slug, description: null, image_url: null, sort_order }));
  const ply = top('Plywood', 'plywood', 1, 'Greenply, Kitply, Cubixa and Jansathi plywood in different thicknesses.', '/images/plywood-greenply-stack.jpg');
  const lam = top('Laminates', 'laminates', 2, 'Plain colour, designer, 3D print and home wall laminates.', '/images/laminate-wall-fluted.jpg');
  const tim = top('Timber', 'timber', 3, 'Silver timber in ready cut sizes.', '/images/timber-stack.jpg');
  [['Commercial Plywood', 'commercial-plywood'], ['Waterproof Plywood', 'waterproof-plywood'], ['Marine Plywood', 'marine-plywood'], ['Calibrated Plywood', 'calibrated-plywood']].forEach(([n, s], i) => sub(ply, n, s, i + 1));
  [['Plain Colour Laminates', 'plain-colour-laminates'], ['Designer Laminates', 'designer-laminates'], ['3D Print Laminates', '3d-print-laminates'], ['Home Wall Laminates', 'home-wall-laminates']].forEach(([n, s], i) => sub(lam, n, s, i + 1));
  sub(tim, 'Silver Cut Size', 'silver-cut-size', 1);
  const cat = (slug) => categories.find((c) => c.slug === slug).id;

  const brands = ['Greenply', 'Kitply', 'Cubixa', 'Jansathi'].map((name) => mk({ name, slug: name.toLowerCase(), description: null, logo_url: null }));
  const brand = (slug) => brands.find((b) => b.slug === slug)?.id || null;

  const I = (n) => `/images/${n}.jpg`;
  // [name, slug, category slug, brand slug, description, [thickness / size options], [image files]]
  const defs = [
    ['Greenply Plywood', 'greenply-plywood', 'plywood', 'greenply', 'Greenply plywood in 6 mm, 12 mm and 19 mm thickness.', ['19 mm', '12 mm', '6 mm'], ['plywood-greenply-stack', 'plywood-greenply-face']],
    ['Kitply Plywood', 'kitply-plywood', 'plywood', 'kitply', 'Kitply plywood in 6 mm and 19 mm thickness.', ['19 mm', '6 mm'], ['plywood-kitply-stack', 'plywood-kitply-face']],
    ['Cubixa Plywood', 'cubixa-plywood', 'plywood', 'cubixa', 'Cubixa plywood in 6 mm, 12 mm and 19 mm thickness.', ['19 mm', '12 mm', '6 mm'], ['plywood-cubixa-stack', 'plywood-cubixa-face']],
    ['Jansathi Plywood', 'jansathi-plywood', 'plywood', 'jansathi', 'Jansathi plywood in 19 mm thickness.', ['19 mm'], ['plywood-jansathi-stack', 'plywood-jansathi-face']],
    ['Plain Colour Laminates', 'plain-colour-laminates-range', 'plain-colour-laminates', null, 'Solid plain colour laminates in a wide range of shades.', [], ['laminate-plain']],
    ['Designer Laminates', 'designer-laminates-range', 'designer-laminates', null, 'Designer laminates in marble, stone, wood and geometric designs.', [], ['laminate-designer']],
    ['3D Print Laminates', '3d-print-laminates-range', '3d-print-laminates', null, '3D print laminates with fluted, pyramid, wave and cube textures.', [], ['laminate-3d']],
    ['Home Wall Laminates', 'home-wall-laminates-range', 'home-wall-laminates', null, 'Laminates for feature walls and living rooms, in fluted and 3D patterns.', [], ['laminate-wall-fluted', 'laminate-wall-3d']],
    ['Silver Cut Size Timber', 'silver-cut-size-timber', 'silver-cut-size', null, 'Silver timber available in ready cut sizes: 3" x 2", 4" x 2", 4" x 3" and 3" x 1.5".',
      ['3" x 2"', '4" x 2"', '4" x 3"', '3" x 1.5"'], ['timber-sizes', 'timber-stack']],
  ];
  const products = []; const product_variants = []; const product_images = [];
  defs.forEach(([name, slug, c, b, description, vars, imgs]) => {
    const p = mk({ sku: null, name, slug, category_id: cat(c), brand_id: b ? brand(b) : null, description, dimensions: null, thickness: null,
      availability: 'on_request', stock_quantity: null, price: null, is_published: true, is_featured: false });
    products.push(p);
    vars.forEach((label, i) => product_variants.push({ id: uid(), product_id: p.id, label, price: null, unit: null, sort_order: i + 1 }));
    imgs.forEach((f, i) => product_images.push({ id: uid(), product_id: p.id, url: I(f), alt: `${name} ${i + 1}`, sort_order: i, created_at: t }));
  });

  const gal = [['plywood-greenply-stack', 'Plywood sheets', 'Plywood'], ['plywood-kitply-face', 'Plywood sheet', 'Plywood'], ['laminate-wall-fluted', 'Fluted wall laminate', 'Laminates'],
    ['laminate-wall-3d', '3D wall laminate', 'Laminates'], ['laminate-plain', 'Plain colour laminates', 'Laminates'], ['laminate-3d', '3D print laminates', 'Laminates'],
    ['laminate-designer', 'Designer laminates', 'Laminates'], ['timber-sizes', 'Silver cut sizes', 'Timber'], ['timber-stack', 'Cut timber', 'Timber']];
  const gallery_images = gal.map(([f, caption, category], i) => ({ id: uid(), url: I(f), caption, category, sort_order: i, created_at: t }));

  const settings = { business_name: 'Shree Lakshmi Narayan Enterprise', logo_url: '', phone: '+919986480096', whatsapp_number: '919986480096', email: '', business_hours: '',
    address: '200, Nagarabhavi Main Rd, 2nd Block, Govindaraja Nagar Ward, Anubhav Nagar, Vijayanagar, Bengaluru, Karnataka 560072',
    contacts: 'Haresh|9986480096\nLeeladhar|9448588588\nAshwin|9535252660',
    maps_embed_url: '', maps_link: '', service_area: '', facebook: '', instagram: '', youtube: '', hero_image_url: '/images/hero.jpg' };
  return {
    admins: [{ id: 'local-admin', email: 'local-admin', created_at: t }],
    categories, brands, products, product_images, product_specifications: [], product_variants,
    enquiries: [], enquiry_items: [], quotations: [], gallery_images,
    website_settings: Object.entries(settings).map(([key, value]) => ({ key, value, updated_at: t })),
  };
}
function load() {
  if (!fs.existsSync(FILE)) { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(seed(), null, 2)); }
  return JSON.parse(fs.readFileSync(FILE, 'utf8'));
}
const save = (db) => fs.writeFileSync(FILE, JSON.stringify(db, null, 2));

function parseSelect(sel) {
  const parts = []; let depth = 0; let cur = '';
  for (const ch of sel) {
    if (ch === '(') depth++; if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  const spec = { star: false, cols: [], embeds: [] };
  parts.forEach((p) => {
    const m = p.match(/^(\w+):(\w+)\(([\s\S]*)\)$/);
    if (m) spec.embeds.push({ alias: m[1], sub: m[3] });
    else if (p === '*') spec.star = true;
    else if (p) spec.cols.push(p);
  });
  return spec;
}

function project(table, rows, sel, db) {
  const spec = parseSelect(sel || '*');
  return rows.map((r) => {
    const out = spec.star ? { ...r } : {};
    spec.cols.forEach((c) => { out[c] = r[c] ?? null; });
    spec.embeds.forEach((e) => {
      const rel = REL[table]?.[e.alias];
      if (!rel) { out[e.alias] = null; return; }
      const [tt, fk, kind] = rel;
      if (kind === 'one') { const t = db[tt].find((x) => x.id === r[fk]); out[e.alias] = t ? project(tt, [t], e.sub, db)[0] : null; }
      else out[e.alias] = project(tt, db[tt].filter((x) => x[fk] === r.id), e.sub, db);
    });
    return out;
  });
}

const matcher = (filters = []) => (row) => filters.every(([op, col, val]) =>
  op === 'eq' ? row[col] === val : op === 'neq' ? row[col] !== val : op === 'in' ? val.includes(row[col])
    : op === 'is' ? (val === null ? row[col] == null : row[col] === val) : true);

function sortRows(rows, order = []) {
  if (!order.length) return rows;
  return [...rows].sort((a, b) => {
    for (const { col, ascending } of order) {
      const x = a[col]; const y = b[col];
      if (x == null && y == null) continue;
      if (x == null) return 1; if (y == null) return -1;
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
      if (c) return ascending ? c : -c;
    }
    return 0;
  });
}

function checkUnique(db, table, row) {
  for (const col of UNIQUE[table] || []) {
    if (row[col] == null || row[col] === '') continue;
    if (db[table].some((x) => x.id !== row.id && x[col] === row[col])) throw new Error(`duplicate key value violates unique constraint "${table}_${col}_key" (${col} "${row[col]}" already exists)`);
  }
}

function cascadeDelete(db, table, ids) {
  const has = (arr, k) => (x) => ids.includes(x[k]);
  if (table === 'products') ['product_images', 'product_specifications', 'product_variants'].forEach((t) => { db[t] = db[t].filter((x) => !ids.includes(x.product_id)); });
  if (table === 'enquiries') { db.enquiry_items = db.enquiry_items.filter((x) => !ids.includes(x.enquiry_id)); db.quotations = db.quotations.filter((x) => !ids.includes(x.enquiry_id)); }
  if (table === 'brands') db.products.forEach((p) => { if (ids.includes(p.brand_id)) p.brand_id = null; });
  if (table === 'categories') {
    const kids = db.categories.filter(has(db.categories, 'parent_id')).map((c) => c.id);
    db.products.forEach((p) => { if (ids.includes(p.category_id)) p.category_id = null; });
    if (kids.length) { cascadeDelete(db, 'categories', kids); db.categories = db.categories.filter((c) => !kids.includes(c.id)); }
  }
}

export function runQuery(p) {
  try {
    const db = load();
    const rows = db[p.table];
    if (!rows) throw new Error(`Unknown table ${p.table}`);
    const ret = (list) => {
      if (!p.returning) return null;
      const out = project(p.table, list, p.returning, db);
      return p.single ? out[0] ?? null : out;
    };

    if (p.op === 'select') {
      let list = sortRows(rows.filter(matcher(p.filters)), p.order);
      const count = list.length;
      if (p.opts?.head) return { data: null, count, error: null };
      if (p.limit) list = list.slice(0, p.limit);
      const out = project(p.table, list, p.select, db);
      if (p.single === 'single') return out.length === 1 ? { data: out[0], error: null } : { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned' } };
      if (p.single === 'maybe') return { data: out[0] ?? null, error: null };
      return { data: out, count, error: null };
    }

    if (p.op === 'insert' || p.op === 'upsert') {
      const vals = Array.isArray(p.values) ? p.values : [p.values];
      const done = [];
      vals.forEach((v) => {
        if (p.op === 'upsert') {
          const key = p.onConflict || (p.table === 'website_settings' ? 'key' : 'id');
          const ex = rows.find((x) => x[key] === v[key]);
          if (ex) { Object.assign(ex, v, p.table === 'website_settings' ? { updated_at: now() } : { updated_at: now() }); done.push(ex); return; }
        }
        const row = { ...(DEFAULTS[p.table] || {}), ...v };
        if (p.table !== 'website_settings' && !row.id) row.id = uid();
        if (p.table !== 'website_settings' && !row.created_at) row.created_at = now();
        if (['categories', 'brands', 'products', 'enquiries', 'quotations', 'website_settings'].includes(p.table)) row.updated_at = now();
        if (p.table === 'product_variants' || p.table === 'product_images' || p.table === 'product_specifications') row.sort_order ??= 0;
        checkUnique(db, p.table, row);
        rows.push(row); done.push(row);
      });
      save(db);
      return { data: ret(done), error: null };
    }

    if (p.op === 'update') {
      const hit = rows.filter(matcher(p.filters));
      hit.forEach((r) => { Object.assign(r, p.values, { updated_at: now() }); checkUnique(db, p.table, r); });
      save(db);
      return { data: ret(hit), error: null };
    }

    if (p.op === 'delete') {
      const hit = rows.filter(matcher(p.filters)); const ids = hit.map((r) => r.id);
      cascadeDelete(db, p.table, ids);
      db[p.table] = db[p.table].filter((r) => !ids.includes(r.id));
      save(db);
      return { data: null, error: null };
    }
    throw new Error(`Unsupported operation ${p.op}`);
  } catch (e) {
    return { data: null, error: { message: e.message } };
  }
}

// Same rules as the SQL function submit_enquiry()
export function submitEnquiry(payload) {
  const db = load();
  const t = now();
  const ref = `SLN-${t.slice(2, 4)}${t.slice(5, 7)}${t.slice(8, 10)}-${crypto.randomBytes(3).toString('hex').slice(0, 5).toUpperCase()}`;
  const id = uid();
  const s = (v, n) => (v == null || v === '' ? null : String(v).slice(0, n));
  db.enquiries.push({ id, reference: ref, customer_name: s(payload.customer_name, 120), phone: s(payload.phone, 30), company: s(payload.company, 120), email: s(payload.email, 160),
    category: s(payload.category, 80), requirements: s(payload.requirements, 4000), quantity: s(payload.quantity, 120), dimensions: s(payload.dimensions, 200),
    delivery_location: s(payload.delivery_location, 200), message: s(payload.message, 4000), status: 'New', created_at: t, updated_at: t });
  (payload.items || []).forEach((i) => {
    if (i.product_name?.trim()) db.enquiry_items.push({ id: uid(), enquiry_id: id, product_id: i.product_id || null, product_name: s(i.product_name, 200), quantity: s(i.quantity, 80), notes: s(i.notes, 500) });
  });
  db.quotations.push({ id: uid(), enquiry_id: id, amount: null, notes: null, status: 'Pending', sent_at: null, created_at: t, updated_at: t });
  save(db);
  return ref;
}
