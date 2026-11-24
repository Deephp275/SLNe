import { getProducts, getCategories, getBrands, getSettings } from '@/lib/data';
import ProductsExplorer from './ProductsExplorer';
export const metadata = { title: 'Products', description: 'Browse plywood, laminates and timber. Search and filter by category, brand and specification.' };
export const revalidate = 60;

export default async function Products() {
  const [products, categories, brands, settings] = await Promise.all([getProducts(), getCategories(), getBrands(), getSettings()]);
  return (
    <section className="section container-x">
      <p className="eyebrow">Catalogue</p>
      <h1 className="h-display mt-3 text-4xl sm:text-5xl">Our Products</h1>
      <div className="gold-rule mt-6" />
      <ProductsExplorer products={products} categories={categories} brands={brands} settings={settings} />
    </section>
  );
}
