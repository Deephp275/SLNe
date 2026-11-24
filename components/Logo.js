import Link from 'next/link';

export default function Logo({ settings, size = 'md' }) {
  const img = settings?.logo_url || '/logo.png';
  const dim = size === 'lg' ? 96 : 60;
  return (
    <Link href="/" className="flex items-center gap-4" aria-label={`${settings?.business_name || 'Home'} – home`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img} alt="Lakshmi Narayana emblem" width={dim} height={dim} style={{ height: dim, width: 'auto' }} />
      <span className="leading-snug">
        <span className="block font-display text-[15px] font-semibold uppercase tracking-[0.16em] text-cream sm:text-lg">Shree Lakshmi Narayan</span>
        <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.55em] text-gold-soft">Enterprise</span>
      </span>
    </Link>
  );
}
