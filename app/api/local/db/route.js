import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { isLocalMode } from '@/lib/local/auth';
import { isAdminRequest, sameOrigin, isJson, allow, clientIp, adminAllowed } from '@/lib/local/security';
import { runQuery } from '@/lib/local/engine';

export const dynamic = 'force-dynamic';

// The admin login table is never reachable through this API.
const TABLES = ['categories', 'brands', 'products', 'product_images', 'product_specifications', 'product_variants', 'enquiries', 'enquiry_items', 'quotations', 'website_settings', 'gallery_images'];
const OPS = ['select', 'insert', 'update', 'upsert', 'delete'];
const COL = /^[a-z_][a-z0-9_]*$/i;

// Exactly the columns each table really has. Anything else (e.g. "is_admin", "__proto__") is refused.
const COLUMNS = {
  categories: ['id', 'parent_id', 'name', 'slug', 'description', 'image_url', 'sort_order', 'created_at', 'updated_at'],
  brands: ['id', 'name', 'slug', 'description', 'logo_url', 'created_at', 'updated_at'],
  products: ['id', 'sku', 'name', 'slug', 'category_id', 'brand_id', 'description', 'dimensions', 'thickness', 'availability', 'stock_quantity', 'price', 'is_published', 'is_featured', 'created_at', 'updated_at'],
  product_images: ['id', 'product_id', 'url', 'alt', 'sort_order', 'created_at'],
  product_specifications: ['id', 'product_id', 'spec_key', 'spec_value', 'sort_order'],
  product_variants: ['id', 'product_id', 'label', 'price', 'unit', 'sort_order'],
  enquiries: ['id', 'reference', 'customer_name', 'phone', 'company', 'email', 'category', 'requirements', 'quantity', 'dimensions', 'delivery_location', 'message', 'status', 'created_at', 'updated_at'],
  enquiry_items: ['id', 'enquiry_id', 'product_id', 'product_name', 'quantity', 'notes'],
  quotations: ['id', 'enquiry_id', 'amount', 'notes', 'status', 'sent_at', 'created_at', 'updated_at'],
  website_settings: ['key', 'value', 'updated_at'],
  gallery_images: ['id', 'url', 'caption', 'category', 'sort_order', 'created_at'],
};
const SERVER_SET = ['id', 'created_at', 'updated_at'];                 // the server fills these in; clients may not send them
const URL_SETTINGS = ['facebook', 'instagram', 'youtube', 'maps_link', 'maps_embed_url', 'logo_url', 'hero_image_url'];
const okUrl = (key, v) => (key === 'maps_embed_url' ? /^https:\/\/www\.google\.com\/maps/i.test(v) : key.endsWith('_image_url') || key === 'logo_url' ? /^(https?:\/\/|\/(uploads|images)\/)/i.test(v) : /^https?:\/\//i.test(v));
const SELECT = /^[\w\s,:*().]{1,800}$/;

const err = (message, status = 400) => NextResponse.json({ data: null, error: { message } }, { status, headers: { 'Cache-Control': 'no-store' } });

function cleanValues(v, table) {
  const rows = Array.isArray(v) ? v : [v];
  if (rows.length > 300) return null;
  for (const r of rows) {
    if (!r || typeof r !== 'object' || Array.isArray(r)) return null;
    for (const [k, val] of Object.entries(r)) {
      if (!COL.test(k) || !COLUMNS[table].includes(k) || SERVER_SET.includes(k)) return null;
      if (val !== null && !['string', 'number', 'boolean'].includes(typeof val)) return null;
      if (typeof val === 'string' && val.length > 20000) return null;
    }
  }
  return v;
}

// Links stored in settings must be real web addresses (no "javascript:" etc.). Checked for insert, update AND upsert.
function badSettingsLink(p) {
  if (p.table !== 'website_settings' || !['insert', 'update', 'upsert'].includes(p.op)) return false;
  const keyFromFilter = (p.filters || []).find((f) => f[0] === 'eq' && f[1] === 'key')?.[2];
  if (p.op === 'update' && typeof keyFromFilter !== 'string') return true;     // a setting must be addressed by its key
  return (Array.isArray(p.values) ? p.values : [p.values]).some((r) => {
    const key = r.key ?? keyFromFilter;
    return URL_SETTINGS.includes(key) && typeof r.value === 'string' && r.value && !okUrl(key, r.value);
  });
}

function validate(p) {
  if (!p || typeof p !== 'object') return 'Invalid query';
  if (!TABLES.includes(p.table)) return 'Unknown table';
  if (!OPS.includes(p.op)) return 'Unsupported operation';
  if (p.select != null && (typeof p.select !== 'string' || !SELECT.test(p.select))) return 'Invalid select';
  if (p.returning != null && (typeof p.returning !== 'string' || !SELECT.test(p.returning))) return 'Invalid select';
  if (!Array.isArray(p.filters || []) || (p.filters || []).length > 10) return 'Invalid filters';
  for (const f of p.filters || []) {
    if (!Array.isArray(f) || f.length !== 3 || !['eq', 'neq', 'in', 'is'].includes(f[0]) || !COL.test(f[1]) || !COLUMNS[p.table].includes(f[1])) return 'Invalid filter';
    if (f[0] === 'in' ? !Array.isArray(f[2]) || f[2].length > 100 : f[2] !== null && !['string', 'number', 'boolean'].includes(typeof f[2])) return 'Invalid filter value';
  }
  for (const o of p.order || []) if (!o || !COL.test(o.col) || !COLUMNS[p.table].includes(o.col)) return 'Invalid order';
  if ((p.order || []).length > 4) return 'Invalid order';
  if (p.limit != null && !(Number.isInteger(p.limit) && p.limit > 0 && p.limit <= 1000)) return 'Invalid limit';
  if (['insert', 'update', 'upsert'].includes(p.op) && !cleanValues(p.values, p.table)) return 'Invalid values';
  if (badSettingsLink(p)) return 'Invalid link: use a full web address starting with https://';
  if (['update', 'delete'].includes(p.op) && !(p.filters || []).length) return 'Refusing to change every row without a filter';
  if (p.onConflict != null && (!COL.test(p.onConflict) || !COLUMNS[p.table].includes(p.onConflict))) return 'Invalid conflict column';
  return null;
}

export async function POST(request) {
  if (!isLocalMode()) return err('Not found', 404);
  if (!sameOrigin(request) || !isJson(request)) return err('Request blocked', 403);
  if (!isAdminRequest(request)) return err('Please log in again', 401);
  if (!adminAllowed(request)) return err('Admin access is only allowed from the computer running the site, or over HTTPS.', 403);
  if (!allow(`db:${clientIp(request)}`, 600, 60 * 1000)) return err('Too many requests', 429);
  const raw = await request.text();
  if (raw.length > 1_000_000) return err('Request too large', 413);
  let p; try { p = JSON.parse(raw); } catch { return err('Invalid JSON'); }
  const bad = validate(p); if (bad) return err(bad);
  const result = runQuery(p);
  if (p.op !== 'select' && !result.error) revalidatePath('/', 'layout'); // public site shows changes straight away
  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
}
