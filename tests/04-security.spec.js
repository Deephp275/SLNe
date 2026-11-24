const { test, expect, request } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { BASE, root, dataDir, api, adminApi, db, headers } = require('./helpers');

let admin;
test.beforeAll(async () => { admin = await adminApi(); });
test.afterAll(async () => { await admin.dispose(); });

const LEAK = /(\bat\s+\S+\s+\(.*:\d+:\d+\)|[A-Z]:\\|node_modules|\.next[\\/]|webpack-internal|ENOENT|SyntaxError|Unexpected token)/;
const SEL = { filters: [], order: [], opts: {} };

test.describe('Z authorization', () => {
  test('Z1 every admin API refuses a visitor (401)', async () => {
    const v = await api();
    expect((await v.post('/api/local/db', { data: { table: 'enquiries', op: 'select', ...SEL } })).status()).toBe(401);
    expect((await v.post('/api/local/upload', { multipart: { file: { name: 'a.png', mimeType: 'image/png', buffer: Buffer.from('x') } } })).status()).toBe(401);
    expect((await v.post('/api/local/auth', { data: { action: 'change', current: 'x', next: 'Abcdefghij1' } })).status()).toBe(401);
    await v.dispose();
  });
  test('Z2 requests from another website are refused (403) even with a valid session', async () => {
    const evil = await request.newContext({ baseURL: BASE, extraHTTPHeaders: { Origin: 'http://evil.example' } });
    const login = await admin.storageState();
    const ctx = await request.newContext({ baseURL: BASE, storageState: login, extraHTTPHeaders: { Origin: 'http://evil.example' } });
    expect((await ctx.post('/api/local/db', { data: { table: 'products', op: 'select', ...SEL } })).status()).toBe(403);
    expect((await evil.post('/api/enquiry', { data: { customer_name: 'QA TEST evil', phone: '9999999999', requirements: 'x' } })).status()).toBe(403);
    expect((await evil.post('/api/local/auth', { data: { action: 'login', password: 'x' } })).status()).toBe(403);
    await ctx.dispose(); await evil.dispose();
  });
  test('Z3 the secret "admins" table is not reachable through the data API', async () => {
    expect((await db(admin, { table: 'admins', op: 'select' })).status).toBe(400);
  });
  test('Z4 delete / update of every row without a filter is refused', async () => {
    expect((await db(admin, { table: 'products', op: 'delete', filters: [] })).status).toBe(400);
    expect((await db(admin, { table: 'products', op: 'update', values: { name: 'hacked' }, filters: [] })).status).toBe(400);
  });
  test('Z5 the "skip middleware" header trick does not open /admin', async ({ request: r }) => {
    for (const v of ['middleware', 'middleware:middleware:middleware:middleware:middleware', 'src/middleware:src/middleware:src/middleware:src/middleware:src/middleware']) {
      const res = await r.get('/admin/products', { headers: { 'x-middleware-subrequest': v }, maxRedirects: 0 });
      expect(res.status(), `x-middleware-subrequest: ${v}`).toBe(307);
    }
  });
});

