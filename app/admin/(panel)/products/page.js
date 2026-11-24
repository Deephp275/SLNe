'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { slugify, AVAILABILITY } from '@/lib/utils';
import { uploadImage } from '@/lib/admin';

const EMPTY = { name: '', sku: '', slug: '', category_id: '', brand_id: '', description: '', dimensions: '', thickness: '',
  availability: 'on_request', stock_quantity: '', is_published: false, is_featured: false };

export default function AdminProducts() {
  const sb = supabaseBrowser();
  const [rows, setRows] = useState(null);
  const [cats, setCats] = useState([]);
  const [brands, setBrands] = useState([]);
  const [q, setQ] = useState('');
  const [form, setForm] = useState(null); // product being edited
  const [images, setImages] = useState([]);
  const [specs, setSpecs] = useState([]);
  const [variants, setVariants] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function load() {
    const { data, error } = await sb.from('products')
      .select('*, category:categories(name), brand:brands(name), images:product_images(url,sort_order)').order('created_at', { ascending: false });
    if (error) setErr(error.message);
    setRows(data || []);
  }
  useEffect(() => {
    load();
    sb.from('categories').select('id,name,parent_id').order('sort_order').then(({ data }) => setCats(data || []));
    sb.from('brands').select('id,name').order('name').then(({ data }) => setBrands(data || []));
  }, []); // eslint-disable-line

  async function open(p) {
    setErr('');
    if (!p) { setForm({ ...EMPTY }); setImages([]); setSpecs([{ spec_key: '', spec_value: '' }]); setVariants([{ label: '' }]); }
    else {
      const vr = await sb.from('product_variants').select('*').eq('product_id', p.id).order('sort_order');
      setVariants(vr.data?.length ? vr.data.map((v) => ({ label: v.label })) : [{ label: '' }]);
      const [im, sp] = await Promise.all([
        sb.from('product_images').select('*').eq('product_id', p.id).order('sort_order'),
        sb.from('product_specifications').select('*').eq('product_id', p.id).order('sort_order'),
      ]);
      setForm({ ...EMPTY, ...p, stock_quantity: p.stock_quantity ?? '' });
      setImages(im.data || []); setSpecs(sp.data?.length ? sp.data : [{ spec_key: '', spec_value: '' }]);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function addImages(e) {
    setErr(''); setBusy(true);
    try {
      for (const file of e.target.files) {
        const url = await uploadImage(file, 'products');
        setImages((p) => [...p, { url, alt: '' }]);
      }
    } catch (x) { setErr(x.message); }
    setBusy(false); e.target.value = '';
  }
  const move = (i, d) => setImages((p) => { const a = [...p]; const j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; });

  async function save(e) {
    e.preventDefault(); setBusy(true); setErr('');
    const f = form;
    const payload = {
      name: f.name.trim(), sku: f.sku?.trim() || null, slug: slugify(f.slug || f.name),
      category_id: f.category_id || null, brand_id: f.brand_id || null,
      description: f.description || null, dimensions: f.dimensions || null, thickness: f.thickness || null,
      availability: f.availability,
      stock_quantity: f.stock_quantity === '' ? null : Number(f.stock_quantity),
      is_published: !!f.is_published, is_featured: !!f.is_featured,
    };
    let id = f.id;
    const res = id ? await sb.from('products').update(payload).eq('id', id) : await sb.from('products').insert(payload).select('id').single();
    if (res.error) { setErr(res.error.message); setBusy(false); return; }
    if (!id) id = res.data.id;

    // Replace images and specifications with the current lists
    await sb.from('product_images').delete().eq('product_id', id);
    if (images.length) {
      const { error } = await sb.from('product_images').insert(images.map((im, i) => ({ product_id: id, url: im.url, alt: im.alt || payload.name, sort_order: i })));
      if (error) { setErr(error.message); setBusy(false); return; }
    }
    await sb.from('product_specifications').delete().eq('product_id', id);
    const cleanSpecs = specs.filter((s) => s.spec_key.trim() && s.spec_value.trim());
    if (cleanSpecs.length) {
      const { error } = await sb.from('product_specifications').insert(cleanSpecs.map((s, i) => ({ product_id: id, spec_key: s.spec_key.trim(), spec_value: s.spec_value.trim(), sort_order: i })));
      if (error) { setErr(error.message); setBusy(false); return; }
    }
    await sb.from('product_variants').delete().eq('product_id', id);
    const cleanVars = variants.filter((v) => v.label.trim());
    if (cleanVars.length) {
      const { error } = await sb.from('product_variants').insert(cleanVars.map((v, i) => ({
        product_id: id, label: v.label.trim(), price: null, unit: null, sort_order: i })));
      if (error) { setErr(error.message); setBusy(false); return; }
    }
    setBusy(false); setForm(null); load();
  }

  async function del(p) {
    if (!confirm(`Delete "${p.name}" permanently? This cannot be undone.`)) return;
    const { error } = await sb.from('products').delete().eq('id', p.id);
    if (error) setErr(error.message); else load();
  }
  async function toggle(p) {
    const { error } = await sb.from('products').update({ is_published: !p.is_published }).eq('id', p.id);
    if (error) setErr(error.message); else load();
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const tops = cats.filter((c) => !c.parent_id);
  const shown = (rows || []).filter((r) => (r.name + (r.sku || '') + (r.brand?.name || '')).toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between"><h1 className="font-display text-3xl">Products</h1><button className="btn-gold btn-sm" onClick={() => open(null)}>+ Add product</button></div>
      {err && !form && <p className="mt-4 text-sm text-red-300">{err}</p>}

      {form && (
        <form onSubmit={save} className="card mt-6 space-y-6 p-6">
          <h2 className="font-display text-xl">{form.id ? 'Edit product' : 'New product'}</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <div><label className="label" htmlFor="pn">Product name *</label><input id="pn" required className="input" value={form.name} onChange={set('name')} /></div>
            <div><label className="label" htmlFor="ps">SKU</label><input id="ps" className="input" value={form.sku || ''} onChange={set('sku')} /></div>
            <div><label className="label" htmlFor="pc">Category</label>
              <select id="pc" className="input" value={form.category_id || ''} onChange={set('category_id')}><option value="">— none —</option>
                {tops.map((t) => (<optgroup key={t.id} label={t.name}><option value={t.id}>{t.name} (general)</option>{cats.filter((c) => c.parent_id === t.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>))}
              </select></div>
            <div><label className="label" htmlFor="pb">Brand</label>
              <select id="pb" className="input" value={form.brand_id || ''} onChange={set('brand_id')}><option value="">— none —</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
            <div><label className="label" htmlFor="pd">Dimensions / sizes</label><input id="pd" className="input" placeholder="e.g. 8 x 4 ft" value={form.dimensions || ''} onChange={set('dimensions')} /></div>
            <div><label className="label" htmlFor="pt">Thickness</label><input id="pt" className="input" placeholder="e.g. 18 mm" value={form.thickness || ''} onChange={set('thickness')} /></div>
            <div><label className="label" htmlFor="pa">Availability</label>
              <select id="pa" className="input" value={form.availability} onChange={set('availability')}>{Object.entries(AVAILABILITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
            <div><label className="label" htmlFor="pq">Stock quantity (optional)</label><input id="pq" type="number" min="0" className="input" value={form.stock_quantity} onChange={set('stock_quantity')} /></div>            <div><label className="label" htmlFor="pl">URL slug (auto if empty)</label><input id="pl" className="input" value={form.slug || ''} onChange={set('slug')} /></div>
          </div>
          <div><label className="label" htmlFor="pdesc">Description</label><textarea id="pdesc" rows={4} className="input" value={form.description || ''} onChange={set('description')} /></div>

          <div>
            <span className="label">Available thickness / sizes (e.g. 19 mm, 12 mm or 3&quot; x 2&quot;)</span>
            <div className="space-y-2">
              {variants.map((v, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto] gap-2">
                  <input className="input" aria-label="Thickness or size" placeholder='19 mm or 3" x 2"' value={v.label} onChange={(e) => setVariants(variants.map((x, n) => (n === i ? { label: e.target.value } : x)))} />
                  <button type="button" className="btn-outline btn-sm" onClick={() => setVariants(variants.filter((_, n) => n !== i))} aria-label="Remove">✕</button>
                </div>
              ))}
            </div>
            <button type="button" className="mt-3 text-sm text-gold-soft underline" onClick={() => setVariants([...variants, { label: '' }])}>+ Add option</button>
          </div>

          <div>
            <span className="label">Specifications (e.g. Grade, Core, Finish, Material)</span>
            <div className="space-y-2">
              {specs.map((s, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <input className="input" aria-label="Specification name" placeholder="Name" value={s.spec_key} onChange={(e) => setSpecs(specs.map((x, n) => (n === i ? { ...x, spec_key: e.target.value } : x)))} />
                  <input className="input" aria-label="Specification value" placeholder="Value" value={s.spec_value} onChange={(e) => setSpecs(specs.map((x, n) => (n === i ? { ...x, spec_value: e.target.value } : x)))} />
                  <button type="button" className="btn-outline btn-sm" onClick={() => setSpecs(specs.filter((_, n) => n !== i))} aria-label="Remove">✕</button>
                </div>
              ))}
            </div>
            <button type="button" className="mt-3 text-sm text-gold-soft underline" onClick={() => setSpecs([...specs, { spec_key: '', spec_value: '' }])}>+ Add specification</button>
          </div>

          <div>
            <span className="label">Photos (first photo is the main one)</span>
            <div className="flex flex-wrap gap-3">
              {images.map((im, i) => (
                <div key={im.url} className="w-28 text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={im.url} alt="" className="h-28 w-28 border border-gold/25 object-cover" />
                  <div className="mt-1 flex justify-between text-xs"><button type="button" onClick={() => move(i, -1)} aria-label="Move left">←</button><button type="button" className="text-red-300" onClick={() => setImages(images.filter((_, n) => n !== i))}>Remove</button><button type="button" onClick={() => move(i, 1)} aria-label="Move right">→</button></div>
                </div>
              ))}
              <label className="grid h-28 w-28 cursor-pointer place-items-center border border-dashed border-gold/40 text-xs text-gold-soft hover:bg-walnut">{busy ? 'Uploading…' : '+ Upload'}<input type="file" accept="image/*" multiple className="hidden" onChange={addImages} disabled={busy} /></label>
            </div>
          </div>

          <div className="flex flex-wrap gap-6 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!form.is_published} onChange={set('is_published')} /> Published (visible on website)</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!form.is_featured} onChange={set('is_featured')} /> Featured on homepage</label>
          </div>
          {err && <p className="text-sm text-red-300" role="alert">{err}</p>}
          <div className="flex gap-3"><button className="btn-gold btn-sm" disabled={busy}>{busy ? 'Saving…' : 'Save product'}</button><button type="button" className="btn-outline btn-sm" onClick={() => setForm(null)}>Cancel</button></div>
        </form>
      )}

      <input className="input mt-6 max-w-sm" placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="card mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gold/20 text-xs uppercase tracking-wider text-cream/60"><tr><th className="p-3">Photo</th><th className="p-3">Name</th><th className="p-3">Category</th><th className="p-3">Brand</th><th className="p-3">Status</th><th className="p-3" /></tr></thead>
          <tbody>
            {rows === null && <tr><td className="p-6 text-cream/65" colSpan="6">Loading…</td></tr>}
            {rows && !shown.length && <tr><td className="p-6 text-cream/65" colSpan="6">No products yet. Click “Add product”.</td></tr>}
            {shown.map((p) => {
              const im = [...(p.images || [])].sort((a, b) => a.sort_order - b.sort_order)[0];
              return (
                <tr key={p.id} className="border-b border-gold/10 last:border-0">
                  <td className="p-3">{im ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={im.url} alt="" className="h-10 w-10 object-cover" /> : '—'}</td>
                  <td className="p-3">{p.name}<div className="text-xs text-cream/65">{p.sku}</div></td>
                  <td className="p-3">{p.category?.name || '—'}</td><td className="p-3">{p.brand?.name || '—'}</td>
                  <td className="p-3"><button onClick={() => toggle(p)} className={`rounded-full border px-2.5 py-0.5 text-xs ${p.is_published ? 'border-emerald-400/50 text-emerald-300' : 'border-cream/30 text-cream/65'}`}>{p.is_published ? 'Published' : 'Draft'}</button></td>
                  <td className="whitespace-nowrap p-3 text-right"><button className="mr-3 text-gold-soft hover:underline" onClick={() => open(p)}>Edit</button><button className="text-red-300 hover:underline" onClick={() => del(p)}>Delete</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
