'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function Overview() {
  const [d, setD] = useState(null);
  useEffect(() => { (async () => {
    const sb = supabaseBrowser();
    const cnt = (q) => q.then((r) => r.count ?? 0);
    const head = { count: 'exact', head: true };
    const [total, active, enq, fresh, pending, recentE, recentP] = await Promise.all([
      cnt(sb.from('products').select('id', head)),
      cnt(sb.from('products').select('id', head).eq('is_published', true)),
      cnt(sb.from('enquiries').select('id', head)),
      cnt(sb.from('enquiries').select('id', head).eq('status', 'New')),
      cnt(sb.from('quotations').select('id', head).in('status', ['Pending', 'In Review'])),
      sb.from('enquiries').select('id,reference,customer_name,created_at').order('created_at', { ascending: false }).limit(6),
      sb.from('products').select('id,name,updated_at').order('updated_at', { ascending: false }).limit(6),
    ]);
    const acts = [
      ...(recentE.data || []).map((e) => ({ t: e.created_at, text: `New enquiry ${e.reference} from ${e.customer_name}`, href: '/admin/enquiries' })),
      ...(recentP.data || []).map((p) => ({ t: p.updated_at, text: `Product updated: ${p.name}`, href: '/admin/products' })),
    ].sort((a, b) => new Date(b.t) - new Date(a.t)).slice(0, 8);
    setD({ total, active, enq, fresh, pending, acts });
  })(); }, []);

  const tiles = d && [['Total products', d.total], ['Active products', d.active], ['Total enquiries', d.enq], ['New enquiries', d.fresh], ['Pending quotations', d.pending]];
  return (
    <div>
      <h1 className="font-display text-3xl">Overview</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {(tiles || Array(5).fill(['…', '…'])).map(([l, v], i) => (
          <div key={i} className="card p-5"><p className="label">{l}</p><p className="font-display text-4xl text-gold-soft">{v}</p></div>
        ))}
      </div>
      <h2 className="mt-10 font-display text-xl">Recent activity</h2>
      <ul className="card mt-4 divide-y divide-gold/10">
        {d?.acts.length === 0 && <li className="p-5 text-cream/65">No activity yet.</li>}
        {d?.acts.map((a, i) => (
          <li key={i} className="flex justify-between gap-4 p-4 text-sm">
            <Link href={a.href} className="hover:text-gold-soft">{a.text}</Link>
            <time className="shrink-0 text-cream/65">{new Date(a.t).toLocaleString()}</time>
          </li>
        ))}
      </ul>
    </div>
  );
}