test.describe('S1-S2 headers and error handling', () => {
  test('S1 security headers on pages and APIs', async ({ request: r }) => {
    for (const u of ['/', '/admin/login', '/products/greenply-plywood']) {
      const h = (await r.get(u)).headers();
      expect(h['content-security-policy'], u).toContain("frame-ancestors 'none'");
      expect(h['content-security-policy'], u).toContain("object-src 'none'");
      expect(h['x-frame-options'], u).toBe('DENY');
      expect(h['x-content-type-options'], u).toBe('nosniff');
      expect(h['referrer-policy'], u).toBeTruthy();
      expect(h['x-powered-by'], u).toBeUndefined();
    }
  });
  test('S1 CSP does not allow inline script injection (no unsafe-inline for scripts)', async ({ request: r }) => {
    const csp = (await r.get('/')).headers()['content-security-policy'];
    const script = csp.split(';').map((s) => s.trim()).find((s) => s.startsWith('script-src'));
    expect(script, `script-src is: ${script}`).not.toContain("'unsafe-inline'");
  });
  test('S1 session cookie is flagged Secure when served over HTTPS (checked via forwarded proto)', async () => {
    const c = await api('203.0.113.110');
    const res = await c.post('/api/local/auth', { headers: { 'X-Forwarded-Proto': 'https' }, data: { action: 'login', password: require('./helpers').adminPassword() } });
    expect(res.headers()['set-cookie']).toMatch(/Secure/i);
    await c.dispose();
  });
  test('S2 malformed, wrong-type and oversized requests are refused without leaking internals', async () => {
    const c = await api();
    const bodies = [];
    const r1 = await c.post('/api/enquiry', { headers: { 'Content-Type': 'application/json' }, data: '{ not json' });
    bodies.push([r1.status(), await r1.text()]);
    const r2 = await c.post('/api/enquiry', { headers: { 'Content-Type': 'text/plain' }, data: 'hello' });
    bodies.push([r2.status(), await r2.text()]);
    const r3 = await c.post('/api/enquiry', { data: { customer_name: 'a', phone: '9999999999', requirements: 'x'.repeat(200000) } });
    bodies.push([r3.status(), await r3.text()]);
    const r4 = await c.get('/api/enquiry');
    bodies.push([r4.status(), await r4.text()]);
    const r5 = await c.post('/api/enquiry', { data: [1, 2, 3] });
    bodies.push([r5.status(), await r5.text()]);
    expect(bodies.map((b) => b[0])).toEqual([400, 403, 413, 405, 400]);
    for (const [, t] of bodies) expect(t).not.toMatch(LEAK);
    const nf = await (await c.get('/definitely/not/here')).text();
    expect(nf).not.toMatch(LEAK);
    await c.dispose();
  });
  test('S2 admin-API error messages are generic (no file paths or stack traces)', async () => {
    for (const p of [{ table: 'x' }, { table: 'products', op: 'select', select: '*; DROP' }, { table: 'products', op: 'select', limit: -1 }]) {
      const r = await db(admin, p);
      expect(JSON.stringify(r.body)).not.toMatch(LEAK);
    }
  });
  test('S2 no wide-open CORS on any API', async () => {
    const c = await request.newContext({ baseURL: BASE, extraHTTPHeaders: { Origin: 'http://evil.example' } });
    for (const u of ['/api/enquiry', '/api/local/db', '/api/local/auth']) {
      const r = await c.fetch(u, { method: 'OPTIONS' });
      expect(r.headers()['access-control-allow-origin'], u).toBeUndefined();
    }
    await c.dispose();
  });
});

test.describe('S3 query tampering (as admin)', () => {
  test('S3 unknown tables, injected select text, odd columns and object values are refused', async () => {
    const bad = [
      { table: '__proto__', op: 'select' }, { table: 'constructor', op: 'select' },
      { table: 'products', op: 'select', select: "*'; DROP TABLE products;--" },
      { table: 'products', op: 'insert', values: { 'a;b': 1 } },
      { table: 'products', op: 'insert', values: { name: { $gt: '' } } },
      { table: 'products', op: 'select', filters: [['eq', 'name;drop', 'x']] },
      { table: 'products', op: 'select', filters: [['like', 'name', '%']] },
    ];
    const accepted = [];
    for (const p of bad) if ((await db(admin, p)).status !== 400) accepted.push(JSON.stringify(p));
    expect(accepted, 'these tampered requests were NOT refused').toEqual([]);
  });
  test('S3 prototype-pollution keys (__proto__, constructor, prototype) are refused', async () => {
    const accepted = [];
    for (const k of ['__proto__', 'constructor', 'prototype']) {
      const r = await db(admin, { table: 'brands', op: 'insert', values: { name: 'QA TEST proto', slug: `qa-test-proto-${k}`, [k]: 'x' } });
      if (r.status !== 400) accepted.push(k);
    }
    await db(admin, { table: 'brands', op: 'delete', filters: [['eq', 'name', 'QA TEST proto']] });
    expect(accepted, `these dangerous key names were accepted: ${accepted.join(', ')}`).toEqual([]);
  });
  test('S3 columns that do not exist (e.g. is_admin) are refused, not silently stored', async () => {
    const r = await db(admin, { table: 'brands', op: 'insert', values: { name: 'QA TEST extra', slug: 'qa-test-extra', is_admin: true, __anything: 'x' } });
    await db(admin, { table: 'brands', op: 'delete', filters: [['eq', 'name', 'QA TEST extra']] });
    expect(r.status, 'unknown columns were accepted').toBe(400);
  });
});

