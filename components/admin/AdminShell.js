'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

const NAV = [
  ['/admin', 'Overview'], ['/admin/products', 'Products'], ['/admin/categories', 'Categories'], ['/admin/brands', 'Brands'],
  ['/admin/inventory', 'Inventory'], ['/admin/enquiries', 'Enquiries'], ['/admin/quotations', 'Quotations'],
  ['/admin/gallery', 'Gallery'], ['/admin/settings', 'Settings'], ['/admin/account', 'Account & Security'],
];

export default function AdminShell({ children }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  async function logout() { await supabaseBrowser().auth.signOut(); window.location.href = '/admin/login'; }
  const nav = (
    <nav className="flex flex-col gap-1 p-4">
      {NAV.map(([h, l]) => (
        <Link key={h} href={h} onClick={() => setOpen(false)} className={`rounded-sm px-4 py-2.5 text-sm ${path === h ? 'bg-gold text-ink' : 'text-cream/80 hover:bg-walnut'}`}>{l}</Link>
      ))}
      <Link href="/" target="_blank" className="mt-4 px-4 py-2 text-xs uppercase tracking-wider text-cream/65 hover:text-gold-soft">View website ↗</Link>
      <button onClick={logout} className="px-4 py-2 text-left text-xs uppercase tracking-wider text-red-300">Log out</button>
    </nav>
  );
  return (
    <div className="min-h-screen md:flex">
      <header className="flex items-center justify-between border-b border-gold/20 p-4 md:hidden">
        <span className="font-display">SLN Admin</span>
        <button onClick={() => setOpen(!open)} className="text-sm text-gold-soft" aria-expanded={open}>{open ? 'Close' : 'Menu'}</button>
      </header>
      {open && <div className="border-b border-gold/20 md:hidden">{nav}</div>}
      <aside className="hidden w-60 shrink-0 border-r border-gold/20 bg-black/30 md:block">
        <div className="flex items-center gap-3 border-b border-gold/20 p-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-10 w-auto" />
          <span className="font-display text-sm leading-tight">Shree Lakshmi Narayan<br /><span className="text-xs text-gold-soft">Admin</span></span>
        </div>
        {nav}
      </aside>
      <main className="min-w-0 flex-1 p-5 sm:p-8">{children}</main>
    </div>
  );
}
