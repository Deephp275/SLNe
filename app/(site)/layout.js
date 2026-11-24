import { getSettings } from '@/lib/data';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WhatsAppFloat from '@/components/WhatsAppFloat';

export default async function SiteLayout({ children }) {
  const s = await getSettings();
  return (
    <>
      <Header settings={s} />
      {children}
      <Footer settings={s} />
      <WhatsAppFloat settings={s} />
    </>
  );
}
