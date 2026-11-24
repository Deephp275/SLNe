'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import ImageField from '@/components/admin/ImageField';

const FIELDS = [
  ['business_name', 'Business name'], ['contacts', 'Contact people – one per line as Name|Phone (e.g. Haresh|9986480096)', 'area'], ['phone', 'Main phone number'], ['whatsapp_number', 'WhatsApp number (with country code, digits only e.g. 919XXXXXXXXX)'],
  ['email', 'Email'], ['address', 'Address', 'area'], ['business_hours', 'Business hours', 'area'], ['service_area', 'Service area / city'],
  ['maps_link', 'Google Maps link (share link)'], ['maps_embed_url', 'Google Maps embed URL (src of the embed iframe)'],
  ['facebook', 'Facebook URL'], ['instagram', 'Instagram URL'], ['youtube', 'YouTube URL'],
];

export default function Settings() {
  const sb = supabaseBrowser();
  const [v, setV] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { sb.from('website_settings').select('key,value').then(({ data }) => setV(Object.fromEntries((data || []).map((r) => [r.key, r.value || ''])))); }, []); // eslint-disable-line
  async function save(e) {
    e.preventDefault(); setMsg('');
    const badLink = ['facebook', 'instagram', 'youtube', 'maps_link'].find((k) => v[k] && !/^https?:\/\//i.test(v[k]));
    if (badLink) return setMsg('Links must start with http:// or https:// (check the Facebook, Instagram, YouTube and Google Maps link fields).');
    if (v.maps_embed_url && !/^https:\/\/www\.google\.com\/maps/i.test(v.maps_embed_url)) return setMsg('The map embed address must be a Google Maps address (https://www.google.com/maps/embed?...).');
    setBusy(true);
    const rows = Object.entries(v).map(([key, value]) => ({ key, value }));
    const { error } = await sb.from('website_settings').upsert(rows);
    setBusy(false); setMsg(error ? error.message : 'Settings saved. The website updates within a minute.');
  }
  if (!v) return <p className="text-cream/65">Loading…</p>;
  return (
    <form onSubmit={save} className="max-w-3xl">
      <h1 className="font-display text-3xl">Website Settings</h1>
      <div className="card mt-6 grid gap-5 p-6 sm:grid-cols-2">
        <ImageField label="Logo (leave empty to use the default emblem)" folder="settings" value={v.logo_url} onChange={(x) => setV({ ...v, logo_url: x })} />
        <ImageField label="Homepage hero photo" folder="settings" value={v.hero_image_url} onChange={(x) => setV({ ...v, hero_image_url: x })} />
        {FIELDS.map(([k, l, t]) => (
          <div key={k} className={t === 'area' ? 'sm:col-span-2' : ''}>
            <label className="label" htmlFor={k}>{l}</label>
            {t === 'area' ? <textarea id={k} rows={3} className="input" value={v[k] || ''} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
              : <input id={k} className="input" value={v[k] || ''} onChange={(e) => setV({ ...v, [k]: e.target.value })} />}
          </div>
        ))}
      </div>
      <div className="mt-6 flex items-center gap-4"><button className="btn-gold" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button><span className="text-sm text-gold-soft">{msg}</span></div>
    </form>
  );
}
