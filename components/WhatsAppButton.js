'use client';
import { waLink, productEnquiryMessage } from '@/lib/utils';
import { WhatsAppIcon } from './WhatsAppFloat';

export default function WhatsAppButton({ settings, product, quantity, message, variant, className = 'btn-wa btn-sm', label = 'WhatsApp Enquiry' }) {
  const text = productEnquiryMessage({ business: settings.business_name, product, quantity, message, variant });
  const href = waLink(settings.whatsapp_number, text);
  if (!href) {
    return <a href="/contact" className={`${className} !bg-transparent !text-cream/70 border border-cream/20`} title="WhatsApp number not configured yet">Enquire</a>;
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      <span className="scale-75"><WhatsAppIcon /></span>{label}
    </a>
  );
}
