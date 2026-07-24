import { defineConfig, devices } from '@playwright/test';

// The whole app is read-only against a live backend (gemel-api, itself proxying
// data.gov.il — see README), so these tests need `gemel-api` already running on
// http://127.0.0.1:8000 (the default `environment.development.ts` target). There is
// nothing to mock: real category/path/company ids and yield values come back on every
// run, which is why assertions below check structure and behavior rather than exact
// numbers.
//
// Port is overridable (E2E_PORT) because `ng serve`'s default 4200 is just the CLI's
// default, not something this app owns — on a machine already running something else on
// 4200, set E2E_PORT (and E2E_BASE_URL if the host differs too) rather than fighting over
// the port.
const port = process.env.E2E_PORT ?? '4200';
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  // Every test hits the same live backend (itself proxying data.gov.il, an external
  // government API with no SLA), so keeping worker count modest rather than
  // Playwright's full CPU-core default avoids piling up enough concurrent page-load
  // fetches to make that upstream genuinely slow, which otherwise reads as flakiness.
  workers: process.env.CI ? 1 : 4,
  reporter: 'list',
  timeout: 45_000,
  expect: {
    timeout: 12_000,
  },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // `reuseExistingServer` (on by default outside CI) means a teammate's already-running
  // `ng serve` on this port is used as-is; CI cold-starts a fresh one.
  webServer: {
    command: `npx ng serve --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
