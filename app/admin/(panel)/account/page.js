'use client';
import { useState } from 'react';
import { isConfigured } from '@/lib/supabase/client';

export default function Account() {
  const [f, setF] = useState({ current: '', next: '', again: '' });
  const [msg, setMsg] = useState({ ok: false, text: '' });
  const [busy, setBusy] = useState(false);
  const [tidy, setTidy] = useState('');
  if (isConfigured()) return <div><h1 className="font-display text-3xl">Account &amp; Security</h1><p className="mt-4 text-cream/70">Passwords are managed in your Supabase dashboard (Authentication → Users).</p></div>;

  async function submit(e) {
    e.preventDefault(); setMsg({ ok: false, text: '' });
    if (f.next !== f.again) return setMsg({ ok: false, text: 'The new passwords do not match.' });
    setBusy(true);
    const r = await fetch('/api/local/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'change', current: f.current, next: f.next }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: j.error || 'Could not change the password.' });
    setF({ current: '', next: '', again: '' });
    setMsg({ ok: true, text: 'Password changed. Every other signed-in device has been signed out.' });
  }
  async function cleanup() {
    setTidy('Checking…');
    const r = await fetch('/api/local/upload-cleanup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const j = await r.json().catch(() => ({}));
    setTidy(r.ok ? (j.removed ? `Removed ${j.removed} unused photo${j.removed > 1 ? 's' : ''} (${Math.round(j.bytes / 1024)} KB).` : 'Nothing to remove: every photo is in use or was uploaded in the last hour.') : (j.error || 'Could not clean up.'));
  }
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="max-w-xl">
      <h1 className="font-display text-3xl">Account &amp; Security</h1>
      <form onSubmit={submit} className="card mt-6 space-y-5 p-6">
        <h2 className="font-display text-xl">Change admin password</h2>
        <div><label className="label" htmlFor="cur">Current password</label><input id="cur" type="password" required className="input" value={f.current} onChange={set('current')} autoComplete="current-password" /></div>
        <div><label className="label" htmlFor="nw">New password (10+ characters, with a number)</label><input id="nw" type="password" required minLength={10} className="input" value={f.next} onChange={set('next')} autoComplete="new-password" /></div>
        <div><label className="label" htmlFor="ag">Repeat new password</label><input id="ag" type="password" required className="input" value={f.again} onChange={set('again')} autoComplete="new-password" /></div>
        {msg.text && <p className={`text-sm ${msg.ok ? 'text-emerald-300' : 'text-red-300'}`} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}
        <button className="btn-gold btn-sm" disabled={busy}>{busy ? 'Saving…' : 'Change password'}</button>
      </form>
      <div className="card mt-6 space-y-3 p-6 text-sm">
        <h2 className="font-display text-xl">Tidy up</h2>
        <p className="text-cream/70">Delete uploaded photos that no product, category, brand, gallery or setting uses any more.</p>
        <button type="button" className="btn-outline btn-sm" onClick={cleanup}>Clean up unused photos</button>
        {tidy && <p className="text-gold-soft" role="status">{tidy}</p>}
      </div>
      <div className="card mt-6 space-y-2 p-6 text-sm text-cream/70">
        <h2 className="font-display text-xl text-cream">How this admin is protected</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Password stored only as a salted scrypt hash, never in plain text.</li>
          <li>Login locks for 15 minutes after 5 wrong attempts.</li>
          <li>Sessions expire after 8 hours; the cookie is HttpOnly and SameSite=Strict.</li>
          <li>Every change is checked on the server and must come from this site.</li>
          <li>Uploads are checked by file content; only JPG, PNG, WebP and GIF are accepted.</li>
          <li>Logins, failures, uploads and password changes are recorded in <code>data/audit.log</code>.</li>
        </ul>
      </div>
    </div>
  );
}
