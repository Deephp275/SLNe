import { getSettings } from '@/lib/data';
import { waLink, parseContacts, safeHref, safeMapEmbed } from '@/lib/utils';
import ContactForm from './ContactForm';
export const metadata = { title: 'Contact Us', description: 'Get in touch with Shree Lakshmi Narayan Enterprise, Vijayanagar, Bengaluru.' };

const Row = ({ t, children }) => (<div><h3 className="eyebrow">{t}</h3><div className="mt-2 text-cream/80">{children}</div></div>);

export default async function Contact() {
  const s = await getSettings();
  const people = parseContacts(s.contacts);
  const wa = waLink(s.whatsapp_number, `Hello ${s.business_name}, I would like to make an enquiry.`);
  const q = encodeURIComponent(s.address || '');
  const mapsLink = safeHref(s.maps_link) || (s.address ? `https://www.google.com/maps/search/?api=1&query=${q}` : '');
  const mapsEmbed = safeMapEmbed(s.maps_embed_url) || (s.address ? `https://www.google.com/maps?q=${q}&output=embed` : '');
  const empty = <span className="text-cream/65">Not added yet</span>;
  return (
    <section className="section container-x">
      <p className="eyebrow">Contact Us</p>
      <h1 className="h-display mt-3 text-4xl sm:text-5xl">Get in Touch</h1>
      <div className="gold-rule mt-6" />
      <div className="mt-12 grid gap-12 lg:grid-cols-2">
        <div className="space-y-7">
          <Row t="Address">{s.address ? <address className="whitespace-pre-line not-italic">{s.address}</address> : empty}</Row>
          <Row t="Call us">
            {people.length ? (
              <ul className="space-y-3">
                {people.map((c) => (
                  <li key={c.phone} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                    <div><p className="font-display text-lg text-cream">{c.name}</p><a className="text-sm text-gold-soft hover:underline" href={`tel:+91${c.phone.replace(/\D/g, '').slice(-10)}`}>{c.phone}</a></div>
                    <div className="flex gap-2">
                      <a className="btn-outline btn-sm" href={`tel:+91${c.phone.replace(/\D/g, '').slice(-10)}`}>Call</a>
                      <a className="btn-wa btn-sm" target="_blank" rel="noopener noreferrer" href={waLink(c.phone, `Hello ${c.name}, I would like to make an enquiry about your products.`)}>WhatsApp</a>
                    </div>
                  </li>
                ))}
              </ul>
            ) : s.phone ? <a className="hover:text-gold-soft" href={`tel:${s.phone}`}>{s.phone}</a> : empty}
          </Row>
          {s.email && <Row t="Email"><a className="hover:text-gold-soft" href={`mailto:${s.email}`}>{s.email}</a></Row>}
          {s.business_hours && <Row t="Business hours"><span className="whitespace-pre-line">{s.business_hours}</span></Row>}
          <div className="flex flex-wrap gap-3">
            {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-wa">Chat on WhatsApp</a>}
            {mapsLink && <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="btn-outline">Open in Google Maps</a>}
          </div>
          {mapsEmbed && (
            <iframe title="Our location on Google Maps" src={mapsEmbed} loading="lazy" referrerPolicy="no-referrer-when-downgrade"
              className="h-72 w-full border border-gold/25" />
          )}
        </div>
        <ContactForm />
      </div>
    </section>
  );
}
