// Content Security Policy with a fresh random "nonce" for every page request.
// Only scripts that carry the nonce (Next.js adds it to its own) may run, so injected inline script is blocked.
export function buildCsp(nonce) {
  const dev = process.env.NODE_ENV !== 'production';
  const supabase = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').includes('YOUR-PROJECT') ? '' : ' https://*.supabase.co';
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob:${supabase}`,
    "font-src 'self' data:",
    `connect-src 'self'${supabase}${dev ? ' ws: wss:' : ''}`,
    'frame-src https://www.google.com',
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}
