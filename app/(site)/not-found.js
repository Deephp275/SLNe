import Link from 'next/link';
export default function NotFound() {
  return (
    <section className="section container-x text-center">
      <p className="eyebrow">404</p>
      <h1 className="h-display mt-3 text-4xl">Page not found</h1>
      <p className="mt-4 text-cream/65">The page you are looking for does not exist.</p>
      <Link href="/" className="btn-gold mt-8">Back to Home</Link>
    </section>
  );
}
