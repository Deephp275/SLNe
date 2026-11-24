'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

const QSTATUS = ['Pending', 'In Review', 'Sent', 'Accepted', 'Rejected'];

export default function Quotations() {
  const sb = supabaseBrowser();
  const [rows, setRows] = useState(null);
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function load() {
    const { data, error } = await sb.from('quotations')
      .select('*, enquiry:enquiries(reference,customer_name,phone,company,requirements,status, items:enquiry_items(product_name,quantity))')
      .order('created_at', { ascending: false });
    if (error) setErr(error.message);
    setRows(data || []);
  }
  useEffect(() => { load(); }, []); // eslint-disable-line

  async function save(e) {
    e.preventDefault(); setBusy(true); setErr('');
    const today = new Date().toISOString().slice(0, 10);
    const sent_at = edit.sent_at || (edit.status === 'Sent' ? today : null);
    const { error } = await sb.from('quotations').update({
      amount: edit.amount === '' || edit.amount == null ? null : Number(edit.amount), notes: edit.notes || null, status: edit.status, sent_at,
    }).eq('id', edit.id);
    if (!error && edit.status === 'Sent' && ['New', 'Contacted'].includes(edit.enquiry?.status)) {
      await sb.from('enquiries').update({ status: 'Quotation Sent' }).eq('id', edit.enquiry_id);
    }
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setEdit(null); load();
  }

  return (
    <div>
      <h1 className="font-display text-3xl">Quotations</h1>
      <p className="mt-2 text-sm text-cream/60">A quotation record is created automatically for every bulk enquiry.</p>
      {err && !edit && <p className="mt-3 text-sm text-red-300">{err}</p>}

      {edit && (
        <form onSubmit={save} className="card mt-6 space-y-5 p-6">
          <div><p className="font-mono text-xs text-gold-soft">{edit.enquiry?.reference}</p><h2 className="font-display text-xl">{edit.enquiry?.customer_name}{edit.enquiry?.company && ` — ${edit.enquiry.company}`}</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-cream/70">{edit.enquiry?.requirements}</p>
            {edit.enquiry?.items?.length > 0 && <ul className="mt-2 text-sm text-cream/70">{edit.enquiry.items.map((i, n) => <li key={n}>• {i.product_name} × {i.quantity}</li>)}</ul>}</div>
          <div className="grid gap-5 sm:grid-cols-3">
            <div><label className="label" htmlFor="am">Quotation amount (₹)</label><input id="am" type="number" min="0" step="any" className="input" value={edit.amount ?? ''} onChange={(e) => setEdit({ ...edit, amount: e.target.value })} /></div>
            <div><label className="label" htmlFor="qs">Status</label><select id="qs" className="input" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>{QSTATUS.map((s) => <option key={s}>{s}</option>)}</select></div>
            <div><label className="label" htmlFor="sd">Quotation sent date</label><input id="sd" type="date" className="input" value={edit.sent_at || ''} onChange={(e) => setEdit({ ...edit, sent_at: e.target.value })} /></div>
          </div>
          <div><label className="label" htmlFor="nt">Notes</label><textarea id="nt" rows={3} className="input" value={edit.notes || ''} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></div>
          {err && <p className="text-sm text-red-300">{err}</p>}
          <div className="flex gap-3"><button className="btn-gold btn-sm" disabled={busy}>{busy ? 'Saving…' : 'Save quotation'}</button><button type="button" className="btn-outline btn-sm" onClick={() => setEdit(null)}>Cancel</button></div>
        </form>
      )}

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gold/20 text-xs uppercase tracking-wider text-cream/60"><tr><th className="p-3">Ref</th><th className="p-3">Customer</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3">Sent</th><th className="p-3" /></tr></thead>
          <tbody>
            {rows === null && <tr><td className="p-6 text-cream/65" colSpan="6">Loading…</td></tr>}
            {rows && !rows.length && <tr><td className="p-6 text-cream/65" colSpan="6">No quotation requests yet.</td></tr>}
            {rows?.map((r) => (
              <tr key={r.id} className="border-b border-gold/10 last:border-0">
                <td className="p-3 font-mono text-xs">{r.enquiry?.reference}</td><td className="p-3">{r.enquiry?.customer_name}</td>
                <td className="p-3">{r.amount != null ? `₹${Number(r.amount).toLocaleString('en-IN')}` : '—'}</td>
                <td className="p-3">{r.status}</td><td className="p-3 text-cream/60">{r.sent_at || '—'}</td>
                <td className="p-3 text-right"><button className="text-gold-soft hover:underline" onClick={() => { setErr(''); setEdit(r); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Review</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
