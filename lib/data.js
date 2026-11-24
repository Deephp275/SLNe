import { supabasePublic } from './supabase/server';
import { localServerClient } from './local/serverClient';
import { sortImages, sortSpecs, sortVariants } from './sort';
export { sortImages, sortSpecs, sortVariants };

const PRODUCT_SELECT =
  '*, category:categories(id,name,slug,parent_id), brand:brands(id,name,slug,logo_url), images:product_images(url,alt,sort_order), specs:product_specifications(spec_key,spec_value,sort_order), variants:product_variants(id,label,price,unit,sort_order)';

async function run(fn, fallback) {
  try {
    const sb = supabasePublic() || localServerClient();
    const { data, error } = await fn(sb);
    if (error) { console.error(error.message); return fallback; }
    return data ?? fallback;
  } catch (e) { console.error(e); return fallback; }
}

export const DEFAULT_SETTINGS = { business_name: 'Shree Lakshmi Narayan Enterprise' };

export async function getSettings() {
  const rows = await run((sb) => sb.from('website_settings').select('key,value'), []);
  const s = { ...DEFAULT_SETTINGS };
  rows.forEach((r) => { if (r.value) s[r.key] = r.value; });
  return s;
}
export const getCategories = () => run((sb) => sb.from('categories').select('*').order('sort_order'), []);
export const getBrands = () => run((sb) => sb.from('brands').select('*').order('name'), []);
export const getGallery = () => run((sb) => sb.from('gallery_images').select('*').order('sort_order').order('created_at', { ascending: false }), []);
export const getProducts = (opts = {}) => run((sb) => {
  let q = sb.from('products').select(PRODUCT_SELECT).eq('is_published', true).order('created_at', { ascending: false });
  if (opts.featured) q = q.eq('is_featured', true);
  if (opts.limit) q = q.limit(opts.limit);
  return q;
}, []);
export async function getProduct(slug) {
  const rows = await run((sb) => sb.from('products').select(PRODUCT_SELECT).eq('slug', slug).eq('is_published', true).limit(1), []);
  return rows[0] || null;
}
export async function getRelated(product) {
  if (!product?.category_id) return [];
  const cats = await getCategories();
  const me = cats.find((c) => c.id === product.category_id);
  if (!me) return [];
  const topId = me.parent_id || me.id; // related = same section (Plywood / Laminates / Timber)
  const ids = cats.filter((c) => c.id === topId || c.parent_id === topId).map((c) => c.id);
  return run((sb) => sb.from('products').select(PRODUCT_SELECT).eq('is_published', true).in('category_id', ids).neq('id', product.id).limit(4), []);
}
