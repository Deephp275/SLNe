'use client';
import { useEffect, useMemo, useState } from 'react';
import ProductCard from '@/components/ProductCard';

export default function ProductsExplorer({ products, categories, brands, settings }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [brand, setBrand] = useState('');
  const [thick, setThick] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setCat(p.get('category') || ''); setBrand(p.get('brand') || ''); setQ(p.get('q') || '');
    setReady(true);
  }, []);

  const tops = categories.filter((c) => !c.parent_id);
  const catObj = categories.find((c) => c.slug === cat);
  const topOf = (p) => (p.category?.parent_id ? p.category.parent_id : p.category?.id);
  // When a section (e.g. Plywood) is chosen, the filters only offer options from that section
  const activeTop = catObj ? categories.find((c) => c.id === (catObj.parent_id || catObj.id)) : null;
  const scope = useMemo(() => (activeTop ? products.filter((p) => topOf(p) === activeTop.id) : products), [products, activeTop]); // eslint-disable-line
  const scopeBrands = brands.filter((b) => scope.some((p) => p.brand?.id === b.id));
  const thicknesses = useMemo(() => [...new Set(scope.flatMap((p) => [p.thickness, ...(p.variants || []).map((v) => v.label)]).filter(Boolean))]
    .sort((a, b) => parseFloat(a) - parseFloat(b) || a.localeCompare(b)), [scope]);

  const shown = products.filter((p) => {
    if (catObj && !(p.category?.slug === catObj.slug || p.category?.parent_id === catObj.id)) return false;
    if (brand && p.brand?.slug !== brand) return false;
    if (thick && p.thickness !== thick && !(p.variants || []).some((v) => v.label === thick)) return false;
    if (q) {
      const hay = [p.name, p.sku, p.description, p.brand?.name, p.category?.name, ...(p.specs || []).map((s) => s.spec_value)].join(' ').toLowerCase();
      if (!q.toLowerCase().split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    return true;
  });
  const reset = () => { setQ(''); setCat(''); setBrand(''); setThick(''); };
  const active = q || cat || brand || thick;
  const subs = catObj ? categories.filter((c) => c.parent_id === (catObj.parent_id || catObj.id)) : [];
  const parentSlug = catObj ? (catObj.parent_id ? categories.find((c) => c.id === catObj.parent_id)?.slug : catObj.slug) : '';

  const grid = (list) => (
    <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {list.map((p) => <ProductCard key={p.id} product={p} settings={settings} />)}
    </div>
  );

  return (
    <div className="mt-10">
      <div className="card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="label" htmlFor="s">Search</label>
          <input id="s" className="input" placeholder="Name, brand…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="c">Category</label>
          <select id="c" className="input" value={cat} onChange={(e) => { setCat(e.target.value); setBrand(''); setThick(''); }}>
            <option value="">All categories</option>
            {(activeTop ? [activeTop] : tops).map((t) => (
              <optgroup key={t.id} label={t.name}>
                <option value={t.slug}>All {t.name}</option>
                {categories.filter((c) => c.parent_id === t.id).map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        {scopeBrands.length > 0 && <div>
          <label className="label" htmlFor="b">Brand</label>
          <select id="b" className="input" value={brand} onChange={(e) => setBrand(e.target.value)}>
            <option value="">All brands</option>
            {scopeBrands.map((b) => <option key={b.id} value={b.slug}>{b.name}</option>)}
          </select>
        </div>}
        {thicknesses.length > 0 && <div>
          <label className="label" htmlFor="t">Thickness / Size</label>
          <select id="t" className="input" value={thick} onChange={(e) => setThick(e.target.value)}>
            <option value="">Any</option>{thicknesses.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>}
      </div>

      {subs.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          <button onClick={() => setCat(parentSlug)} className={`rounded-full border px-4 py-1.5 text-xs uppercase tracking-wider transition ${cat === parentSlug ? 'border-gold bg-gold text-ink' : 'border-gold/30 text-cream/75 hover:border-gold'}`}>All</button>
          {subs.map((c) => (
            <button key={c.id} onClick={() => setCat(c.slug)} className={`rounded-full border px-4 py-1.5 text-xs uppercase tracking-wider transition ${cat === c.slug ? 'border-gold bg-gold text-ink' : 'border-gold/30 text-cream/75 hover:border-gold'}`}>{c.name}</button>
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between text-sm text-cream/60">
        <span>{ready ? `${shown.length} product${shown.length === 1 ? '' : 's'}` : ' '}</span>
        {active && <button onClick={reset} className="text-gold-soft underline underline-offset-4">Clear filters</button>}
      </div>

      {!shown.length ? (
        <div className="card mt-6 p-12 text-center text-cream/60">
          {products.length ? 'No products match your filters.' : 'The catalogue is being set up. Please check back soon or send us an enquiry.'}
        </div>
      ) : active ? grid(shown) : (
        // Showroom view: one section per category
        tops.map((t) => {
          const list = shown.filter((p) => topOf(p) === t.id);
          if (!list.length) return null;
          return (
            <section key={t.id} id={t.slug} className="mt-14 scroll-mt-28">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div><p className="eyebrow">{t.name}</p><h2 className="h-display mt-2 text-2xl sm:text-3xl">{t.name} Collection</h2></div>
                {t.description && <p className="max-w-md text-sm text-cream/60">{t.description}</p>}
              </div>
              <div className="gold-rule mt-4" />
              {grid(list)}
            </section>
          );
        })
      )}
    </div>
  );
}
