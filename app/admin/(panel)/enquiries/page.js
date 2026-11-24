'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { cleanPhone } from '@/lib/utils';

const STATUSES = ['New', 'Contacted', 'Quotation Sent', 'Negotiation', 'Converted', 'Closed'];

export default function Enquiries() {
  const sb = supabaseBrowser();
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState('');
  const [sel, setSel] = useState(null);
  const [err, setErr] = useState('');

  async function load() {
    const { data, error } = await sb.from('enquiries').select('*, items:enquiry_items(*)').order('created_at', { ascending: false });
    if (error) setErr(error.message);
    setRows(data || []);
  }
  useEffect(() => { load(); }, []); // eslint-disable-line

  async function setStatus(e, status) {
    const { error } = await sb.from('enquiries').update({ status }).eq('id', e.id);
    if (error) { setErr(error.message); return; }
    setSel({ ...sel, status }); load();
  }
  async function del(e) {
    if (!confirm(`Delete enquiry ${e.reference} permanently?`)) return;
    const { error } = await sb.from('enquiries').delete().eq('id', e.id);
    if (error) setErr(error.message); else { setSel(null); load(); }
  }
  const shown = (rows || []).filter((r) => !filter || r.status === filter);
  const wa = (e) => `https://wa.me/${cleanPhone(e.phone)}?text=${encodeURIComponent(`Hello ${e.customer_name}, thank you for your enquiry ${e.reference}.`)}`;

  return (
    <div>
      <h1 className="font-display text-3xl">Enquiries</h1>
      {err && <p className="mt-3 text-sm text-red-300">{err}</p>}
      <div className="mt-6 flex flex-wrap gap-2">
        {['', ...STATUSES].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-full border px-3 py-1 text-xs ${filter === s ? 'border-gold bg-gold text-ink' : 'border-gold/30 text-cream/75'}`}>{s || 'All'}</button>
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gold/20 text-xs uppercase tracking-wider text-cream/60"><tr><th className="p-3">Ref</th><th className="p-3">Customer</th><th className="p-3">Status</th><th className="p-3">Date</th></tr></thead>
            <tbody>
              {rows === null && <tr><td className="p-6 text-cream/65" colSpan="4">Loading…</td></tr>}
              {rows && !shown.length && <tr><td className="p-6 text-cream/65" colSpan="4">No enquiries.</td></tr>}
              {shown.map((r) => (
                <tr key={r.id} onClick={() => setSel(r)} className={`cursor-pointer border-b border-gold/10 hover:bg-walnut/50 ${sel?.id === r.id ? 'bg-walnut/60' : ''}`}>
                  <td className="p-3 font-mono text-xs">{r.reference}</td><td className="p-3">{r.customer_name}</td>
                  <td className="p-3"><span className={r.status === 'New' ? 'text-gold-soft' : 'text-cream/70'}>{r.status}</span></td>
                  <td className="p-3 text-cream/65">{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sel ? (
          <div className="card space-y-5 p-6">
            <div className="flex items-start justify-between gap-3">
              <div><p className="font-mono text-xs text-gold-soft">{sel.reference}</p><h2 className="font-display text-2xl">{sel.customer_name}</h2><p className="text-xs text-cream/65">{new Date(sel.created_at).toLocaleString()}</p></div>
              <button onClick={() => setSel(null)} className="text-cream/65" aria-label="Close">✕</button>
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {[['Phone', sel.phone], ['Email', sel.email], ['Company', sel.company], ['Category', sel.category], ['Quantity', sel.quantity], ['Dimensions', sel.dimensions], ['Delivery location', sel.delivery_location]]
                .filter(([, v]) => v).map(([k, v]) => <div key={k}><dt className="label">{k}</dt><dd>{v}</dd></div>)}
            </dl>
            <div><p className="label">Requirements</p><p className="whitespace-pre-line text-sm">{sel.requirements}</p></div>
            {sel.message && <div><p className="label">Message</p><p className="whitespace-pre-line text-sm">{sel.message}</p></div>}
            {sel.items?.length > 0 && (
              <div><p className="label">Products requested</p>
                <ul className="divide-y divide-gold/10 border border-gold/15 text-sm">{sel.items.map((i) => <li key={i.id} className="flex justify-between gap-3 p-2.5"><span>{i.product_name}{i.notes && <span className="text-cream/65"> — {i.notes}</span>}</span><span className="text-gold-soft">{i.quantity}</span></li>)}</ul></div>
            )}
            <div><label className="label" htmlFor="st">Status</label>
              <select id="st" className="input" value={sel.status} onChange={(e) => setStatus(sel, e.target.value)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
            <div className="flex flex-wrap gap-3">
              <a className="btn-wa btn-sm" href={wa(sel)} target="_blank" rel="noopener noreferrer">Contact on WhatsApp</a>
              <a className="btn-outline btn-sm" href={`tel:${sel.phone}`}>Call</a>
              {sel.email && <a className="btn-outline btn-sm" href={`mailto:${sel.email}`}>Email</a>}
              <button className="btn-outline btn-sm !border-red-400/50 !text-red-300" onClick={() => del(sel)}>Delete</button>
            </div>
          </div>
        ) : <div className="card hidden p-10 text-center text-cream/65 xl:block">Select an enquiry to view details</div>}
      </div>
    </div>
  );
}
