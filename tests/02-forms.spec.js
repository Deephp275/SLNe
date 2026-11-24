const { test, expect } = require('@playwright/test');
const { adminApi, db, fakeIp, BASE } = require('./helpers');

let admin;
test.beforeAll(async () => { admin = await adminApi(); });
test.afterAll(async () => { await admin.dispose(); });
test.beforeEach(async ({ context }) => { await context.setExtraHTTPHeaders({ 'X-Forwarded-For': fakeIp() }); });

const count = async (name) => (await db(admin, { table: 'enquiries', op: 'select', select: 'id', filters: [['eq', 'customer_name', name]] })).body.data.length;
const fillQuote = async (page, { name = 'QA TEST', phone = '9999999999', req = 'QA TEST requirement', email = '' } = {}) => {
  await page.getByLabel('Customer name *').fill(name);
  await page.getByLabel('Phone number *').fill(phone);
  if (email) await page.getByLabel('Email').fill(email);
  await page.getByLabel('Product requirements *').fill(req);
};

test.describe('E1 quotation form validation', () => {
  test('E1 empty form is rejected with messages and nothing is sent', async ({ page }) => {
    let sent = 0; page.on('request', (r) => { if (r.url().endsWith('/api/enquiry')) sent++; });
    await page.goto('/quotation');
    await page.getByRole('button', { name: 'Submit Quotation Request' }).click();
    await expect(page.getByText('Required').first()).toBeVisible();
    expect(sent).toBe(0);
  });
  test('E1 bad phone and bad email are rejected', async ({ page }) => {
    await page.goto('/quotation');
    await fillQuote(page, { phone: '12', email: 'not-an-email' });
    await page.getByRole('button', { name: 'Submit Quotation Request' }).click();
    await expect(page.getByText('Enter a valid phone number')).toBeVisible();
    await expect(page.getByText('Enter a valid email')).toBeVisible();
  });
  test('E1 contact form validation', async ({ page }) => {
    await page.goto('/contact');
    await page.getByRole('button', { name: 'Send Message' }).click();
    await expect(page.getByText(/Please fill in your name/)).toBeVisible();
  });
});

test('E2/E3 quotation with several products is saved and shows a reference', async ({ page }) => {
  await page.goto('/quotation');
  await fillQuote(page, { name: 'QA TEST multi', email: 'qa@example.com' });
  await page.getByPlaceholder('Product name').first().fill('Greenply Plywood (19 mm)');
  await page.getByPlaceholder('Qty').first().fill('10');
  await page.getByRole('button', { name: '+ Add another product' }).click();
  await page.getByPlaceholder('Product name').nth(1).fill('Kitply Plywood (6 mm)');
  await page.getByPlaceholder('Qty').nth(1).fill('5');
  await page.getByRole('button', { name: 'Submit Quotation Request' }).click();
  await expect(page.getByText(/SLN-\d{6}-[A-F0-9]{5}/)).toBeVisible();
  const r = await db(admin, { table: 'enquiries', op: 'select', select: '*, items:enquiry_items(*)', filters: [['eq', 'customer_name', 'QA TEST multi']] });
  expect(r.body.data.length).toBe(1);
  expect(r.body.data[0].items.map((i) => i.product_name).sort()).toEqual(['Greenply Plywood (19 mm)', 'Kitply Plywood (6 mm)']);
});

test('E2 contact form message is saved', async ({ page }) => {
  await page.goto('/contact');
  await page.getByLabel('Name *').fill('QA TEST contact');
  await page.getByLabel('Phone *').fill('9999999999');
  await page.getByLabel('Message *').fill('QA TEST hello');
  await page.getByRole('button', { name: 'Send Message' }).click();
  await expect(page.getByText(/Reference: SLN-/)).toBeVisible();
  expect(await count('QA TEST contact')).toBe(1);
});

test('E4 special characters, emoji and script text are stored and shown as plain text', async ({ page }) => {
  const nasty = `QA TEST <img src=x onerror="window.__xss=1"> '"; DROP TABLE enquiries; -- 🪵 नमस्ते`;
  await page.goto('/quotation');
  await fillQuote(page, { name: nasty, req: '<script>window.__xss=2</script> & " \' ✓' });
  await page.getByRole('button', { name: 'Submit Quotation Request' }).click();
  await expect(page.getByText(/SLN-\d{6}-/)).toBeVisible();
  expect(await page.evaluate(() => window.__xss)).toBeUndefined();
  const r = await db(admin, { table: 'enquiries', op: 'select', select: 'customer_name,requirements', filters: [['eq', 'customer_name', nasty]] });
  expect(r.body.data.length).toBe(1);
  expect(r.body.data[0].requirements).toContain('<script>');
});

test('E5 very long input is refused and nothing is saved', async ({ page }) => {
  await page.goto('/quotation');
  await fillQuote(page, { name: 'QA TEST long', req: 'x'.repeat(5000) });
  await page.getByRole('button', { name: 'Submit Quotation Request' }).click();
  await expect(page.getByText(/SLN-\d{6}-/)).toHaveCount(0);
  await page.waitForTimeout(500);
  expect(await count('QA TEST long')).toBe(0);
});

test('E6 double click on Submit saves one enquiry only', async ({ page }) => {
  await page.goto('/quotation');
  await fillQuote(page, { name: 'QA TEST double' });
  await page.getByRole('button', { name: 'Submit Quotation Request' }).dblclick();
  await expect(page.getByText(/SLN-\d{6}-/)).toBeVisible();
  expect(await count('QA TEST double')).toBe(1);
});

test('E7 refreshing in the middle of submitting causes no crash or duplicate', async ({ page }) => {
  await page.goto('/quotation');
  await fillQuote(page, { name: 'QA TEST refresh' });
  await page.getByRole('button', { name: 'Submit Quotation Request' }).click();
  await page.reload();
  await expect(page.locator('h1')).toBeVisible();
  await page.waitForTimeout(600);
  expect(await count('QA TEST refresh')).toBeLessThanOrEqual(1);
});

test('E8 bot filling the hidden honeypot field saves nothing', async ({ request }) => {
  const ctx = await require('./helpers').api();
  const r = await ctx.post('/api/enquiry', { data: { customer_name: 'QA TEST bot', phone: '9999999999', requirements: 'bot', website: 'http://spam.example' } });
  expect(r.status()).toBe(200);
  expect(await count('QA TEST bot')).toBe(0);
  await ctx.dispose();
});

test('E1 server also validates (not only the browser)', async () => {
  const ctx = await require('./helpers').api();
  for (const data of [{ customer_name: '', phone: '9999999999', requirements: 'x' }, { customer_name: 'a', phone: '1', requirements: 'x' }, { customer_name: 'a', phone: '9999999999', requirements: '' }, { customer_name: 'a', phone: '9999999999', requirements: 'x', email: 'bad' }]) {
    expect((await ctx.post('/api/enquiry', { data })).status()).toBe(422);
  }
  await ctx.dispose();
});