test.describe('S4 uploads', () => {
  const up = (ctx, name, mime, buffer) => ctx.post('/api/local/upload', { multipart: { file: { name, mimeType: mime, buffer }, path: 'products/x' } });
  test('S4 text file renamed .jpg is refused', async () => expect((await up(admin, 'a.jpg', 'image/jpeg', Buffer.from('not an image at all, just text'))).status()).toBe(400));
  test('S4 SVG with a script is refused', async () => expect((await up(admin, 'a.svg', 'image/svg+xml', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'))).status()).toBe(400));
  test('S4 HTML disguised as PNG is refused', async () => expect((await up(admin, 'a.png', 'image/png', Buffer.from('<html><script>alert(1)</script></html>'))).status()).toBe(400));
  test('S4 file over 5 MB is refused', async () => {
    const big = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(6 * 1024 * 1024)]);
    expect([400, 413]).toContain((await up(admin, 'big.png', 'image/png', big)).status());
  });
  test('S4 real PNG is accepted, gets a server-chosen name and is served safely', async () => {
    const png = fs.readFileSync(path.join(root, 'public', 'logo.png'));
    const r = await admin.post('/api/local/upload', { multipart: { file: { name: '../../../evil.png', mimeType: 'image/png', buffer: png }, path: '../../evil' } });
    expect(r.status()).toBe(200);
    const p = (await r.json()).path;
    expect(p).toMatch(/^(misc|products)\/\d+-[a-f0-9]{12}\.png$/);
    const get = await (await request.newContext({ baseURL: BASE })).get(`/uploads/${p}`);
    expect(get.status()).toBe(200);
    expect(get.headers()['content-type']).toBe('image/png');
    expect(get.headers()['x-content-type-options']).toBe('nosniff');
    expect(get.headers()['content-security-policy']).toContain('sandbox');
    fs.rmSync(path.join(dataDir, 'uploads', ...p.split('/')), { force: true });
  });
});

test.describe('S5 files that must not be downloadable', () => {
  const must404 = ['/.env.local', '/.env', '/data/db.json', '/data/auth.json', '/data/sessions.json', '/data/audit.log', '/package.json', '/next.config.mjs', '/middleware.js', '/supabase/schema.sql', '/.git/config', '/TEST_PLAN.md', '/lib/local/security.js', '/tests/helpers.js'];
  for (const u of must404) test(`S5 ${u} is not served`, async ({ request: r }) => {
    const res = await r.get(u);
    expect(res.status(), u).toBe(404);
    expect(await res.text()).not.toMatch(/LOCAL_ADMIN_PASSWORD|SUPABASE|scrypt|"hash"/);
  });
  test('S5 path traversal on the uploads route is blocked', async ({ request: r }) => {
    for (const u of ['/uploads/../../.env.local', '/uploads/%2e%2e/%2e%2e/package.json', '/uploads/..%2f..%2fpackage.json', '/uploads/misc/..%5c..%5cpackage.json', '/uploads/.hidden.png']) {
      const res = await r.get(u, { maxRedirects: 0 });
      expect([400, 404, 308], u).toContain(res.status());
      expect(await res.text()).not.toMatch(/"name": "sln-enterprise"|LOCAL_ADMIN/);
    }
  });
});

test('S6 enquiry endpoint is rate limited per visitor', async () => {
  const c = await api('192.0.2.222');
  const codes = [];
  for (let i = 0; i < 11; i++) codes.push((await c.post('/api/enquiry', { data: { customer_name: '', phone: '1', requirements: '' } })).status());
  await c.dispose();
  expect(codes, `status codes: ${codes.join(',')}`).toContain(429);
});

test('M2 a product name containing </script> cannot break out of the page data and run code', async ({ page }) => {
  const evil = '</script><script>window.__jsonld=1</script> QA TEST';
  const made = await db(admin, { table: 'products', op: 'insert', values: { name: evil, slug: 'qa-test-jsonld', is_published: true, description: 'QA TEST' } });
  expect(made.status).toBe(200);
  try {
    const errors = [];
    await page.goto('/products/qa-test-jsonld');
    await page.waitForTimeout(800);
    expect(await page.evaluate(() => window.__jsonld), 'injected script ran').toBeUndefined();
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(ld.some((j) => JSON.parse(j).name === evil), 'search-engine data should keep the text intact').toBe(true);
  } finally { await db(admin, { table: 'products', op: 'delete', filters: [['eq', 'slug', 'qa-test-jsonld']] }); }
});

test('M3 pages carry a per-request nonce policy and inline scripts still work (site hydrates, no CSP violations)', async ({ page }) => {
  const seen = [];
  page.on('console', (m) => { if (/Content Security Policy|violat/i.test(m.text())) seen.push(m.text().slice(0, 160)); });
  const r = await page.goto('/products');
  const csp = r.headers()['content-security-policy'];
  expect(csp).toMatch(/script-src[^;]*'nonce-[A-Za-z0-9+/=]{16,}'/);
  const nonce1 = /'nonce-([^']+)'/.exec(csp)[1];
  const nonce2 = /'nonce-([^']+)'/.exec((await page.goto('/products')).headers()['content-security-policy'])[1];
  expect(nonce1, 'nonce must change on every request').not.toBe(nonce2);
  await page.locator('#c').selectOption({ index: 1 });                       // interactive filter proves JavaScript is running
  await expect(page.locator('article').first()).toBeVisible();
  expect(seen).toEqual([]);
});

