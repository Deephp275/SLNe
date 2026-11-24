import Link from 'next/link';
import { getSettings } from '@/lib/data';
export const metadata = { title: 'About Us', description: 'About Shree Lakshmi Narayan Enterprise – plywood, laminates and timber supplier.' };

export default async function About() {
  const s = await getSettings();
  return (
    <section className="section container-x max-w-4xl">
      <p className="eyebrow">About Us</p>
      <h1 className="h-display mt-3 text-4xl sm:text-5xl">{s.business_name}</h1>
      <div className="gold-rule mt-6" />
      <div className="mt-8 space-y-5 text-lg leading-relaxed text-cream/75">
        <p>{s.business_name} supplies plywood, laminates and timber for furniture, interiors and construction projects.</p>
        <p>Our range includes plywood from Greenply, Kitply, Cubixa and Jansathi in different thicknesses; plain colour, designer and 3D print laminates; and silver timber in ready cut sizes.</p>
        <p>We help you choose the right material for your project, and welcome both individual and bulk enquiries.</p>
      </div>
      <div className="mt-10 flex flex-wrap gap-4">
        <Link href="/products" className="btn-gold">Explore Products</Link>
        <Link href="/contact" className="btn-outline">Contact Us</Link>
      </div>
    </section>
  );
}
