'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { slugify } from '@/lib/utils';
import ImageField from './ImageField';

// Generic list + add/edit/delete screen for a simple table.
export default function Crud({ table, title, fields, columns, order = 'created_at', ascending = false }) {
  const sb = supabaseBrowser();
  const [rows, setRows] = useState(null);
  const [opts, setOpts] = useState({});
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function load() {
    const { data, error } = await sb.from(table).select('*').order(order, { ascending });
    if (error) setErr(error.message);
    setRows(data || []);
  }
  useEffect(() => {
    load();
    fields.forEach(async (f) => { if (typeof f.options === 'function') { const o = await f.options(sb); setOpts((p) => ({ ...p, [f.key]: o })); } });
  }, []); // eslint-disable-line

  async function save(e) {
    e.preventDefault(); setBusy(true); setErr('');
    const payload = {};
    fields.forEach((f) => {
      let v = edit[f.key];
      if (f.type === 'number') v = v === '' || v == null ? (f.nullable ? null : 0) : Number(v);
      else if (f.type === 'checkbox') v = !!v;
      else if (v === '' || v === undefined) v = f.required ? '' : null;
      payload[f.key] = v;
    });
    if ('slug' in payload && !payload.slug) payload.slug = slugify(payload.name || '');
    if ('slug' in payload) payload.slug = slugify(payload.slug);
    const q = edit.id ? sb.from(table).update(payload).eq('id', edit.id) : sb.from(table).insert(payload);
    const { error } = await q;
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setEdit(null); load();
  }
  async function del(row) {
    if (!confirm(`Delete "${row.name || row.caption || 'this item'}"? This cannot be undone.`)) return;
    const { error } = await sb.from(table).delete().eq('id', row.id);
    if (error) setErr(error.message); else load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">{title}</h1>
        <button className="btn-gold btn-sm" onClick={() => { setErr(''); setEdit({}); }}>+ Add</button>
      </div>
      {err && !edit && <p className="mt-4 text-sm text-red-300">{err}</p>}

      {edit && (
        <form onSubmit={save} className="card mt-6 grid gap-5 p-6 sm:grid-cols-2">
          {fields.map((f) => f.type === 'image' ? (
            <div key={f.key} className="sm:col-span-2"><ImageField label={f.label} folder={table} value={edit[f.key]} onChange={(v) => setEdit({ ...edit, [f.key]: v })} /></div>
          ) : (
            <div key={f.key} className={f.type === 'textarea' ? 'sm:col-span-2' : f.type === 'checkbox' ? 'flex items-center gap-2 pt-6' : ''}>
              {f.type === 'checkbox' ? (
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!edit[f.key]} onChange={(e) => setEdit({ ...edit, [f.key]: e.target.checked })} /> {f.label}</label>
              ) : (<>
                <label className="label" htmlFor={f.key}>{f.label}{f.required && ' *'}</label>
                {f.type === 'textarea' ? <textarea id={f.key} rows={3} className="input" value={edit[f.key] ?? ''} onChange={(e) => setEdit({ ...edit, [f.key]: e.target.value })} required={f.required} />
                : f.type === 'select' ? (
                  <select id={f.key} className="input" value={edit[f.key] ?? ''} onChange={(e) => setEdit({ ...edit, [f.key]: e.target.value })} required={f.required}>
                    <option value="">{f.placeholder || '— none —'}</option>
                    {(Array.isArray(f.options) ? f.options : opts[f.key] || []).filter((o) => o.value !== edit.id).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : <input id={f.key} type={f.type === 'number' ? 'number' : 'text'} step="any" className="input" value={edit[f.key] ?? ''} onChange={(e) => setEdit({ ...edit, [f.key]: e.target.value })} required={f.required} placeholder={f.placeholder} />}
              </>)}
            </div>
          ))}
          {err && <p className="text-sm text-red-300 sm:col-span-2">{err}</p>}
          <div className="flex gap-3 sm:col-span-2">
            <button className="btn-gold btn-sm" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            <button type="button" className="btn-outline btn-sm" onClick={() => setEdit(null)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gold/20 text-xs uppercase tracking-wider text-cream/60"><tr>{columns.map((c) => <th key={c.label} className="p-3">{c.label}</th>)}<th className="p-3" /></tr></thead>
          <tbody>
            {rows === null && <tr><td className="p-6 text-cream/65" colSpan={columns.length + 1}>Loading…</td></tr>}
            {rows?.length === 0 && <tr><td className="p-6 text-cream/65" colSpan={columns.length + 1}>Nothing here yet. Click “Add”.</td></tr>}
            {rows?.map((r) => (
              <tr key={r.id} className="border-b border-gold/10 last:border-0">
                {columns.map((c) => <td key={c.label} className="p-3">{c.render ? c.render(r, opts) : r[c.key]}</td>)}
                <td className="whitespace-nowrap p-3 text-right">
                  <button className="mr-3 text-gold-soft hover:underline" onClick={() => { setErr(''); setEdit({ ...r }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Edit</button>
                  <button className="text-red-300 hover:underline" onClick={() => del(r)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
