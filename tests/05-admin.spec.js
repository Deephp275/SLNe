const { test, expect } = require('@playwright/test');
const path = require('path');
const { BASE, root, adminPassword, adminApi, api, db, loginPage, watch, fakeIp } = require('./helpers');

const PAGES = [['/admin', 'Overview'], ['/admin/products', 'Products'], ['/admin/categories', 'Categories'], ['/admin/brands', 'Brands'], ['/admin/inventory', 'Inventory'],
  ['/admin/enquiries', 'Enquiries'], ['/admin/quotations', 'Quotations'], ['/admin/gallery', 'Gallery'], ['/admin/settings', 'Website Settings'], ['/admin/account', 'Account & Security']];
const LOGO = path.join(root, 'public', 'logo.png');

let admin;
test.beforeAll(async () => { admin = await adminApi(); });
test.afterAll(async () => { await admin.dispose(); });
test.beforeEach(async ({ page, context }) => {
  await context.setExtraHTTPHeaders({ 'X-Forwarded-For': fakeIp() });
  page.on('dialog', (d) => d.accept());
  await loginPage(page);
});

test.describe('M1 every admin page loads', () => {
  for (const [url, heading] of PAGES) {
    test(`M1 ${url} shows "${heading}" with no errors`, async ({ page }) => {
      const errors = watch(page);
      await page.goto(url);
      await expect(page.getByRole('heading', { name: heading, exact: true }).first()).toBeVisible();
      await page.waitForLoadState('networkidle');
      expect(errors).toEqual([]);
    });
  }
});

test('M2 product lifecycle: create (with photo) -> visible on site -> edit -> unpublish -> delete', async ({ page }) => {
  await page.goto('/admin/products');
  await page.getByRole('button', { name: '+ Add product' }).click();
  await page.getByLabel('Product name *').fill('QA TEST Product');
  await page.getByLabel('SKU').fill('QA-TEST-SKU');
  await page.getByLabel('Category', { exact: true }).selectOption({ label: 'Plywood (general)' });
  await page.getByLabel('Brand').selectOption({ label: 'Greenply' });
  await page.getByPlaceholder('19 mm or 3" x 2"').first().fill('19 mm');
  await page.getByLabel('Description').fill('QA TEST description <b>not bold</b>');
  await page.locator('input[type=file]').setInputFiles(LOGO);
  await expect(page.locator('form img').first()).toBeVisible();
  await page.getByLabel('Published (visible on website)').check();
  await page.getByRole('button', { name: 'Save product' }).click();
  await expect(page.getByRole('row', { name: /QA TEST Product/ })).toBeVisible();

  // visible on the public site, photo loads from /uploads
  await page.goto('/products/qa-test-product');
  await expect(page.locator('h1')).toHaveText('QA TEST Product');
  await expect(page.getByText('not bold')).toBeVisible();                  // shown as text, not HTML
  expect(await page.locator('main img').first().evaluate((i) => i.naturalWidth)).toBeGreaterThan(0);
  expect(await page.locator('main img').first().getAttribute('src')).toContain('uploads');

  // edit
  await page.goto('/admin/products');
  await page.getByRole('row', { name: /QA TEST Product/ }).getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Product name *').fill('QA TEST Product Edited');
  await page.getByRole('button', { name: 'Save product' }).click();
  await expect(page.getByRole('row', { name: /QA TEST Product Edited/ })).toBeVisible();

  // unpublish -> 404 publicly
  await page.getByRole('row', { name: /QA TEST Product Edited/ }).getByRole('button', { name: 'Published' }).click();
  await expect(page.getByRole('row', { name: /QA TEST Product Edited/ }).getByRole('button', { name: 'Draft' })).toBeVisible();
  const r = await page.goto('/products/qa-test-product');
  expect(r.status()).toBe(404);

  // delete
  await page.goto('/admin/products');
  await page.getByRole('row', { name: /QA TEST Product Edited/ }).getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('row', { name: /QA TEST Product Edited/ })).toHaveCount(0);
});