test.describe('L fixes', () => {
  test('L1 clients cannot set id / timestamps, and unknown filter or order columns are refused', async () => {
    expect((await db(admin, { table: 'brands', op: 'insert', values: { id: 'custom-id', name: 'QA TEST x', slug: 'qa-test-x' } })).status).toBe(400);
    expect((await db(admin, { table: 'brands', op: 'insert', values: { created_at: '2000-01-01', name: 'QA TEST x', slug: 'qa-test-x2' } })).status).toBe(400);
    expect((await db(admin, { table: 'brands', op: 'select', filters: [['eq', 'password_hash', 'x']] })).status).toBe(400);
    expect((await db(admin, { table: 'brands', op: 'select', order: [{ col: 'secret', ascending: true }] })).status).toBe(400);
  });
  test('L2 "javascript:" and other non-web links are refused in settings; real https links are accepted', async () => {
    const setFb = (value) => db(admin, { table: 'website_settings', op: 'update', values: { value }, filters: [['eq', 'key', 'facebook']] });
    const before = (await db(admin, { table: 'website_settings', op: 'select', select: 'value', filters: [['eq', 'key', 'facebook']] })).body.data[0].value;
    expect((await setFb('javascript:window.__js=1')).status).toBe(400);
    expect((await setFb('data:text/html,<script>1</script>')).status).toBe(400);
    expect((await db(admin, { table: 'website_settings', op: 'update', values: { value: 'https://evil.example/map' }, filters: [['eq', 'key', 'maps_embed_url']] })).status).toBe(400);
    expect((await setFb('https://www.facebook.com/example')).status).toBe(200);
    await setFb(before);
  });
  test('L5 cleanup deletes only unused photos, keeps used ones, and never touches fresh ones by default', async () => {
    const png = fs.readFileSync(path.join(root, 'public', 'logo.png'));
    const up = async () => (await (await admin.post('/api/local/upload', { multipart: { file: { name: 'a.png', mimeType: 'image/png', buffer: png }, path: 'brands/x' } })).json()).path;
    const unused = await up(); const used = await up();
    const file = (p) => path.join(dataDir, 'uploads', ...p.split('/'));
    await db(admin, { table: 'brands', op: 'insert', values: { name: 'QA TEST logo', slug: 'qa-test-logo', logo_url: `/uploads/${used}` } });
    const clean = (minAgeMinutes) => admin.post('/api/local/upload-cleanup', { data: minAgeMinutes === undefined ? {} : { minAgeMinutes } });
    const fresh = await (await clean()).json();                               // default: ignores photos younger than an hour
    expect(fs.existsSync(file(unused)), 'a fresh photo must survive the default clean-up').toBe(true);
    expect(fresh.removed).toBe(0);
    const r = await (await clean(0)).json();
    expect(fs.existsSync(file(unused)), 'unused photo should be deleted').toBe(false);
    expect(fs.existsSync(file(used)), 'photo that a brand uses must stay').toBe(true);
    expect(r.removed).toBeGreaterThanOrEqual(1);
    await db(admin, { table: 'brands', op: 'delete', filters: [['eq', 'slug', 'qa-test-logo']] });
    await clean(0);
    expect(fs.existsSync(file(used))).toBe(false);
    const visitor = await api();
    expect((await visitor.post('/api/local/upload-cleanup', { data: {} })).status()).toBe(401);
    await visitor.dispose();
  });
});