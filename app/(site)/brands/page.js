import { getBrands } from '@/lib/data';
import Link from 'next/link';
import Image from 'next/image';
export const metadata = { title: 'Brands', description: 'Brands we supply.' };
export const revalidate = 60;

export default async function Brands() {
  const brands = await getBrands();
  return (
    <section className="section container-x">
      <p className="eyebrow">Brands</p>
      <h1 className="h-display mt-3 text-4xl sm:text-5xl">Brands We Supply</h1>
      <div className="gold-rule mt-6" />
      {brands.length ? (
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {brands.map((b) => (
            <Link key={b.id} href={`/products?brand=${b.slug}`} className="card group p-8 text-center transition hover:-translate-y-1 hover:border-gold/60">
              <div className="relative mx-auto mb-5 grid h-24 w-full place-items-center">
                {b.logo_url ? <Image src={b.logo_url} alt={`${b.name} logo`} fill sizes="200px" className="object-contain" /> : <span className="font-display text-3xl text-gold/60">{b.name}</span>}
              </div>
              {b.logo_url && <h2 className="font-display text-lg">{b.name}</h2>}
              {b.description && <p className="mt-2 text-sm text-cream/60">{b.description}</p>}
              <span className="mt-4 inline-block text-xs uppercase tracking-widest text-gold-soft">View Products →</span>
            </Link>
          ))}
        </div>
      ) : <p className="card mt-12 p-10 text-center text-cream/60">Brands will appear here once added in the admin dashboard.</p>}
    </section>
  );
}
