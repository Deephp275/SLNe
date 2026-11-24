import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DATA_DIR } from '@/lib/local/paths';
import { isLocalMode } from '@/lib/local/auth';
import { isAdminRequest, sameOrigin, allow, clientIp, audit, adminAllowed } from '@/lib/local/security';

export const dynamic = 'force-dynamic';
const FOLDERS = ['products', 'categories', 'brands', 'gallery_images', 'settings', 'misc'];
const MAX = 5 * 1024 * 1024;
const fail = (error, status = 400) => NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });

// Identify the real image type from its first bytes (never trust the file name or browser-supplied type). SVG is refused: it can carry scripts.
function sniff(b) {
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.length > 12 && b.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (b.length > 12 && b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP') return 'webp';
  if (b.length > 12 && ['GIF87a', 'GIF89a'].includes(b.slice(0, 6).toString())) return 'gif';
  return null;
}

export async function POST(request) {
  if (!isLocalMode()) return fail('Not found', 404);
  if (!sameOrigin(request)) return fail('Request blocked', 403);
  if (!isAdminRequest(request)) return fail('Please log in again', 401);
  if (!adminAllowed(request)) return fail('Admin access is only allowed from the computer running the site, or over HTTPS.', 403);
  const ip = clientIp(request);
  if (!allow(`upload:${ip}`, 60, 10 * 60 * 1000)) return fail('Too many uploads. Wait a few minutes.', 429);
  if (Number(request.headers.get('content-length') || 0) > MAX + 50_000) return fail('Image must be under 5 MB', 413);
  let form; try { form = await request.formData(); } catch { return fail('Invalid upload'); }
  const file = form.get('file');
  if (!file || typeof file === 'string') return fail('No file');
  if (file.size > MAX) return fail('Image must be under 5 MB', 413);
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = sniff(buf);
  if (!ext) return fail('Only JPG, PNG, WebP or GIF images are allowed');
  const folder = FOLDERS.includes(String(form.get('path') || '').split('/')[0]) ? String(form.get('path')).split('/')[0] : 'misc';
  const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`; // server-chosen name
  const dest = path.join(DATA_DIR, 'uploads', folder, name);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf, { mode: 0o600 });
  audit('upload', ip, { file: `${folder}/${name}`, bytes: buf.length });
  return NextResponse.json({ path: `${folder}/${name}` }, { headers: { 'Cache-Control': 'no-store' } });
}
