import { defineConfig, devices } from '@playwright/test';

/**
 * E2E runs against the production build served by `vite preview`, with the
 * deterministic mock API (tests/mock-api.mjs) standing in for the indexer.
 * Set E2E_BASE_URL to test a real deployment instead (mock is skipped).
 */
const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173';
const MOCK_PORT = process.env.MOCK_PORT ?? '1319';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: BASE,
    viewport: { width: 1280, height: 900 },
    colorScheme: 'dark',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      // LCD (sub-pixel) text anti-aliasing paints coloured fringes around glyphs; the
      // colour test must see the site's own colours, not the rasteriser's.
      use: { ...devices['Desktop Chrome'], launchOptions: { args: ['--disable-lcd-text', '--font-render-hinting=none'] } },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : [
        {
          command: `PORT=${MOCK_PORT} node tests/mock-api.mjs`,
          url: `http://127.0.0.1:${MOCK_PORT}/v1/health`,
          reuseExistingServer: false,
          timeout: 20_000,
        },
        {
          command: `INDEXER_URL=http://127.0.0.1:${MOCK_PORT} npx vite preview --host 127.0.0.1 --port 4173`,
          url: BASE,
          reuseExistingServer: false,
          timeout: 60_000,
        },
      ],
});
