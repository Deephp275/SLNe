'use client';
import { useState } from 'react';

export default function ContactForm() {
  const [f, setF] = useState({ customer_name: '', phone: '', requirements: '' });
  const [state, setState] = useState('idle');
  const [msg, setMsg] = useState('');
  async function submit(e) {
    e.preventDefault();
    if (!f.customer_name.trim() || f.phone.replace(/\D/g, '').length < 7 || !f.requirements.trim()) { setMsg('Please fill in your name, a valid phone number and a message.'); return; }
    setState('sending'); setMsg('');
    try {
      const res = await fetch('/api/enquiry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, category: 'General enquiry', website: e.target.website.value }) });
      const d = await res.json();
      if (!res.ok) { setMsg(d.error || 'Something went wrong'); setState('idle'); return; }
      setState('done'); setMsg(`Thank you! We have received your message. Reference: ${d.reference}`);
    } catch { setMsg('Network error. Please try again.'); setState('idle'); }
  }
  if (state === 'done') return <div className="card p-8 text-gold-soft" role="status">{msg}</div>;
  return (
    <form onSubmit={submit} noValidate className="card space-y-5 p-6">
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <h2 className="font-display text-2xl">Send us a message</h2>
      <div><label className="label" htmlFor="cn">Name *</label><input id="cn" className="input" value={f.customer_name} onChange={(e) => setF({ ...f, customer_name: e.target.value })} /></div>
      <div><label className="label" htmlFor="cp">Phone *</label><input id="cp" type="tel" className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
      <div><label className="label" htmlFor="cm">Message *</label><textarea id="cm" rows={5} className="input" value={f.requirements} onChange={(e) => setF({ ...f, requirements: e.target.value })} /></div>
      {msg && <p className="text-sm text-red-300" role="alert">{msg}</p>}
      <button className="btn-gold" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Send Message'}</button>
    </form>
  );
}
