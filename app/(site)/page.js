import Link from 'next/link';
import Image from 'next/image';
import { getSettings, getCategories } from '@/lib/data';
import Reveal from '@/components/Reveal';

export const revalidate = 60;

const FALLBACK_CATS = [
  { slug: 'plywood', name: 'Plywood', description: 'Commercial, waterproof, marine and calibrated plywood.' },
  { slug: 'laminates', name: 'Laminates', description: 'Plain colour, designer and 3D print laminates.' },
  { slug: 'timber', name: 'Timber', description: 'Silver timber in ready cut sizes.' },
];
const WHY = [
  ['Quality-focused products', 'Materials chosen for strength, finish and dependable performance in your projects.'],
  ['Multiple material categories', 'Plywood, laminates and timber available from one trusted supplier.'],
  ['Help choosing the right material', 'Talk to us about your project and we will help you select suitable products.'],
  ['Individual and bulk enquiries', 'Whether it is a single sheet or a large requirement, send us your enquiry.'],
];

export default async function Home() {
  const [s, cats] = await Promise.all([getSettings(), getCategories()]);
  const top = cats.filter((c) => !c.parent_id).slice(0, 4);
  const cards = top.length ? top : FALLBACK_CATS;

  return (
    <>
      {/* Hero */}
      <section className="wood relative isolate overflow-hidden">
        {s.hero_image_url && <Image src={s.hero_image_url} alt="Plywood sheets and timber" fill priority sizes="100vw" className="-z-10 object-cover" />}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/80 to-ink/30" />
        <div className="container-x flex min-h-[80vh] flex-col justify-center py-24">
          <p className="eyebrow">Plywood · Laminates · Timber</p>
          <h1 className="h-display mt-6 max-w-3xl text-4xl leading-[1.1] sm:text-6xl lg:text-7xl">
            BUILD WITH QUALITY. <span className="text-gold-soft">BUILD WITH CONFIDENCE.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-cream/80">Explore quality plywood, premium laminates and timber solutions for your projects.</p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/products" className="btn-gold">Explore Products</Link>
            <Link href="/quotation" className="btn-outline">Request a Quotation</Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="section container-x">
        <Reveal className="text-center">
          <p className="eyebrow">Our Range</p>
          <h2 className="h-display mt-3 text-3xl sm:text-4xl">Shop by Category</h2>
          <div className="gold-rule mx-auto mt-5" />
        </Reveal>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c, i) => (
            <Reveal key={c.slug} delay={i * 80}>
              <Link href={`/products?category=${c.slug}`} className="group card block overflow-hidden transition duration-500 hover:-translate-y-1 hover:border-gold/60">
                <div className="wood relative aspect-[4/3] overflow-hidden">
                  {c.image_url && <Image src={c.image_url} alt={c.name} fill sizes="(max-width:768px) 100vw, 25vw" className="object-cover transition duration-700 group-hover:scale-105" />}
                  {!c.image_url && <span className="absolute inset-0 grid place-items-center font-display text-5xl text-gold/30">{c.name[0]}</span>}
                </div>
                <div className="p-6">
                  <h3 className="font-display text-xl">{c.name}</h3>
                  <p className="mt-2 text-sm text-cream/65">{c.description}</p>
                  <span className="mt-5 inline-block text-xs font-semibold uppercase tracking-widest text-gold-soft transition group-hover:translate-x-1">Explore Products →</span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Why us */}
      <section className="section container-x">
        <Reveal className="text-center">
          <p className="eyebrow">Why Choose Us</p>
          <h2 className="h-display mt-3 text-3xl sm:text-4xl">A Supplier You Can Build With</h2>
          <div className="gold-rule mx-auto mt-5" />
        </Reveal>
        <div className="mt-14 grid gap-px overflow-hidden border border-gold/20 bg-gold/20 sm:grid-cols-2 lg:grid-cols-4">
          {WHY.map(([t, d], i) => (
            <Reveal key={t} delay={i * 80} className="bg-ink p-8">
              <span className="font-display text-3xl text-gold">0{i + 1}</span>
              <h3 className="mt-4 font-display text-lg">{t}</h3>
              <p className="mt-3 text-sm leading-relaxed text-cream/65">{d}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* About */}
      <section className="section bg-walnut/25">
        <div className="container-x grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <p className="eyebrow">About Us</p>
            <h2 className="h-display mt-3 text-3xl sm:text-4xl">{s.business_name}</h2>
            <div className="gold-rule mt-5" />
            <p className="mt-6 leading-relaxed text-cream/75">
              {s.business_name} is a supplier of plywood, laminates and timber. We help homeowners, carpenters, designers and contractors find the right materials for their work — from a single sheet to larger project requirements.
            </p>
            <Link href="/about" className="btn-outline mt-8">Learn More</Link>
          </Reveal>
          <Reveal delay={120} className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.logo_url || '/logo.png'} alt="Lakshmi Narayana emblem" className="h-64 w-auto opacity-90 sm:h-80" />
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="wood">
        <div className="container-x py-24 text-center">
          <Reveal>
            <h2 className="h-display text-4xl sm:text-5xl">LET&apos;S BUILD SOMETHING GREAT.</h2>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link href="/contact" className="btn-gold">Contact Us</Link>
              <Link href="/quotation" className="btn-outline">Request Bulk Quotation</Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
