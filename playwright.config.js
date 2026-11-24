const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'tests',
  timeout: 60000,
  expect: { timeout: 8000 },
  workers: 1,            // tests share one server and one data folder, so run one at a time
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'test-results/results.json' }], ['html', { open: 'never' }]],
  use: { baseURL: 'http://localhost:3100', screenshot: 'only-on-failure', trace: 'off' },
  // A private copy of the site for the tests (own port, own data, own password). Needs `npm run build` first.
  webServer: { command: 'node tests/start-test-server.js', url: 'http://localhost:3100/robots.txt', reuseExistingServer: false, timeout: 90000, gracefulShutdown: { signal: 'SIGTERM', timeout: 5000 } },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } }, testIgnore: /06-/ },
    { name: 'responsive', use: { ...devices['Desktop Chrome'] }, testMatch: /06-/ },
  ],
});
