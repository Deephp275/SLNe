const { test, expect, request } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { BASE, adminPassword, api, headers, root, dataDir } = require('./helpers');

const ADMIN_PAGES = ['/admin', '/admin/products', '/admin/categories', '/admin/brands', '/admin/inventory', '/admin/enquiries', '/admin/quotations', '/admin/gallery', '/admin/settings', '/admin/account'];

test.describe('A1 visitor cannot open any admin page', () => {
  for (const p of ADMIN_PAGES) {
    test(`A1 ${p} redirects to login`, async ({ page }) => {
      await page.goto(p);
      await expect(page).toHaveURL(BASE + '/admin/login');
      await expect(page.getByLabel('Password')).toBeVisible();
    });
  }
});

test('A2 wrong password shows an error and gives no session', async ({ page, context }) => {
  await context.setExtraHTTPHeaders({ 'X-Forwarded-For': '203.0.113.100' });
  await page.goto('/admin/login');
  await page.getByLabel('Password').fill('definitely-wrong-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Incorrect password.')).toBeVisible();
  expect((await context.cookies()).find((c) => c.name === 'sln_session')).toBeUndefined();
  await page.goto('/admin');
  await expect(page).toHaveURL(BASE + '/admin/login');
});

test('A3/A4 correct password logs in (secure cookie), logout ends the session', async ({ page, context }) => {
  await context.setExtraHTTPHeaders({ 'X-Forwarded-For': '203.0.113.101' });
  await page.goto('/admin/login');
  await expect(page.getByLabel('Password')).toHaveAttribute('type', 'password');
  await page.getByLabel('Password').fill(adminPassword());
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(BASE + '/admin');
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
  const c = (await context.cookies()).find((x) => x.name === 'sln_session');
  expect(c, 'session cookie missing').toBeTruthy();
  expect(c.httpOnly, 'cookie must be HttpOnly').toBe(true);
  expect(c.sameSite, 'cookie must be SameSite=Strict').toBe('Strict');
  expect(c.value).toMatch(/^[a-f0-9]{64}$/);
  await page.getByRole('button', { name: 'Log out' }).first().click();
  await expect(page).toHaveURL(BASE + '/admin/login');
  await page.goto('/admin/products');
  await expect(page).toHaveURL(BASE + '/admin/login');
  const r = await page.request.post('/api/local/db', { headers: { Origin: BASE }, data: { table: 'products', op: 'select' } });
  expect(r.status()).toBe(401);
});

test('A5 forged session cookie is refused', async ({ browser }) => {
  const ctx = await browser.newContext({ baseURL: BASE });
  await ctx.addCookies([{ name: 'sln_session', value: 'a'.repeat(64), url: BASE }]);
  const page = await ctx.newPage();
  await page.goto('/admin/products');
  await expect(page).toHaveURL(BASE + '/admin/login');
  const r = await ctx.request.post('/api/local/db', { headers: { Origin: BASE }, data: { table: 'products', op: 'select' } });
  expect(r.status()).toBe(401);
  await ctx.close();
});

test('A6 expired session is refused', async () => {
  const ctx = await api('203.0.113.102');
  expect((await ctx.post('/api/local/auth', { data: { action: 'login', password: adminPassword() } })).status()).toBe(200);
  expect((await ctx.get('/admin', { maxRedirects: 0 })).status()).toBe(200);
  const f = path.join(dataDir, 'sessions.json');           // make every stored session "expired"
  const s = JSON.parse(fs.readFileSync(f, 'utf8')); Object.values(s).forEach((v) => { v.exp = 1; }); fs.writeFileSync(f, JSON.stringify(s));
  expect((await ctx.get('/admin', { maxRedirects: 0 })).status()).toBe(307);
  expect((await ctx.post('/api/local/db', { data: { table: 'products', op: 'select' } })).status()).toBe(401);
  await ctx.dispose();
});

test('A7 locked after 5 wrong passwords, even the right password is refused during the lock', async () => {
  const ip = '203.0.113.150';
  const codes = [];
  for (let i = 0; i < 6; i++) { const c = await api(ip); codes.push((await c.post('/api/local/auth', { data: { action: 'login', password: `wrong-${i}` } })).status()); await c.dispose(); }
  expect(codes).toEqual([401, 401, 401, 401, 401, 429]);
  const c = await api(ip);
  expect((await c.post('/api/local/auth', { data: { action: 'login', password: adminPassword() } })).status()).toBe(429);
  await c.dispose();
});

test('A8 change-password form rejects wrong current and weak new passwords (nothing is changed)', async () => {
  const ctx = await api('203.0.113.103');
  await ctx.post('/api/local/auth', { data: { action: 'login', password: adminPassword() } });
  expect((await ctx.post('/api/local/auth', { data: { action: 'change', current: 'not-the-password', next: 'Another-Good-Pass-1' } })).status()).toBe(401);
  expect((await ctx.post('/api/local/auth', { data: { action: 'change', current: adminPassword(), next: 'short1' } })).status()).toBe(400);
  expect((await ctx.post('/api/local/auth', { data: { action: 'change', current: adminPassword(), next: 'longbutnonumber' } })).status()).toBe(400);
  await ctx.dispose();
});

test('A9 there is no public signup route', async ({ request: r }) => {
  // /admin/* sends visitors to the login page (307); everything else must simply not exist (404)
  for (const p of ['/signup', '/register', '/api/auth/signup']) expect((await r.get(p, { maxRedirects: 0 })).status(), p).toBe(404);
  expect((await r.get('/admin/signup', { maxRedirects: 0 })).status()).toBe(307);
});

test('L7 only the exact login page is public: look-alike admin paths still require sign-in', async ({ request: r }) => {
  for (const p of ['/admin/login-x', '/admin/loginfoo', '/admin/login/../products']) expect((await r.get(p, { maxRedirects: 0 })).status(), p).toBe(307);
});
