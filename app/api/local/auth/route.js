import { NextResponse } from 'next/server';
import { COOKIE, isLocalMode } from '@/lib/local/auth';
import {
  SESSION_MS, verifyPassword, setPassword, createSession, verifySession, destroySession, destroySessions,
  allow, lockedFor, recordFailure, clearFailures, clientIp, sameOrigin, isJson, audit, isLoopback, isSecureRequest, adminAllowed,
} from '@/lib/local/security';

export const dynamic = 'force-dynamic';
const fail = (error, status, headers) => NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store', ...headers } });

function setCookie(res, request, token, maxAge) {
  res.cookies.set(COOKIE, token, { httpOnly: true, sameSite: 'strict', secure: isSecureRequest(request), path: '/', maxAge });
}

export async function POST(request) {
  if (!isLocalMode()) return fail('Not found', 404);
  if (!sameOrigin(request) || !isJson(request)) return fail('Request blocked', 403);
  const raw = await request.text();
  if (raw.length > 4000) return fail('Request too large', 413);
  let body; try { body = JSON.parse(raw); } catch { return fail('Invalid request', 400); }
  const ip = clientIp(request);
  const token = request.cookies.get(COOKIE)?.value;

  if (body.action === 'logout') {
    destroySession(token); audit('logout', ip);
    const res = NextResponse.json({ ok: true }); setCookie(res, request, '', 0); return res;
  }

  // A password must never cross a network in clear text: from another device, sign-in needs HTTPS
  if (['login', 'change'].includes(body.action) && !adminAllowed(request)) {
    audit('login_blocked_insecure', ip);
    return fail('Admin sign-in is only allowed from the computer running the site, or over HTTPS.', 403);
  }

  if (body.action === 'login') {
    // Lock out after 5 wrong passwords from one address for 15 minutes. Failures from other devices also count toward a
    // site-wide limit (100), but that limit never blocks the owner signing in on this computer.
    const wait = Math.max(lockedFor(`ip:${ip}`), isLoopback(ip) ? 0 : lockedFor('global'));
    if (wait) { audit('login_locked', ip); return fail(`Too many attempts. Try again in ${wait} minute${wait > 1 ? 's' : ''}.`, 429, { 'Retry-After': String(wait * 60) }); }
    if (!allow(`login:${ip}`, 30, 60 * 1000)) return fail('Too many requests. Slow down.', 429);
    if (!verifyPassword(body.password)) {
      recordFailure(`ip:${ip}`, 5); if (!isLoopback(ip)) recordFailure('global', 100); audit('login_failed', ip);
      return fail('Incorrect password.', 401);
    }
    clearFailures(`ip:${ip}`); audit('login_ok', ip);
    const res = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    setCookie(res, request, createSession(ip), SESSION_MS / 1000);
    return res;
  }

  if (body.action === 'change') {
    if (!verifySession(token)) return fail('Please log in again', 401);
    if (!allow(`change:${ip}`, 10, 15 * 60 * 1000)) return fail('Too many attempts.', 429);
    const next = String(body.next || '');
    if (!verifyPassword(body.current)) { audit('password_change_failed', ip); return fail('Current password is incorrect.', 401); }
    if (next.length < 10 || next.length > 200) return fail('New password must be at least 10 characters.', 400);
    if (!/[a-z]/i.test(next) || !/\d/.test(next)) return fail('Use letters and at least one number.', 400);
    if (next === body.current) return fail('Choose a different password.', 400);
    setPassword(next); destroySessions(token); audit('password_changed', ip); // signs out every other device
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  }
  return fail('Unknown action', 400);
}
