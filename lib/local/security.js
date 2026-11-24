// Server-only security helpers for local mode: password hashing, sessions, rate limits, audit log.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DATA_DIR } from './paths';

const DIR = DATA_DIR;
const AUTH = path.join(DIR, 'auth.json');
const SESS = path.join(DIR, 'sessions.json');
const LOG = path.join(DIR, 'audit.log');
export const SESSION_MS = 8 * 60 * 60 * 1000; // 8 hours, absolute

const read = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const write = (f, v) => { fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(f, JSON.stringify(v), { mode: 0o600 }); };
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');
const SCRYPT = { N: 16384, r: 8, p: 1 };

// ---------- passwords (scrypt, salted, constant-time compare) ----------
function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  return { salt, hash: crypto.scryptSync(pw, salt, 64, SCRYPT).toString('hex') };
}
export function verifyPassword(pw) {
  if (typeof pw !== 'string' || !pw || pw.length > 200) return false;
  let a = read(AUTH, null);
  if (!a) { // first run: the initial password comes from .env.local, is stored hashed, and is never compared in plain text again
    const initial = process.env.LOCAL_ADMIN_PASSWORD;
    if (!initial) return false;
    a = hashPassword(initial); write(AUTH, a);
  }
  const h = crypto.scryptSync(pw, a.salt, 64, SCRYPT);
  return crypto.timingSafeEqual(h, Buffer.from(a.hash, 'hex'));
}
export function setPassword(pw) { write(AUTH, hashPassword(pw)); }

// ---------- sessions (random 256-bit tokens, stored only as hashes) ----------
function prune(s) { const n = Date.now(); Object.keys(s).forEach((k) => { if (s[k].exp < n) delete s[k]; }); return s; }
export function createSession(ip) {
  const token = crypto.randomBytes(32).toString('hex');
  const s = prune(read(SESS, {}));
  s[sha(token)] = { exp: Date.now() + SESSION_MS, ip };
  write(SESS, s);
  return token;
}
export function verifySession(token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return false;
  const r = read(SESS, {})[sha(token)];
  return !!r && r.exp > Date.now();
}
export function destroySessions(except) {
  const s = read(SESS, {}); const keep = except && s[sha(except)] ? { [sha(except)]: s[sha(except)] } : {};
  write(SESS, keep);
}
export function destroySession(token) {
  if (!token) return; const s = read(SESS, {}); delete s[sha(token)]; write(SESS, s);
}

// ---------- rate limiting / lockout (in memory) ----------
const G = globalThis;
G.__slnRate ||= new Map();
G.__slnFail ||= new Map();
export function allow(key, max, windowMs) {
  const now = Date.now(); const e = G.__slnRate.get(key) || { n: 0, t: now };
  if (now - e.t > windowMs) { e.n = 0; e.t = now; }
  e.n += 1; G.__slnRate.set(key, e);
  return e.n <= max;
}
const LOCK_MS = 15 * 60 * 1000;
export function lockedFor(key) { const e = G.__slnFail.get(key); return e && e.until > Date.now() ? Math.ceil((e.until - Date.now()) / 60000) : 0; }
export function recordFailure(key, max) {
  const now = Date.now(); const e = G.__slnFail.get(key) || { n: 0, first: now, until: 0 };
  if (now - e.first > LOCK_MS) { e.n = 0; e.first = now; }
  e.n += 1; if (e.n >= max) { e.until = now + LOCK_MS; e.n = 0; e.first = now; }
  G.__slnFail.set(key, e);
}
export const clearFailures = (key) => G.__slnFail.delete(key);

// ---------- request helpers ----------
// server.js overwrites this header with the real connection address (unless TRUST_PROXY=1), so it cannot be faked by visitors
export const clientIp = (request) => (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
export const isLoopback = (ip) => /^(::1|127\.\d+\.\d+\.\d+|::ffff:127\.\d+\.\d+\.\d+)$/.test(ip);
export const isSecureRequest = (request) => request.nextUrl?.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';
// Admin sign-in (password + session) is only allowed from this computer, or over HTTPS, so a password never crosses a network in clear text.
// ALLOW_INSECURE_ADMIN=1 exists only for automated tests.
export const adminAllowed = (request) => process.env.ALLOW_INSECURE_ADMIN === '1' || isLoopback(clientIp(request)) || isSecureRequest(request);
// CSRF defence: state-changing requests must come from this site's own pages
export function sameOrigin(request) {
  const origin = request.headers.get('origin'); const host = request.headers.get('host');
  if (!origin || !host) return false;
  try { return new URL(origin).host === host; } catch { return false; }
}
export const isJson = (request) => (request.headers.get('content-type') || '').includes('application/json');
export const isAdminRequest = (request) => verifySession(request.cookies.get('sln_session')?.value);

export function audit(event, ip, extra = {}) {
  try { fs.mkdirSync(DIR, { recursive: true }); fs.appendFileSync(LOG, JSON.stringify({ t: new Date().toISOString(), event, ip, ...extra }) + '\n'); } catch {}
}
