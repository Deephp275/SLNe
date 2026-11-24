import { getProducts } from '@/lib/data';
export const revalidate = 3600;
export default async function sitemap() {
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const pages = ['', '/about', '/products', '/brands', '/gallery', '/quotation', '/contact'].map((p) => ({ url: site + p, changeFrequency: 'weekly', priority: p === '' ? 1 : 0.7 }));
  const products = (await getProducts()).map((p) => ({ url: `${site}/products/${p.slug}`, lastModified: p.updated_at, priority: 0.6 }));
  return [...pages, ...products];
}
