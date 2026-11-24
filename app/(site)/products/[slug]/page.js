import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProduct, getRelated, getSettings, sortImages, sortSpecs, sortVariants } from '@/lib/data';
import ProductCard from '@/components/ProductCard';
import { safeJson } from '@/lib/jsonld';
import ProductBuy from './ProductBuy';
import ProductGallery from './ProductGallery';

export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return { title: 'Product not found' };
  const img = sortImages(p.images)[0];
  return {
    title: p.name,
    description: (p.description || `${p.name}${p.brand ? ` by ${p.brand.name}` : ''} – enquire for details.`).slice(0, 160),
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: img ? { images: [img.url] } : undefined,
  };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const [p, s] = await Promise.all([getProduct(slug), getSettings()]);
  if (!p) notFound();
  const related = await getRelated(p);
  const images = sortImages(p.images);
  const specs = sortSpecs(p.specs);
  const variants = sortVariants(p.variants);
  const isSize = ['silver-cut-size', 'timber'].includes(p.category?.slug);
  const rows = [['SKU', p.sku], ['Category', p.category?.name], ['Brand', p.brand?.name], ['Dimensions', p.dimensions], ['Thickness', p.thickness],
    ...specs.map((x) => [x.spec_key, x.spec_value])].filter(([, v]) => v);

  const ld = {
    '@context': 'https://schema.org', '@type': 'Product', name: p.name, sku: p.sku || undefined,
    description: p.description || undefined, image: images.map((i) => i.url),
    brand: p.brand ? { '@type': 'Brand', name: p.brand.name } : undefined,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson(ld) }} />
      <section className="container-x py-12">
        <nav className="text-xs uppercase tracking-wider text-cream/65" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-gold-soft">Home</Link> / <Link href="/products" className="hover:text-gold-soft">Products</Link> / <span className="text-cream/80">{p.name}</span>
        </nav>
        <div className="mt-8 grid gap-12 lg:grid-cols-2">
          <ProductGallery images={images} name={p.name} />
          <div>
            <p className="eyebrow">{p.brand?.name || p.category?.name}</p>
            <h1 className="h-display mt-3 text-3xl sm:text-4xl">{p.name}</h1>
            <div className="gold-rule mt-5" />
            {p.description && <p className="mt-6 whitespace-pre-line leading-relaxed text-cream/75">{p.description}</p>}
            {variants.length > 0 && (
              <div className="mt-6">
                <h2 className="label">{isSize ? 'Available sizes' : 'Available thickness'}</h2>
                <ul className="flex flex-wrap gap-2">
                  {variants.map((v) => <li key={v.id} className="rounded-sm border border-gold/40 px-4 py-2 text-sm">{v.label}</li>)}
                </ul>
              </div>
            )}
            {(p.dimensions || p.thickness) && (
              <dl className="mt-6 grid grid-cols-2 gap-4">
                {p.dimensions && <div className="card p-4"><dt className="label">Available size</dt><dd>{p.dimensions}</dd></div>}
                {p.thickness && <div className="card p-4"><dt className="label">Thickness</dt><dd>{p.thickness}</dd></div>}
              </dl>
            )}
            <ProductBuy product={p} settings={s} />
          </div>
        </div>

        {rows.length > 0 && (
          <div className="mt-16">
            <h2 className="h-display text-2xl">Specifications</h2>
            <table className="card mt-5 w-full max-w-2xl text-sm"><tbody>
              {rows.map(([k, v]) => <tr key={k} className="border-b border-gold/10 last:border-0"><th className="w-1/3 p-3 text-left font-medium text-cream/60">{k}</th><td className="p-3">{v}</td></tr>)}
            </tbody></table>
          </div>
        )}

        {related.length > 0 && (
          <div className="mt-20">
            <h2 className="h-display text-2xl">Related Products</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((r) => <ProductCard key={r.id} product={r} settings={s} />)}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
