'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function Inventory() {
  const sb = supabaseBrowser();
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');
  useEffect(() => { sb.from('products').select('id,name,sku,availability,stock_quantity').order('name').then(({ data }) => setRows(data || [])); }, []); // eslint-disable-line
  async function patch(id, change) {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...change } : x)));
    const { error } = await sb.from('products').update(change).eq('id', id);
    setMsg(error ? error.message : 'Saved');
    setTimeout(() => setMsg(''), 1800);
  }
  const shown = (rows || []).filter((r) => (r.name + (r.sku || '')).toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="font-display text-3xl">Inventory</h1><span className="text-sm text-gold-soft">{msg}</span></div>
      <input className="input mt-6 max-w-sm" placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-gold/20 text-left text-xs uppercase tracking-wider text-cream/60"><tr><th className="p-3">Product</th><th className="p-3">SKU</th><th className="p-3">Availability</th><th className="p-3">Stock qty</th></tr></thead>
          <tbody>
            {rows === null && <tr><td className="p-6 text-cream/65" colSpan="4">Loading…</td></tr>}
            {rows && !shown.length && <tr><td className="p-6 text-cream/65" colSpan="4">No products.</td></tr>}
            {shown.map((r) => (
              <tr key={r.id} className="border-b border-gold/10 last:border-0">
                <td className="p-3">{r.name}</td><td className="p-3 text-cream/60">{r.sku || '—'}</td>
                <td className="p-3"><select className="input !py-1.5" value={r.availability} onChange={(e) => patch(r.id, { availability: e.target.value })}>
                  <option value="in_stock">In Stock</option><option value="out_of_stock">Out of Stock</option><option value="on_request">Available on Request</option></select></td>
                <td className="p-3"><input type="number" min="0" className="input !w-28 !py-1.5" defaultValue={r.stock_quantity ?? ''} placeholder="n/a"
                  onBlur={(e) => { const v = e.target.value === '' ? null : Number(e.target.value); if (v !== r.stock_quantity) patch(r.id, { stock_quantity: v }); }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
