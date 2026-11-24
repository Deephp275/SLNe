const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { watch, fakeIp } = require('./helpers');

const PAGES = ['/', '/products', '/products/greenply-plywood', '/gallery', '/contact', '/quotation', '/admin/login'];
const SIZES = [{ n: 'phone 375px', width: 375, height: 812 }, { n: 'tablet 768px', width: 768, height: 1024 }, { n: 'desktop 1280px', width: 1280, height: 800 }];

test.beforeEach(async ({ context }) => { await context.setExtraHTTPHeaders({ 'X-Forwarded-For': fakeIp() }); });

for (const s of SIZES) {
  test.describe(`R1 ${s.n}`, () => {
    test.use({ viewport: { width: s.width, height: s.height } });
    for (const p of PAGES) {
      test(`R1 ${s.n} ${p}: no sideways scrolling, content visible`, async ({ page }) => {
        const errors = watch(page);
        await page.goto(p);
        await page.waitForLoadState('networkidle');
        const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
        expect(m.sw, `page is ${m.sw}px wide in a ${m.iw}px window`).toBeLessThanOrEqual(m.iw + 1);
        await expect(page.locator('h1')).toBeVisible();
        expect(errors.filter((e) => !/google|ERR_FAILED/.test(e))).toEqual([]);   // Google's map frame logs its own cross-origin error
      });
    }
    test(`R1 ${s.n} navigation style is right for the screen size`, async ({ page }) => {
      await page.goto('/');
      const burger = page.getByRole('button', { name: 'Toggle menu' });
      const desktopNav = page.locator('header nav[aria-label="Main"]');
      if (s.width < 1024) {
        await expect(burger).toBeVisible(); await expect(desktopNav).toBeHidden();
        await burger.click();
        await expect(page.locator('header nav[aria-label="Mobile"]').getByRole('link', { name: 'Products' })).toBeVisible();
        await page.locator('header nav[aria-label="Mobile"]').getByRole('link', { name: 'Products' }).click();
        await expect(page).toHaveURL(/\/products$/);
      } else { await expect(desktopNav).toBeVisible(); await expect(burger).toBeHidden(); }
    });
  });
}

test.describe('X1 accessibility (axe): no serious or critical problems', () => {
  test.use({ viewport: { width: 1280, height: 800 } });
  for (const p of PAGES) {
    test(`X1 ${p}`, async ({ page }) => {
      await page.goto(p); await page.waitForLoadState('networkidle');
      const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      const bad = res.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
      expect(bad.map((v) => `${v.id} (${v.impact}, ${v.nodes.length} place${v.nodes.length > 1 ? 's' : ''}): ${v.help}`)).toEqual([]);
    });
  }
});

test.describe('P1 basic performance', () => {
  test.use({ viewport: { width: 1280, height: 800 } });
  for (const p of ['/', '/products', '/products/greenply-plywood', '/gallery', '/contact']) {
    test(`P1 ${p}: loads under 4s, modest JavaScript and images`, async ({ page }) => {
      await page.goto(p); await page.waitForLoadState('networkidle');
      const m = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0];
        const res = performance.getEntriesByType('resource');
        const sum = (f) => res.filter(f).reduce((a, r) => a + (r.transferSize || r.encodedBodySize || 0), 0);
        return { load: Math.round(nav.loadEventEnd), js: sum((r) => r.name.endsWith('.js')), img: sum((r) => /\.(png|jpe?g|svg|webp|gif)/.test(r.name) || r.initiatorType === 'img'), maxImg: Math.max(0, ...res.filter((r) => r.initiatorType === 'img').map((r) => r.transferSize || r.encodedBodySize || 0)) };
      });
      expect(m.load, `load took ${m.load} ms`).toBeLessThan(4000);
      expect(m.js, `JavaScript downloaded: ${Math.round(m.js / 1024)} KB`).toBeLessThan(350 * 1024);
      expect(m.img, `images downloaded: ${Math.round(m.img / 1024)} KB`).toBeLessThan(2.5 * 1024 * 1024);
      expect(m.maxImg, `largest image: ${Math.round(m.maxImg / 1024)} KB`).toBeLessThan(600 * 1024);
    });
  }
});


test.describe('P2 phone smoothness (the "menu hangs on my phone" fixes)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('P2 menu is a floating panel: opening it does not push the page down, and the header has no blur effect', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);                        // fonts finishing can nudge text by a pixel or two
    await page.waitForTimeout(1200);                                       // let the page fade-in finish
    const top = () => page.locator('main h1').evaluate((h) => Math.round(h.getBoundingClientRect().top * 10) / 10);
    const before = await top();
    expect(await page.locator('header').evaluate((h) => getComputedStyle(h).backdropFilter), 'header must not use backdrop blur').toBe('none');
    await page.getByRole('button', { name: 'Toggle menu' }).tap();
    await expect(page.locator('header nav[aria-label="Mobile"]').getByRole('link', { name: 'Products' })).toBeVisible();
    const moved = Math.abs((await top()) - before);
    expect(moved, `page content moved ${moved}px when the menu opened (a pushing menu moves it by hundreds)`).toBeLessThan(4);
    await page.locator('header nav[aria-label="Mobile"]').getByRole('link', { name: 'Products' }).tap();
    await expect(page).toHaveURL(/\/products$/);
    await expect(page.locator('header nav[aria-label="Mobile"]').getByRole('link', { name: 'Products' })).toBeHidden();   // closes after choosing
  });
  test('P2 no heavy SVG-filter pictures are loaded on public pages (they are slow on phones)', async ({ page }) => {
    const svgs = [];
    page.on('response', (r) => { if (/\.svg(\?|$)/i.test(r.url()) || (r.headers()['content-type'] || '').includes('image/svg')) svgs.push(r.url()); });
    for (const p of ['/', '/products', '/gallery', '/products/greenply-plywood']) { await page.goto(p); await page.waitForLoadState('networkidle'); }
    expect(svgs, 'SVG pictures loaded').toEqual([]);
  });
  test('P2 pictures are sent as light, resized files (largest picture under 250 KB on a phone)', async ({ page }) => {
    const sizes = [];
    page.on('response', async (r) => { if ((r.headers()['content-type'] || '').startsWith('image/')) sizes.push(Number(r.headers()['content-length'] || (await r.body()).length)); });
    await page.goto('/products'); await page.waitForLoadState('networkidle');
    for (let y = 0; y < 5000; y += 600) { await page.evaluate((y) => window.scrollTo(0, y), y); await page.waitForTimeout(80); }
    await page.waitForLoadState('networkidle');
    expect(sizes.length).toBeGreaterThan(3);
    expect(Math.max(...sizes) / 1024, `largest picture ${Math.round(Math.max(...sizes) / 1024)} KB`).toBeLessThan(250);
  });
});