'use client';
import { useState } from 'react';
import Image from 'next/image';

export default function ProductGallery({ images, name }) {
  const [i, setI] = useState(0);
  if (!images.length) return <div className="wood grid aspect-square place-items-center border border-gold/20 text-xs uppercase tracking-widest text-cream/65">No photo yet</div>;
  const cur = images[i];
  return (
    <div>
      <div className="wood relative aspect-square overflow-hidden border border-gold/25">
        <Image key={cur.url} src={cur.url} alt={cur.alt || name} fill priority sizes="(max-width:1024px) 100vw, 50vw" className="object-cover" />
      </div>
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-3">
          {images.map((im, n) => (
            <button key={im.url} onClick={() => setI(n)} aria-label={`Photo ${n + 1}`} className={`relative aspect-square overflow-hidden border transition ${n === i ? 'border-gold' : 'border-gold/20 opacity-70 hover:opacity-100'}`}>
              <Image src={im.url} alt={im.alt || name} fill sizes="120px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
