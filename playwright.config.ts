import { defineConfig, devices } from '@playwright/test';

const e2ePort = 43917;
const e2eBaseUrl = `http://127.0.0.1:${e2ePort}`;

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './output/playwright/test-results',
  fullyParallel: false,
  workers: 2,
  retries: 1,
  reporter: [['list'], ['html', { outputFolder: './output/playwright/report', open: 'never' }]],
  use: {
    baseURL: e2eBaseUrl,
    channel: process.env.CI ? undefined : 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{
    name: 'chromium-desktop',
    use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } },
  }, {
    name: 'chromium-mobile',
    use: { ...devices['Pixel 5'], browserName: 'chromium' },
  }],
  webServer: {
    // simple-mind-map is a maintained local file dependency. Force Vite to
    // rebuild its optimized copy so E2E always exercises the current vendor
    // source instead of a cache from an earlier RC build.
    command: `npm run dev:web -- --force --host 127.0.0.1 --port ${e2ePort} --strictPort`,
    url: e2eBaseUrl,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
