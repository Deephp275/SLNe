import { getSettings } from '@/lib/data';
import QuotationForm from './QuotationForm';
export const metadata = { title: 'Bulk Quotation', description: 'Request a quotation for bulk plywood, laminates and timber requirements.' };

export default async function Quotation() {
  const s = await getSettings();
  return (
    <section className="section container-x max-w-4xl">
      <p className="eyebrow">Bulk Quotation</p>
      <h1 className="h-display mt-3 text-4xl sm:text-5xl">Request a Quotation</h1>
      <div className="gold-rule mt-6" />
      <p className="mt-6 text-cream/70">Tell us what you need and we will get back to you. Add as many products as you like.</p>
      <QuotationForm settings={s} />
    </section>
  );
}
