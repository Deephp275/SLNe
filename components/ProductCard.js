import Link from 'next/link';
import Image from 'next/image';
import { sortImages, sortSpecs, sortVariants } from '@/lib/sort';
import WhatsAppButton from './WhatsAppButton';

const SIZE_CATS = ['silver-cut-size', 'timber'];

export default function ProductCard({ product, settings }) {
  const img = sortImages(product.images)[0];
  const vs = sortVariants(product.variants);
  const specs = [
    vs.length && `${SIZE_CATS.includes(product.category?.slug) ? 'Sizes' : 'Thickness'}: ${vs.map((v) => v.label).join(', ')}`,
    !vs.length && product.thickness && `Thickness: ${product.thickness}`,
    product.dimensions && `Size: ${product.dimensions}`,
    ...sortSpecs(product.specs).slice(0, 2).map((s) => `${s.spec_key}: ${s.spec_value}`),
  ].filter(Boolean).slice(0, 3);
  return (
    <article className="group card flex flex-col overflow-hidden transition duration-500 hover:-translate-y-1 hover:border-gold/60 hover:shadow-xl hover:shadow-black/40">
      <Link href={`/products/${product.slug}`} className="wood relative block aspect-[4/3] overflow-hidden" aria-label={product.name}>
        {img ? (
          <Image src={img.url} alt={img.alt || product.name} fill sizes="(max-width:768px) 100vw, 25vw" className="object-cover transition duration-700 group-hover:scale-105" />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-xs uppercase tracking-widest text-cream/65">No photo yet</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs uppercase tracking-widest text-gold-soft">{product.brand?.name || product.category?.name}</p>
        <h3 className="mt-1 font-display text-lg text-cream"><Link href={`/products/${product.slug}`}>{product.name}</Link></h3>
        <ul className="mt-3 flex-1 space-y-1 text-sm text-cream/65">{specs.map((s) => <li key={s}>{s}</li>)}</ul>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Link href={`/products/${product.slug}`} className="btn-outline btn-sm">View Details</Link>
          <WhatsAppButton settings={settings} product={product} label="Enquire" />
        </div>
      </div>
    </article>
  );
}
