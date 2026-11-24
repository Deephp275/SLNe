'use client';
import { useState } from 'react';
import { supabaseBrowser, isConfigured } from '@/lib/supabase/client';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    const sb = supabaseBrowser();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { setErr(isConfigured() ? 'Invalid email or password.' : error.message); setBusy(false); return; }
    if (!isConfigured()) { window.location.href = '/admin'; return; }
    const { data: adm } = await sb.from('admins').select('id').eq('id', data.user.id).maybeSingle();
    if (!adm) { await sb.auth.signOut(); setErr('This account does not have admin access.'); setBusy(false); return; }
    window.location.href = '/admin';
  }
  return (
    <div className="grid min-h-screen place-items-center p-5">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-5 p-8">
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="mx-auto h-20 w-auto" />
          <h1 className="mt-3 font-display text-xl">Shree Lakshmi Narayan</h1>
          <p className="text-xs uppercase tracking-[0.4em] text-gold-soft">Admin</p>
        </div>
        {isConfigured() ? (
          <div><label className="label" htmlFor="e">Email</label><input id="e" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></div>
        ) : (
          <p className="rounded-sm border border-gold/30 p-3 text-xs text-cream/70">Enter the admin password. After 5 wrong attempts, login is locked for 15 minutes.</p>
        )}
        <div><label className="label" htmlFor="p">Password</label><input id="p" type="password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></div>
        {err && <p className="text-sm text-red-300" role="alert">{err}</p>}
        <button className="btn-gold w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  );
}
