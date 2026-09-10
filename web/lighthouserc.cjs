/**
 * Lighthouse CI budget. Run `pnpm lhci` with the mock API (tests/mock-api.mjs on
 * :1319) or set LHCI_URL to a real deployment. Budgets from the site spec:
 * performance ≥ 95, accessibility 100, best practices 100, SEO 100, no layout shift.
 */
const base = process.env.LHCI_URL ?? 'http://127.0.0.1:4173';
const routes = ['/', '/blocks', '/txs', '/accounts', '/validators', '/rewards', '/founder', '/governance', '/network', '/docs', '/status', '/brand'];

module.exports = {
  ci: {
    collect: {
      url: routes.map((r) => base + r),
      numberOfRuns: 1,
      startServerCommand: process.env.LHCI_URL ? undefined : 'INDEXER_URL=http://127.0.0.1:1319 npx vite preview --host 127.0.0.1 --port 4173',
      startServerReadyPattern: 'Local',
      settings: {
        preset: 'desktop',
        chromeFlags: '--no-sandbox --headless=new --disable-lcd-text',
        skipAudits: ['uses-http2', 'is-on-https', 'redirects-http'],
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.95 }],
        'categories:accessibility': ['error', { minScore: 1 }],
        'categories:best-practices': ['error', { minScore: 1 }],
        'categories:seo': ['error', { minScore: 1 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.02 }],
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci' },
  },
};
