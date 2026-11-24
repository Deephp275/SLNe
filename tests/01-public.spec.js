const { test, expect } = require('@playwright/test');
const { BASE, watch, fakeIp } = require('./helpers');

const ROUTES = ['/', '/about', '/products', '/brands', '/gallery', '/quotation', '/contact'];
let SLUGS = [];

test.beforeAll(async ({ request }) => {
  const xml = await (await request.get('/sitemap.xml')).text();
  SLUGS = [...new Set([...xml.matchAll(/\/products\/([a-z0-9-]+)/g)].map((m) => m[1]))];
});
test.beforeEach(async ({ context }) => { await context.setExtraHTTPHeaders({ 'X-Forwarded-For': fakeIp() }); });

// Google's own map frame raises a cross-origin error inside the iframe; that is not this site's code
const ignorable = (e) => /google\.com|googleapis|gstatic|ERR_FAILED/.test(e);

test.describe('F1 every public page loads cleanly', () => {
  for (const route of ROUTES) {
    test(`F1 ${route} loads: 200, title, one h1, no console errors`, async ({ page }) => {
      const errors = watch(page);
      const r = await page.goto(route);
      expect(r.status()).toBe(200);
      expect((await page.title()).length).toBeGreaterThan(3);
      await expect(page.locator('h1')).toHaveCount(1);
      await page.waitForLoadState('networkidle');
      expect(errors.filter((e) => !ignorable(e))).toEqual([]);
    });
  }
});

test('F2 header navigation reaches every page', async ({ page }) => {
  await page.goto('/');
  const nav = page.locator('header nav[aria-label="Main"]');
  for (const [name, url] of [['About Us', '/about'], ['Products', '/products'], ['Brands', '/brands'], ['Gallery', '/gallery'], ['Contact', '/contact'], ['Home', '/']]) {
    await nav.getByRole('link', { name, exact: true }).click();
    await expect(page).toHaveURL(BASE + url);
    await expect(page.locator('h1')).toHaveCount(1);
  }
  await nav.getByRole('link', { name: 'Get a Quote' }).click();
  await expect(page).toHaveURL(BASE + '/quotation');
});

test('F3 homepage: headline, 3 category cards, no selected-products section', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('BUILD WITH QUALITY');
  const cards = page.locator('main a[href^="/products?category="]');   // footer repeats these links, so count only the page body
  expect(await cards.count()).toBe(3);
  await expect(page.getByText('Selected Products')).toHaveCount(0);
  await expect(page.getByText('Featured')).toHaveCount(0);
});

test('F3 no prices or hardware anywhere on the public site', async ({ page }) => {
  for (const route of [...ROUTES, ...SLUGS.map((s) => `/products/${s}`)]) {
    await page.goto(route);
    const text = await page.locator('body').innerText();
    expect(text, `${route} shows a price symbol`).not.toContain('₹');
    expect(text.toLowerCase(), `${route} mentions per sq ft`).not.toMatch(/per sq ?ft|\/ sq ft|request price/);
    expect(text.toLowerCase(), `${route} mentions hardware`).not.toContain('hardware');
  }
});

test.describe('F4 product filters', () => {
  test('F4 default view shows 3 sections and 9 products', async ({ page }) => {
    await page.goto('/products');
    await expect(page.locator('article')).toHaveCount(9);
    await expect(page.locator('section[id]')).toHaveCount(3);
  });
  test('F4 choosing Plywood limits categories, brands and thickness to plywood', async ({ page }) => {
    await page.goto('/products?category=plywood');
    await expect(page.locator('article')).toHaveCount(4);
    const cats = await page.locator('#c option').allTextContents();
    expect(cats.join('|')).not.toMatch(/Laminates|Timber/);
    expect(cats.join('|')).toMatch(/Marine Plywood/);
    expect(await page.locator('#b option').allTextContents()).toEqual(['All brands', 'Cubixa', 'Greenply', 'Jansathi', 'Kitply']);
    expect(await page.locator('#t option').allTextContents()).toEqual(['Any', '6 mm', '12 mm', '19 mm']);
  });
  test('F4 laminates hides empty brand/thickness filters and shows 4 products', async ({ page }) => {
    await page.goto('/products?category=laminates');
    await expect(page.locator('article')).toHaveCount(4);
    await expect(page.locator('#b')).toHaveCount(0);
    await expect(page.locator('#t')).toHaveCount(0);
  });
  test('F4 search, thickness, clear and empty state', async ({ page }) => {
    await page.goto('/products');
    await page.locator('#s').fill('kitply');
    await expect(page.locator('article')).toHaveCount(1);
    await page.locator('#s').fill('zzzz-no-such-product');
    await expect(page.getByText('No products match your filters.')).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page.locator('article')).toHaveCount(9);
    await page.locator('#t').selectOption('12 mm');
    await expect(page.locator('article')).toHaveCount(2);
  });
});

