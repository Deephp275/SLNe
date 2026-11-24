/** @type {import('next').NextConfig} */
// The page Content-Security-Policy (with a fresh nonce per request) is set in proxy.js; see lib/csp.js.
const common = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];

const nextConfig = {
  poweredByHeader: false,
  images: { remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }] },
  async headers() {
    return [
      // Everything except /uploads: that route sets its own, stricter headers (Next.js 16 lets a global rule overwrite them)
      { source: '/((?!uploads/).*)', headers: common },
      // API answers are data, never pages: allow nothing to load from them
      { source: '/api/:path*', headers: [{ key: 'Content-Security-Policy', value: "default-src 'none'; frame-ancestors 'none'" }] },
    ];
  },
};
export default nextConfig;
