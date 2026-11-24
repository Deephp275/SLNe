import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '@/lib/local/paths';
import { isLocalMode } from '@/lib/local/auth';
import { isAdminRequest, sameOrigin, isJson, allow, clientIp, audit, adminAllowed } from '@/lib/local/security';
import { runQuery } from '@/lib/local/engine';

export const dynamic = 'force-dynamic';
const ROOT = path.join(DATA_DIR, 'uploads');
const fail = (error, status = 400) => NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });

// Deletes uploaded photos that nothing on the site uses any more (and are older than minAgeMinutes, default 60,
// so a photo you uploaded a moment ago for a form you are still filling in is never touched).
export async function POST(request) {
  if (!isLocalMode()) return fail('Not found', 404);
  if (!sameOrigin(request) || !isJson(request)) return fail('Request blocked', 403);
  if (!isAdminRequest(request)) return fail('Please log in again', 401);
  if (!adminAllowed(request)) return fail('Admin access is only allowed from the computer running the site, or over HTTPS.', 403);
  const ip = clientIp(request);
  if (!allow(`cleanup:${ip}`, 10, 10 * 60 * 1000)) return fail('Too many requests.', 429);
  let body = {}; try { body = JSON.parse((await request.text()) || '{}'); } catch { return fail('Invalid request'); }
  const minAge = Number.isFinite(body.minAgeMinutes) ? Math.min(1440, Math.max(0, body.minAgeMinutes)) : 60;

  // every place a photo address can be stored
  const used = new Set();
  const grab = (table, select, pick) => (runQuery({ table, op: 'select', select, filters: [], order: [], opts: {} }).data || []).forEach((r) => { const v = pick(r); if (typeof v === 'string') { const m = /\/uploads\/([^?#]+)/.exec(v); if (m) used.add(m[1]); } });
  grab('categories', 'image_url', (r) => r.image_url);
  grab('brands', 'logo_url', (r) => r.logo_url);
  grab('product_images', 'url', (r) => r.url);
  grab('gallery_images', 'url', (r) => r.url);
  grab('website_settings', 'key,value', (r) => r.value);

  let removed = 0; let bytes = 0;
  if (fs.existsSync(ROOT)) {
    for (const folder of fs.readdirSync(ROOT, { withFileTypes: true })) {
      if (!folder.isDirectory()) continue;
      for (const f of fs.readdirSync(path.join(ROOT, folder.name))) {
        const rel = `${folder.name}/${f}`; const full = path.join(ROOT, folder.name, f);
        const st = fs.statSync(full);
        if (!used.has(rel) && Date.now() - st.mtimeMs >= minAge * 60 * 1000) { fs.rmSync(full, { force: true }); removed++; bytes += st.size; }
      }
    }
  }
  audit('upload_cleanup', ip, { removed, bytes });
  return NextResponse.json({ removed, kept: used.size, bytes }, { headers: { 'Cache-Control': 'no-store' } });
}
