'use client';
import { useState } from 'react';
import Image from 'next/image';

export default function GalleryView({ images }) {
  const cats = ['All', ...new Set(images.map((i) => i.category).filter(Boolean))];
  const [cat, setCat] = useState('All');
  const [big, setBig] = useState(null);
  const shown = images.filter((i) => cat === 'All' || i.category === cat);
  if (!images.length) return <p className="card mt-12 p-10 text-center text-cream/60">Gallery photos will appear here once uploaded in the admin dashboard.</p>;
  return (
    <>
      <div className="mt-10 flex flex-wrap gap-2">
        {cats.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`rounded-full border px-4 py-1.5 text-xs uppercase tracking-wider transition ${cat === c ? 'border-gold bg-gold text-ink' : 'border-gold/30 text-cream/75 hover:border-gold'}`}>{c}</button>
        ))}
      </div>
      <div className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3">
        {shown.map((i) => (
          <button key={i.id} onClick={() => setBig(i)} className="group relative mb-4 block w-full overflow-hidden border border-gold/15">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={i.url} alt={i.caption || 'Gallery photo'} loading="lazy" className="w-full transition duration-700 group-hover:scale-105" />
          </button>
        ))}
      </div>
      {big && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4" onClick={() => setBig(null)} role="dialog" aria-modal="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={big.url} alt={big.caption || ''} className="max-h-[88vh] max-w-full object-contain" />
          {big.caption && <p className="absolute bottom-6 text-sm text-cream/80">{big.caption}</p>}
          <button className="absolute right-5 top-5 text-3xl text-cream" aria-label="Close">×</button>
        </div>
      )}
    </>
  );
}
