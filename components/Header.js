'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from './Logo';

const LINKS = [
  ['/', 'Home'], ['/about', 'About Us'], ['/products', 'Products'],
  ['/brands', 'Brands'], ['/gallery', 'Gallery'], ['/contact', 'Contact'],
];

// Phone-friendly on purpose: no blur effect behind the header, no size change while scrolling, and the phone menu is a
// floating panel that fades in (it does not push the page down), so opening it never makes the whole page repaint.
export default function Header({ settings }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const active = (h) => (h === '/' ? path === '/' : path.startsWith(h));

  return (
    <header className="sticky top-0 z-40 border-b border-gold/25 bg-ink/95 py-3">
      <div className="container-x flex items-center justify-between">
        <Logo settings={settings} />
        <nav className="hidden items-center gap-8 lg:flex" aria-label="Main">
          {LINKS.map(([h, l]) => (
            <Link key={h} href={h} className={`relative py-1 text-sm uppercase tracking-wider transition-colors after:absolute after:-bottom-0.5 after:left-0 after:h-px after:bg-gold after:transition-all after:duration-300 ${active(h) ? 'text-gold-soft after:w-full' : 'text-cream/80 hover:text-gold-soft after:w-0 hover:after:w-full'}`}>{l}</Link>
          ))}
          <Link href="/quotation" className="btn-gold btn-sm">Get a Quote</Link>
        </nav>
        <button className="-mr-2 p-3 text-cream lg:hidden" aria-label="Toggle menu" aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(!open)}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            {open ? <path d="M5 5l14 14M19 5L5 19" /> : <path d="M3 7h18M3 12h18M3 17h18" />}
          </svg>
        </button>
      </div>
      <div id="mobile-menu" className={`absolute inset-x-0 top-full border-b border-gold/25 bg-ink transition duration-200 lg:hidden ${open ? 'visible translate-y-0 opacity-100' : 'pointer-events-none invisible -translate-y-2 opacity-0'}`}>
        <nav className="container-x flex flex-col gap-1 pb-5 pt-3" aria-label="Mobile">
          {LINKS.map(([h, l]) => (
            <Link key={h} href={h} className={`border-b border-gold/10 py-3 text-sm uppercase tracking-wider ${active(h) ? 'text-gold-soft' : 'text-cream/85'}`}>{l}</Link>
          ))}
          <Link href="/quotation" className="btn-gold mt-4">Get a Quote</Link>
        </nav>
      </div>
    </header>
  );
}
