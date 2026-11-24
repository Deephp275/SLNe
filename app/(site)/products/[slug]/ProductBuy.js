'use client';
import { useState } from 'react';
import Link from 'next/link';
import WhatsAppButton from '@/components/WhatsAppButton';
import { sortVariants } from '@/lib/sort';

const SIZE_CATS = ['silver-cut-size', 'timber'];

export default function ProductBuy({ product, settings }) {
  const variants = sortVariants(product.variants);
  const isSize = SIZE_CATS.includes(product.category?.slug);
  const [vid, setVid] = useState('');
  const [qty, setQty] = useState('');
  const [msg, setMsg] = useState('');
  const variant = variants.find((v) => v.id === vid);

  return (
    <div className="card mt-8 space-y-4 p-5">
      <h2 className="font-display text-lg">Send an enquiry</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {variants.length > 0 && (
          <div>
            <label className="label" htmlFor="var">{isSize ? 'Size' : 'Thickness'}</label>
            <select id="var" className="input" value={vid} onChange={(e) => setVid(e.target.value)}>
              <option value="">Select…</option>
              {variants.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="label" htmlFor="qty">Quantity</label>
          <input id="qty" className="input" inputMode="numeric" placeholder="e.g. 20 sheets" value={qty} onChange={(e) => setQty(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="m">Message (optional)</label>
          <input id="m" className="input" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Any requirement…" />
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <WhatsAppButton settings={settings} product={product} quantity={qty} message={msg} variant={variant} className="btn-wa" label="Enquire on WhatsApp" />
        <Link href={`/quotation?product=${encodeURIComponent(product.name + (variant ? ` (${variant.label})` : ''))}&pid=${product.id}&qty=${encodeURIComponent(qty)}`} className="btn-outline">Add to Bulk Quotation</Link>
      </div>
    </div>
  );
}
