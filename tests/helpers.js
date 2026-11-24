// Shared helpers. The admin password is read from .env.test here and is NEVER printed or logged.
const fs = require('fs');
const path = require('path');
const { request } = require('@playwright/test');

const BASE = 'http://localhost:3100';          // the PRIVATE test copy of the site (see tests/start-test-server.js)
const root = path.join(__dirname, '..');
const dataDir = path.join(root, 'data-test');     // the test site's own data folder (never your real data)

function adminPassword() {
  const t = fs.readFileSync(path.join(root, '.env.test'), 'utf8');
  const m = /^LOCAL_ADMIN_PASSWORD=(.*)$/m.exec(t);
  if (!m) throw new Error('LOCAL_ADMIN_PASSWORD missing from .env.test');
  return m[1].trim();
}

let n = 10;
// Each test gets its own fake visitor address so the site's per-address rate limits do not affect other tests
const fakeIp = () => `198.51.100.${(n = (n % 240) + 1)}`;

const headers = (ip) => ({ Origin: BASE, 'X-Forwarded-For': ip || fakeIp() });

async function api(ip) {
  return request.newContext({ baseURL: BASE, extraHTTPHeaders: headers(ip) });
}

// Logs in through the real login API; the returned context carries the session cookie.
async function adminApi() {
  const ctx = await api();
  const r = await ctx.post('/api/local/auth', { data: { action: 'login', password: adminPassword() } });
  if (!r.ok()) throw new Error(`admin login failed with status ${r.status()}`);
  return ctx;
}

async function db(ctx, p) {
  const r = await ctx.post('/api/local/db', { data: { select: '*', filters: [], order: [], opts: {}, ...p } });
  return { status: r.status(), body: await r.json() };
}

async function loginPage(page) {
  const r = await page.request.post('/api/local/auth', { headers: { Origin: BASE }, data: { action: 'login', password: adminPassword() } });
  if (!r.ok()) throw new Error(`browser login failed: ${r.status()}`);
}

// Collects console errors and failed requests while a page is used
function watch(page) {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  // Cancelled background prefetches (user navigated away) are normal, not failures
  page.on('requestfailed', (r) => { if (r.failure()?.errorText !== 'net::ERR_ABORTED') errors.push(`failed: ${r.url()}`); });
  page.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('/_next/image')) errors.push(`http ${r.status()}: ${r.url()}`); });
  return errors;
}

module.exports = { BASE, root, dataDir, adminPassword, fakeIp, headers, api, adminApi, db, loginPage, watch };
