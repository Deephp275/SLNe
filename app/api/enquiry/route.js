import { NextResponse } from 'next/server';
import { supabasePublic } from '@/lib/supabase/server';
import { submitEnquiry } from '@/lib/local/engine';
import { sameOrigin, isJson, allow, clientIp } from '@/lib/local/security';

const req = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;

const strip = (v) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '') : v);

export async function POST(request) {
  // Only this site's own forms may post here, as JSON, from a limited number of requests per visitor
  if (!sameOrigin(request) || !isJson(request)) return NextResponse.json({ error: 'Request blocked' }, { status: 403 });
  if (!allow(`enq:${clientIp(request)}`, 8, 10 * 60 * 1000) || !allow('enq:all', 300, 60 * 60 * 1000)) return NextResponse.json({ error: 'Too many enquiries. Please try again later or call us.' }, { status: 429 });
  let b;
  try {
    const raw = await request.text();
    if (raw.length > 60000) return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    b = JSON.parse(raw);
  } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }
  if (!b || typeof b !== 'object' || Array.isArray(b)) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  if (b.website) return NextResponse.json({ reference: 'SLN-OK' }); // honeypot: bots fill this
  for (const k of Object.keys(b)) b[k] = strip(b[k]);

  const errors = {};
  if (!req(b.customer_name, 120)) errors.customer_name = 'Please enter your name';
  if (!req(b.phone, 30) || b.phone.replace(/\D/g, '').length < 7) errors.phone = 'Please enter a valid phone number';
  if (!req(b.requirements, 4000)) errors.requirements = 'Please describe your requirements';
  if (b.email && !/^\S+@\S+\.\S+$/.test(b.email)) errors.email = 'Please enter a valid email';
  if (Object.keys(errors).length) return NextResponse.json({ error: 'Validation failed', errors }, { status: 422 });

  const sb = supabasePublic();

  const items = (Array.isArray(b.items) ? b.items : []).slice(0, 30).map((i) => ({
    product_id: i.product_id || '', product_name: String(i.product_name || '').slice(0, 200),
    quantity: String(i.quantity || '').slice(0, 80), notes: String(i.notes || '').slice(0, 500),
  }));
  const payload = { ...b, items };
  delete payload.website;

  // Local-only mode (no Supabase keys): save to data/db.json
  const { data: reference, error } = sb ? await sb.rpc('submit_enquiry', { payload }) : { data: submitEnquiry(payload), error: null };
  if (error) { console.error(error.message); return NextResponse.json({ error: 'Could not save your enquiry. Please try again.' }, { status: 500 }); }

  // Notify the business (configurable webhook – Slack/Discord/Zapier/Make etc.). Failure must not fail the enquiry.
  const hook = process.env.ENQUIRY_WEBHOOK_URL;
  if (hook) {
    const text = `New enquiry ${reference}\n${b.customer_name} (${b.phone})${b.company ? ` – ${b.company}` : ''}\n${b.requirements}\n` +
      items.map((i) => `• ${i.product_name} × ${i.quantity}`).join('\n');
    try {
      await fetch(hook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, content: text, reference, ...b, items }) });
    } catch (e) { console.error('webhook failed', e.message); }
  }
  return NextResponse.json({ reference });
}
