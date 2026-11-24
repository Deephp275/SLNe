// Tests the launch settings themselves. Each test starts its own copy of the site on another port,
// exactly as a user would run it, so the main test server's special test settings do not hide problems.
const { test, expect, request } = require('@playwright/test');
const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const { adminPassword, root, dataDir } = require('./helpers');

async function startServer(env, port) {
  const child = spawn(process.execPath, ['server.js', '--prod'], { cwd: root, env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', TRUST_PROXY: '0', ALLOW_INSECURE_ADMIN: '0', DATA_DIR: dataDir, ...env }, stdio: 'ignore', windowsHide: true });
  for (let i = 0; i < 100; i++) {
    try { const r = await fetch(`http://127.0.0.1:${port}/robots.txt`, { signal: AbortSignal.timeout(1500) }); if (r.ok) break; } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return { stop: () => child.kill() };
}
const lanIp = () => Object.values(os.networkInterfaces()).flat().find((i) => i && i.family === 'IPv4' && !i.internal)?.address;
const ctx = (base, extra = {}) => request.newContext({ baseURL: base, extraHTTPHeaders: { Origin: base, ...extra } });
const login = (c, password) => c.post('/api/local/auth', { data: { action: 'login', password } });

test.describe.configure({ timeout: 120000 });

test('H1 default start is reachable from this computer only, not from the network address', async () => {
  const ip = lanIp(); test.skip(!ip, 'no network address on this PC');
  const s = await startServer({}, 3101);
  try {
    expect((await fetch('http://127.0.0.1:3101/', { signal: AbortSignal.timeout(8000) })).status).toBe(200);
    const viaLan = await fetch(`http://${ip}:3101/`, { signal: AbortSignal.timeout(5000) }).then((r) => r.status).catch(() => 'refused');
    expect(viaLan, `the site answered on ${ip}`).toBe('refused');
  } finally { s.stop(); }
});

test('H1 "share on network" shows the public site, but admin sign-in stays refused from other devices', async () => {
  const ip = lanIp(); test.skip(!ip, 'no network address on this PC');
  const s = await startServer({ HOST: '0.0.0.0' }, 3101);
  try {
    expect((await fetch(`http://${ip}:3101/`, { signal: AbortSignal.timeout(8000) })).status).toBe(200);          // public pages visible
    const c = await ctx(`http://${ip}:3101`);
    const r = await login(c, adminPassword());                                                                      // correct password, but from a "network" address over http
    expect(r.status()).toBe(403);
    expect(r.headers()['set-cookie']).toBeUndefined();
    await c.dispose();
    const local = await ctx('http://127.0.0.1:3101');                                                               // same server, from this computer
    expect((await login(local, adminPassword())).status()).toBe(200);
    await local.dispose();
  } finally { s.stop(); }
});

test('M4 a faked X-Forwarded-For header no longer dodges the login lock', async () => {
  const s = await startServer({}, 3101);
  try {
    const codes = [];
    for (let i = 0; i < 8; i++) { const c = await ctx('http://127.0.0.1:3101', { 'X-Forwarded-For': `192.0.2.${100 + i}` }); codes.push((await login(c, `guess-${i}`)).status()); await c.dispose(); }
    expect(codes, `8 guesses with 8 fake addresses: ${codes.join(',')}`).toEqual([401, 401, 401, 401, 401, 429, 429, 429]);
  } finally { s.stop(); }
});

test('M4 a faked X-Forwarded-For header no longer dodges the enquiry rate limit', async () => {
  const s = await startServer({}, 3101);
  try {
    const codes = [];
    for (let i = 0; i < 14; i++) { const c = await ctx('http://127.0.0.1:3101', { 'X-Forwarded-For': `192.0.2.${10 + i}` }); codes.push((await c.post('/api/enquiry', { data: { customer_name: '', phone: '1', requirements: '' } })).status()); await c.dispose(); }
    expect(codes, `14 requests with 14 fake addresses: ${codes.join(',')}`).toContain(429);
  } finally { s.stop(); }
});

test('M1 behind an HTTPS proxy: sign-in over plain HTTP from another device is refused, over HTTPS it works and the cookie is Secure + HSTS', async () => {
  const s = await startServer({ TRUST_PROXY: '1' }, 3102);
  try {
    const remote = { 'X-Forwarded-For': '203.0.113.77' };
    const plain = await ctx('http://127.0.0.1:3102', { ...remote, 'X-Forwarded-Proto': 'http' });
    const r1 = await login(plain, adminPassword()); expect(r1.status()).toBe(403); await plain.dispose();
    const tls = await ctx('http://127.0.0.1:3102', { ...remote, 'X-Forwarded-Proto': 'https' });
    const r2 = await login(tls, adminPassword());
    expect(r2.status()).toBe(200);
    expect(r2.headers()['set-cookie']).toMatch(/Secure/i);
    expect(r2.headers()['set-cookie']).toMatch(/HttpOnly/i);
    expect(r2.headers()['strict-transport-security']).toMatch(/max-age=\d+/);
    await tls.dispose();
  } finally { s.stop(); }
});

test('M1 from this computer over plain http, sign-in works and the cookie is not Secure (localhost is exempt)', async () => {
  const s = await startServer({}, 3101);
  try {
    const c = await ctx('http://127.0.0.1:3101');
    const r = await login(c, adminPassword());
    expect(r.status()).toBe(200);
    expect(r.headers()['set-cookie']).toMatch(/HttpOnly/i);
    await c.dispose();
  } finally { s.stop(); }
});