test('M3 category and brand create + delete', async ({ page }) => {
  for (const [url, label] of [['/admin/categories', 'QA TEST Category'], ['/admin/brands', 'QA TEST Brand']]) {
    await page.goto(url);
    await page.getByRole('button', { name: '+ Add' }).click();
    await page.getByLabel('Name *').fill(label);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('row', { name: new RegExp(label) })).toBeVisible();
    await page.getByRole('row', { name: new RegExp(label) }).getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByRole('row', { name: new RegExp(label) })).toHaveCount(0);
  }
});

test('M3 duplicate slug is refused with a clear message', async ({ page }) => {
  await page.goto('/admin/brands');
  await page.getByRole('button', { name: '+ Add' }).click();
  await page.getByLabel('Name *').fill('Greenply copy');
  await page.getByLabel('URL slug (auto if empty)').fill('greenply');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText(/already exists|duplicate/i)).toBeVisible();
});

test('M4 enquiry appears in admin; hostile text is shown as text; status change is saved', async ({ page }) => {
  const visitor = await api();
  const evilName = 'QA TEST <img src=x onerror="window.__xss=1">';
  const r = await visitor.post('/api/enquiry', { data: { customer_name: evilName, phone: '9999999999', requirements: 'QA TEST <script>window.__xss=2</script>', items: [{ product_name: 'Greenply Plywood (6 mm)', quantity: '3' }] } });
  expect(r.status()).toBe(200);
  await visitor.dispose();
  await page.goto('/admin/enquiries');
  await page.getByRole('cell', { name: evilName, exact: true }).click();
  await expect(page.getByText('QA TEST <script>window.__xss=2</script>')).toBeVisible();
  await expect(page.getByText('Greenply Plywood (6 mm)')).toBeVisible();
  expect(await page.evaluate(() => window.__xss)).toBeUndefined();
  await page.getByLabel('Status').selectOption('Contacted');
  await page.waitForTimeout(500);
  const row = (await db(admin, { table: 'enquiries', op: 'select', select: 'status', filters: [['eq', 'customer_name', evilName]] })).body.data[0];
  expect(row.status).toBe('Contacted');
});

test('M5 quotation review saves amount, status and sent date', async ({ page }) => {
  const e = (await db(admin, { table: 'enquiries', op: 'select', select: 'id,reference', filters: [['eq', 'customer_name', 'QA TEST <img src=x onerror="window.__xss=1">']] })).body.data[0];
  await page.goto('/admin/quotations');
  await page.getByRole('row', { name: new RegExp(e.reference) }).getByRole('button', { name: 'Review' }).click();
  await page.getByLabel('Quotation amount (₹)').fill('123');
  await page.getByLabel('Status', { exact: true }).selectOption('Sent');
  await page.getByLabel('Notes').fill('QA TEST note');
  await page.getByRole('button', { name: 'Save quotation' }).click();
  await expect(page.getByRole('row', { name: new RegExp(e.reference) })).toContainText('123');
  const q = (await db(admin, { table: 'quotations', op: 'select', select: 'amount,status,sent_at,notes', filters: [['eq', 'enquiry_id', e.id]] })).body.data[0];
  expect(Number(q.amount)).toBe(123);
  expect(q.status).toBe('Sent');
  expect(q.sent_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

test('M6 settings and inventory show real values (not saved or changed)', async ({ page }) => {
  await page.goto('/admin/settings');
  await expect(page.getByLabel('Address')).toHaveValue(/Nagarabhavi Main Rd/);
  await expect(page.getByLabel(/Contact people/)).toHaveValue(/Haresh\|9986480096/);
  await page.goto('/admin/inventory');
  await expect(page.getByRole('row')).toHaveCount(10); // header + 9 products
});

test('M7 account page: mismatched and weak new passwords are rejected, password not changed', async ({ page }) => {
  await page.goto('/admin/account');
  await page.getByLabel('Current password').fill(adminPassword());
  await page.getByLabel(/New password/).fill('Different-Pass-123');
  await page.getByLabel('Repeat new password').fill('Not-The-Same-123');
  await page.getByRole('button', { name: 'Change password' }).click();
  await expect(page.getByText('The new passwords do not match.')).toBeVisible();
  await page.getByLabel(/New password/).fill('onlylettersnonumber');
  await page.getByLabel('Repeat new password').fill('onlylettersnonumber');
  await page.getByRole('button', { name: 'Change password' }).click();
  await expect(page.getByText('Use letters and at least one number.')).toBeVisible();
});
