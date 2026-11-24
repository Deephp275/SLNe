import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '@/lib/local/paths';

export const dynamic = 'force-dynamic';
const TYPES = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
const ROOT = path.join(DATA_DIR, 'uploads');

// Serves uploaded photos from data/uploads (kept outside /public so only validated images can ever be served)
export async function GET(_request, { params }) {
  const parts = (await params).path || [];
  if (!parts.length || parts.length > 3 || parts.some((p) => !/^[a-z0-9_.-]+$/i.test(p) || p.startsWith('.'))) return new NextResponse('Not found', { status: 404 });
  const file = path.join(ROOT, ...parts);
  const type = TYPES[file.split('.').pop().toLowerCase()];
  if (!type || !file.startsWith(ROOT + path.sep) || !fs.existsSync(file)) return new NextResponse('Not found', { status: 404 });
  return new NextResponse(fs.readFileSync(file), {
    headers: { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'public, max-age=3600', 'Content-Security-Policy': "default-src 'none'; sandbox" },
  });
}
