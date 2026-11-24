import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isLocalMode, COOKIE } from '@/lib/local/auth';
import { verifySession } from '@/lib/local/security';
import { buildCsp } from '@/lib/csp';

// Next.js 16 name for "middleware" (runs on the Node.js runtime, so it can check the real session).
// It does two jobs: (1) gives every page a fresh CSP nonce, (2) keeps visitors out of /admin.
export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildCsp(nonce);

  // Pass the nonce on to the page (Next.js reads the CSP from the request to stamp its own scripts)
  const proceed = () => {
    const h = new Headers(request.headers);
    h.set('x-nonce', nonce); h.set('content-security-policy', csp);
    const res = NextResponse.next({ request: { headers: h } });
    res.headers.set('Content-Security-Policy', csp);
    return res;
  };

  if (!pathname.startsWith('/admin') || pathname === '/admin/login' || pathname === '/admin/login/') return proceed();   // public pages, and the only public admin page

  const loginUrl = new URL('/admin/login', request.url);
  if (isLocalMode()) {
    if (!verifySession(request.cookies.get(COOKIE)?.value)) return NextResponse.redirect(loginUrl);
    const res = proceed(); res.headers.set('Cache-Control', 'no-store'); return res;
  }

  // Supabase mode: ask Supabase to verify the user (not just read the cookie), then check the admins table
  let cookieUpdates = [];
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: { getAll: () => request.cookies.getAll(), setAll(list) { cookieUpdates = list; list.forEach(({ name, value }) => request.cookies.set(name, value)); } },
  });
  const { data: { user } } = await supabase.auth.getUser();
  let isAdmin = false;
  if (user) {
    const { data } = await supabase.from('admins').select('id').eq('id', user.id).maybeSingle();
    isAdmin = !!data;
  }
  if (!isAdmin) return NextResponse.redirect(loginUrl);
  const res = proceed();
  cookieUpdates.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
  return res;
}

// Every page, but not API calls or static files
export const config = { matcher: ['/((?!api|_next/static|_next/image|uploads|images|favicon.ico|logo.png|robots.txt|sitemap.xml).*)'] };
