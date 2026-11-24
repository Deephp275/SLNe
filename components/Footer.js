import Link from 'next/link';
import Logo from './Logo';
import { parseContacts, waLink, safeHref } from '@/lib/utils';

export default function Footer({ settings: s }) {
  const social = [['facebook', 'Facebook'], ['instagram', 'Instagram'], ['youtube', 'YouTube']].filter(([k]) => safeHref(s[k]));
  return (
    <footer className="border-t border-gold/25 bg-black/40">
      <div className="container-x grid gap-12 py-16 md:grid-cols-4">
        <div className="md:col-span-1">
          <Logo settings={s} />
          <p className="mt-5 text-sm leading-relaxed text-cream/60">Plywood, laminates and timber for homes, interiors and projects.</p>
        </div>
        <div>
          <h4 className="eyebrow mb-4">Categories</h4>
          <ul className="space-y-2 text-sm text-cream/75">
            {['Plywood', 'Laminates', 'Timber'].map((c) => (
              <li key={c}><Link className="hover:text-gold-soft" href={`/products?category=${c.toLowerCase()}`}>{c}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="eyebrow mb-4">Quick Links</h4>
          <ul className="space-y-2 text-sm text-cream/75">
            {[['/about', 'About Us'], ['/products', 'Products'], ['/brands', 'Brands'], ['/gallery', 'Gallery'], ['/quotation', 'Bulk Quotation'], ['/contact', 'Contact']].map(([h, l]) => (
              <li key={h}><Link className="hover:text-gold-soft" href={h}>{l}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="eyebrow mb-4">Contact</h4>
          <ul className="space-y-2 text-sm text-cream/75">
            <li>{s.address || <span className="text-cream/65">Address – add in Admin → Settings</span>}</li>
            {parseContacts(s.contacts).length > 0
              ? parseContacts(s.contacts).map((c) => <li key={c.phone}>{c.name}: <a className="hover:text-gold-soft" href={`tel:+91${c.phone.replace(/\D/g, '').slice(-10)}`}>{c.phone}</a></li>)
              : s.phone && <li><a className="hover:text-gold-soft" href={`tel:${s.phone}`}>{s.phone}</a></li>}
            {s.email && <li><a className="hover:text-gold-soft" href={`mailto:${s.email}`}>{s.email}</a></li>}
            {s.whatsapp_number && <li><a className="hover:text-gold-soft" href={waLink(s.whatsapp_number, `Hello ${s.business_name}, I would like to make an enquiry.`)} target="_blank" rel="noopener noreferrer">WhatsApp</a></li>}
            {(safeHref(s.maps_link) || s.address) && <li><a className="hover:text-gold-soft" href={safeHref(s.maps_link) || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address)}`} target="_blank" rel="noopener noreferrer">View on Google Maps</a></li>}
            {social.length > 0 && (
              <li className="flex gap-4 pt-2">{social.map(([k, l]) => <a key={k} href={safeHref(s[k])} target="_blank" rel="noopener noreferrer" className="hover:text-gold-soft">{l}</a>)}</li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-gold/15 py-5 text-center text-xs text-cream/65">
        © {new Date().getFullYear()} {s.business_name}. All rights reserved.
      </div>
    </footer>
  );
}
