'use client';
import { useState } from 'react';
import { uploadImage } from '@/lib/admin';

export default function ImageField({ value, onChange, folder, label = 'Image' }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function pick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setErr('');
    try { onChange(await uploadImage(file, folder)); } catch (x) { setErr(x.message); }
    setBusy(false); e.target.value = '';
  }
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex items-center gap-4">
        {value ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={value} alt="" className="h-16 w-16 border border-gold/25 object-cover" /> : <div className="grid h-16 w-16 place-items-center border border-dashed border-gold/30 text-[10px] text-cream/65">none</div>}
        <label className="btn-outline btn-sm cursor-pointer">{busy ? 'Uploading…' : value ? 'Replace' : 'Upload'}<input type="file" accept="image/*" className="hidden" onChange={pick} disabled={busy} /></label>
        {value && <button type="button" className="text-xs text-red-300 underline" onClick={() => onChange('')}>Remove</button>}
      </div>
      {err && <p className="mt-1 text-xs text-red-300">{err}</p>}
    </div>
  );
}
