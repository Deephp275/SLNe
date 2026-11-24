'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { waLink } from '@/lib/utils';

const CATS = ['Plywood', 'Laminates', 'Timber', 'Multiple / Other'];
const blank = { customer_name: '', phone: '', company: '', email: '', category: '', requirements: '', quantity: '', dimensions: '', delivery_location: '', message: '' };

export default function QuotationForm({ settings }) {
  const [f, setF] = useState(blank);
  const [items, setItems] = useState([{ product_id: '', product_name: '', quantity: '', notes: '' }]);
  const [errors, setErrors] = useState({});
  const [state, setState] = useState('idle'); // idle | sending | done
  const [ref, setRef] = useState('');
  const [serverErr, setServerErr] = useState('');

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('product')) setItems([{ product_id: p.get('pid') || '', product_name: p.get('product'), quantity: p.get('qty') || '', notes: '' }]);
  }, []);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setItem = (i, k, v) => setItems(items.map((it, n) => (n === i ? { ...it, [k]: v } : it)));

  async function submit(e) {
    e.preventDefault();
    setServerErr('');
    const er = {};
    if (!f.customer_name.trim()) er.customer_name = 'Required';
    if (f.phone.replace(/\D/g, '').length < 7) er.phone = 'Enter a valid phone number';
    if (!f.requirements.trim()) er.requirements = 'Required';
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) er.email = 'Enter a valid email';
    setErrors(er);
    if (Object.keys(er).length) return;
    setState('sending');
    try {
      const res = await fetch('/api/enquiry', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, website: e.target.website.value, items: items.filter((i) => i.product_name.trim()) }) });
      const data = await res.json();
      if (!res.ok) { setErrors(data.errors || {}); setServerErr(data.error || 'Something went wrong'); setState('idle'); return; }
      setRef(data.reference); setState('done');
    } catch { setServerErr('Network error. Please try again.'); setState('idle'); }
  }

  if (state === 'done') {
    const wa = waLink(settings.whatsapp_number, `Hello ${settings.business_name}, I have submitted quotation request ${ref}.`);
    return (
      <div className="card mt-10 p-10 text-center" role="status">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-gold text-2xl text-gold">✓</div>
        <h2 className="h-display mt-5 text-2xl">Thank you! Your enquiry has been received.</h2>
        <p className="mt-3 text-cream/70">Your reference number</p>
        <p className="mt-1 font-display text-3xl tracking-wider text-gold-soft">{ref}</p>
        <p className="mt-4 text-sm text-cream/60">We will contact you soon on the phone number you provided.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-wa">Message us on WhatsApp</a>}
          <Link href="/products" className="btn-outline">Continue Browsing</Link>
        </div>
      </div>
    );
  }

  const err = (k) => (errors[k] ? <p className="mt-1 text-xs text-red-300" role="alert">{errors[k]}</p> : null);
  return (
    <form onSubmit={submit} noValidate className="mt-10 space-y-8">
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <fieldset className="card grid gap-5 p-6 sm:grid-cols-2">
        <legend className="eyebrow px-2">Your details</legend>
        <div><label className="label" htmlFor="n">Customer name *</label><input id="n" className="input" value={f.customer_name} onChange={set('customer_name')} autoComplete="name" />{err('customer_name')}</div>
        <div><label className="label" htmlFor="p">Phone number *</label><input id="p" className="input" type="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" />{err('phone')}</div>
        <div><label className="label" htmlFor="co">Company name</label><input id="co" className="input" value={f.company} onChange={set('company')} autoComplete="organization" /></div>
        <div><label className="label" htmlFor="e">Email</label><input id="e" className="input" type="email" value={f.email} onChange={set('email')} autoComplete="email" />{err('email')}</div>
      </fieldset>

      <fieldset className="card space-y-5 p-6">
        <legend className="eyebrow px-2">Your requirement</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <div><label className="label" htmlFor="cat">Product category</label>
            <select id="cat" className="input" value={f.category} onChange={set('category')}><option value="">Select…</option>{CATS.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label className="label" htmlFor="loc">Delivery location</label><input id="loc" className="input" value={f.delivery_location} onChange={set('delivery_location')} /></div>
          <div><label className="label" htmlFor="q">Overall quantity</label><input id="q" className="input" value={f.quantity} onChange={set('quantity')} placeholder="e.g. 100 sheets" /></div>
          <div><label className="label" htmlFor="d">Dimensions</label><input id="d" className="input" value={f.dimensions} onChange={set('dimensions')} placeholder="e.g. 8 x 4 ft, 18 mm" /></div>
        </div>
        <div><label className="label" htmlFor="r">Product requirements *</label><textarea id="r" rows={4} className="input" value={f.requirements} onChange={set('requirements')} placeholder="Describe what you need…" />{err('requirements')}</div>
        <div><label className="label" htmlFor="msg">Additional message</label><textarea id="msg" rows={3} className="input" value={f.message} onChange={set('message')} /></div>
      </fieldset>

      <fieldset className="card p-6">
        <legend className="eyebrow px-2">Products (optional – add several)</legend>
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="grid gap-3 sm:grid-cols-[2fr_1fr_2fr_auto]">
              <input className="input" aria-label="Product name" placeholder="Product name" value={it.product_name} onChange={(e) => setItem(i, 'product_name', e.target.value)} />
              <input className="input" aria-label="Quantity" placeholder="Qty" value={it.quantity} onChange={(e) => setItem(i, 'quantity', e.target.value)} />
              <input className="input" aria-label="Notes" placeholder="Size / notes" value={it.notes} onChange={(e) => setItem(i, 'notes', e.target.value)} />
              <button type="button" className="btn-outline btn-sm" aria-label="Remove product" disabled={items.length === 1} onClick={() => setItems(items.filter((_, n) => n !== i))}>✕</button>
            </div>
          ))}
        </div>
        <button type="button" className="mt-4 text-sm text-gold-soft underline underline-offset-4" onClick={() => setItems([...items, { product_id: '', product_name: '', quantity: '', notes: '' }])}>+ Add another product</button>
      </fieldset>

      {serverErr && <p className="rounded-sm border border-red-400/40 p-4 text-sm text-red-300" role="alert">{serverErr}</p>}
      <button className="btn-gold w-full sm:w-auto" disabled={state === 'sending'}>{state === 'sending' ? 'Submitting…' : 'Submit Quotation Request'}</button>
    </form>
  );
}
