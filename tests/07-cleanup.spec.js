// Runs last: removes every record the tests created (all named "QA TEST" / "qa-test"), then proves nothing is left.
const { test, expect } = require('@playwright/test');
const { adminApi, db } = require('./helpers');

test('cleanup: remove all QA test data', async () => {
  const admin = await adminApi();
  const del = async (table, rows) => { for (const r of rows) await db(admin, { table, op: 'delete', filters: [['eq', 'id', r.id]] }); };
  const all = async (table, select) => (await db(admin, { table, op: 'select', select })).body.data;

  await del('enquiries', (await all('enquiries', 'id,customer_name')).filter((r) => (r.customer_name || '').startsWith('QA TEST')));
  await del('products', (await all('products', 'id,slug')).filter((r) => r.slug.startsWith('qa-test')));
  await del('brands', (await all('brands', 'id,name')).filter((r) => r.name.startsWith('QA TEST')));
  await del('categories', (await all('categories', 'id,name')).filter((r) => r.name.startsWith('QA TEST')));

  expect((await all('enquiries', 'id,customer_name')).filter((r) => (r.customer_name || '').startsWith('QA TEST'))).toEqual([]);
  expect((await all('products', 'id,slug')).filter((r) => r.slug.startsWith('qa-test'))).toEqual([]);
  expect((await all('brands', 'id,name')).filter((r) => r.name.startsWith('QA TEST'))).toEqual([]);
  expect((await all('categories', 'id,name')).filter((r) => r.name.startsWith('QA TEST'))).toEqual([]);
  expect((await all('products', 'id')).length).toBe(9);          // the real catalogue is intact
  await admin.dispose();
});
