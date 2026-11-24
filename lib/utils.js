export const AVAILABILITY = {
  in_stock: { label: 'In Stock', cls: 'text-emerald-300 border-emerald-400/40' },
  out_of_stock: { label: 'Out of Stock', cls: 'text-red-300 border-red-400/40' },
  on_request: { label: 'Available on Request', cls: 'text-gold-soft border-gold/40' },
};

export const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// Only real web addresses are used as links (blocks javascript: and similar)
export const safeHref = (u) => (typeof u === 'string' && /^https?:\/\//i.test(u.trim()) ? u.trim() : '');
export const safeMapEmbed = (u) => (typeof u === 'string' && /^https:\/\/www\.google\.com\/maps/i.test(u.trim()) ? u.trim() : '');

export const cleanPhone = (v = '') => v.replace(/[^\d]/g, '');

// 10-digit Indian numbers get the 91 country code for WhatsApp links
export const waNumber = (p) => { const d = cleanPhone(p); return d.length === 10 ? '91' + d : d; };

// Contact people are stored in settings as lines: Name|Phone
export function parseContacts(text = '') {
  return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    .map((l) => { const [name, phone] = l.split('|'); return { name: (name || '').trim(), phone: (phone || '').trim() }; })
    .filter((c) => c.phone);
}

// Click-to-chat link. `number` comes from website settings (never hardcoded).
export function waLink(number, text) {
  const n = waNumber(number);
  if (!n) return null;
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}

export function productEnquiryMessage({ business, product, quantity, message, variant }) {
  const specs = [
    variant ? `Thickness/Size: ${variant.label}` : product.thickness && `Thickness: ${product.thickness}`,
    product.dimensions && `Size: ${product.dimensions}`,
    ...(product.specs || []).map((s) => `${s.spec_key}: ${s.spec_value}`),
  ].filter(Boolean).join(', ');
  return [
    `Hello ${business},`,
    `I would like to enquire about:`,
    `Product: ${product.name}`,
    product.brand?.name && `Brand: ${product.brand.name}`,
    specs && `Specifications: ${specs}`,
    `Required quantity: ${quantity || 'To be discussed'}`,
    message && `Message: ${message}`,
  ].filter(Boolean).join('\n');
}