test.describe('F5 product pages', () => {
  test('F5 all 9 products render with image, name and a working WhatsApp enquiry', async ({ page }) => {
    expect(SLUGS.length).toBe(9);
    for (const slug of SLUGS) {
      const errors = watch(page);
      const r = await page.goto(`/products/${slug}`);
      expect(r.status(), slug).toBe(200);
      await expect(page.locator('h1')).not.toBeEmpty();
      const img = page.locator('main img').first();
      await expect(img).toBeVisible();
      expect(await img.evaluate((i) => i.naturalWidth), `${slug} image did not load`).toBeGreaterThan(0);
      const wa = page.getByRole('link', { name: 'Enquire on WhatsApp' });
      const href = await wa.getAttribute('href');
      expect(href, slug).toMatch(/^https:\/\/wa\.me\/91\d{10}\?text=/);
      expect(decodeURIComponent(href.split('text=')[1])).toContain(await page.locator('h1').innerText());
      expect(errors.filter((e) => !ignorable(e)), slug).toEqual([]);
    }
  });
  test('F5 thickness and quantity go into the WhatsApp message', async ({ page }) => {
    await page.goto('/products/greenply-plywood');
    await page.locator('#var').selectOption({ label: '12 mm' });
    await page.locator('#qty').fill('25 sheets');
    await page.locator('#m').fill('Need delivery & fast');
    const href = await page.getByRole('link', { name: 'Enquire on WhatsApp' }).getAttribute('href');
    const msg = decodeURIComponent(href.split('text=')[1]);
    expect(msg).toContain('Product: Greenply Plywood');
    expect(msg).toContain('Brand: Greenply');
    expect(msg).toContain('Thickness/Size: 12 mm');
    expect(msg).toContain('Required quantity: 25 sheets');
    expect(msg).toContain('Need delivery & fast');
  });
  test('F5 "Add to Bulk Quotation" pre-fills the quotation form', async ({ page }) => {
    await page.goto('/products/kitply-plywood');
    await page.locator('#var').selectOption({ label: '6 mm' });
    await page.getByRole('link', { name: 'Add to Bulk Quotation' }).click();
    await expect(page).toHaveURL(/\/quotation\?product=/);
    await expect(page.getByPlaceholder('Product name').first()).toHaveValue('Kitply Plywood (6 mm)');
  });
});

test('F6 gallery: category chips filter and photo opens/closes', async ({ page }) => {
  await page.goto('/gallery');
  const all = await page.locator('main button img').count();
  expect(all).toBe(9);
  await page.getByRole('button', { name: 'Timber', exact: true }).click();
  await expect(page.locator('main button:has(img)')).toHaveCount(2);
  await page.locator('main button:has(img)').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('F7 contact page: address, 3 people with call + WhatsApp, Google-only map', async ({ page }) => {
  await page.goto('/contact');
  await expect(page.locator('address')).toContainText('Nagarabhavi Main Rd');
  const tels = await page.locator('main a[href^="tel:"]').evaluateAll((a) => [...new Set(a.map((x) => x.getAttribute('href')))]);
  expect(tels.sort()).toEqual(['tel:+919448588588', 'tel:+919535252660', 'tel:+919986480096']);
  const was = await page.locator('main li a[href^="https://wa.me/91"]').count();
  expect(was).toBe(3);
  const src = await page.locator('iframe').getAttribute('src');
  expect(new URL(src).hostname).toBe('www.google.com');
  await expect(page.getByText('Not added yet')).toHaveCount(0);                 // L9: no placeholder text shown to visitors
});

test('F8 SEO: sitemap, robots, JSON-LD, canonical', async ({ page, request }) => {
  const xml = await (await request.get('/sitemap.xml')).text();
  for (const s of SLUGS) expect(xml).toContain(`/products/${s}`);
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toMatch(/Disallow: \/admin/);
  expect(robots).toMatch(/Sitemap:/);
  await page.goto('/products/cubixa-plywood');
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(ld.length).toBeGreaterThan(0);
  for (const j of ld) expect(() => JSON.parse(j)).not.toThrow();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/products\/cubixa-plywood$/);
});

test('F9 unknown page and unknown product show the 404 page', async ({ page }) => {
  for (const url of ['/no-such-page', '/products/does-not-exist']) {
    const r = await page.goto(url);
    expect(r.status(), url).toBe(404);
    await expect(page.getByText(/not found|404/i).first()).toBeVisible();
  }
});

test('F2 header stays visible while scrolling (sticky)', async ({ page }) => {
  await page.goto('/products');
  await page.evaluate(() => window.scrollTo(0, 1500));
  await expect(page.locator('header')).toBeInViewport();
});
