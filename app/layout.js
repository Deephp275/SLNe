import './globals.css';
import { Playfair_Display, Inter } from 'next/font/google';
import { headers } from 'next/headers';
import { getSettings } from '@/lib/data';
import { safeJson } from '@/lib/jsonld';

const display = Playfair_Display({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const body = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

export const revalidate = 60;

export async function generateMetadata() {
  const s = await getSettings();
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  return {
    metadataBase: new URL(site),
    title: { default: `${s.business_name} | Plywood, Laminates & Timber Supplier`, template: `%s | ${s.business_name}` },
    description: 'Quality plywood, premium laminates and timber solutions for your projects. Individual and bulk enquiries welcome.',
    openGraph: { title: s.business_name, description: 'Plywood, laminates and timber supplier.', type: 'website' },
    icons: { icon: '/logo.png' },
  };
}

export default async function RootLayout({ children }) {
  // Reading the request headers makes every page render per request, which is what lets Next.js stamp the CSP nonce on its scripts
  const nonce = (await headers()).get('x-nonce') || undefined;
  const s = await getSettings();
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: s.business_name,
    description: 'Plywood, laminates and timber supplier.',
    url: process.env.NEXT_PUBLIC_SITE_URL,
    ...(s.phone && { telephone: s.phone }),
    ...(s.email && { email: s.email }),
    ...(s.address && { address: { '@type': 'PostalAddress', streetAddress: s.address } }),
    ...(s.service_area && { areaServed: s.service_area }),
    ...(s.business_hours && { openingHours: s.business_hours }),
    ...(s.maps_link && { hasMap: s.maps_link }),
  };
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="font-sans">
        <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: safeJson(ld) }} />
        {children}
      </body>
    </html>
  );
}

