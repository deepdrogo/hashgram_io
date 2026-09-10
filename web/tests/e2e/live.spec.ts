import { test, expect } from '@playwright/test';
import { FOUNDER, VAL1 } from './routes.ts';

test('home shows a new block within 5 s without reload', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  const list = page.getByRole('list', { name: 'Latest blocks' });
  const first = list.getByRole('listitem').first();
  await expect(first).toBeVisible();
  const before = (await first.textContent())!.trim();
  // The mock produces one block every 4 s over SSE; the list must prepend it.
  await expect(async () => {
    const now = (await list.getByRole('listitem').first().textContent())!.trim();
    expect(now).not.toBe(before);
  }).toPass({ timeout: 5_000 });
  // header live indicator says Live
  await expect(page.getByText('Live', { exact: true })).toBeVisible();
});

test('genesis pin mismatch disables the explorer', async ({ page }) => {
  await page.route('**/api/v1/chain', async (route) => {
    const res = await route.fetch();
    const body = (await res.json()) as Record<string, unknown>;
    body.genesis_hash = '0'.repeat(64);
    await route.fulfill({ response: res, json: body });
  });
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('not serving Hashgram Mainnet');
  await expect(page.locator('main')).toHaveAttribute('aria-disabled', 'true');
});

test('status page falls back honestly when SSE is unavailable', async ({ page }) => {
  await page.route('**/api/v1/live', (route) => route.fulfill({ status: 503, headers: { 'Retry-After': '5' }, body: '' }));
  await page.goto('/status', { waitUntil: 'networkidle' });
  await expect(page.getByText(/Polling|Offline|Connecting/).first()).toBeVisible();
  await expect(page.getByText('Live', { exact: true })).toHaveCount(0);
});

test.describe('short links', () => {
  test('/<height> → block', async ({ page }) => {
    await page.goto('/100');
    await expect(page).toHaveURL(/\/blocks\/100$/);
  });
  test('/<tx hash> → transaction', async ({ page }) => {
    await page.goto('/txs?type=Send', { waitUntil: 'networkidle' });
    const href = await page.locator('table a[href^="/txs/"]').first().getAttribute('href');
    const hash = href!.split('/').pop()!;
    await page.goto(`/${hash}`);
    await expect(page).toHaveURL(new RegExp(`/txs/${hash}$`));
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Transaction');
  });
  test('/hash1… → account and /@name → owner', async ({ page }) => {
    await page.goto(`/${FOUNDER}`);
    await expect(page).toHaveURL(new RegExp(`/accounts/${FOUNDER}$`));
    await page.goto('/@founder');
    await expect(page).toHaveURL(new RegExp(`/accounts/${FOUNDER}$`));
  });
  test('/hashvaloper1… → validator', async ({ page }) => {
    await page.goto(`/${VAL1}`);
    await expect(page).toHaveURL(new RegExp(`/validators/${VAL1}$`));
  });
  test('unknown path shows 404 with search', async ({ page }) => {
    await page.goto('/definitely-not-a-thing');
    await expect(page.getByText('Nothing at this address')).toBeVisible();
    await expect(page.locator('#main').getByRole('search')).toBeVisible();
  });
});

test('accounts page lists the reserve first and shares sum ≤ 100 %', async ({ page }) => {
  await page.goto('/accounts', { waitUntil: 'networkidle' });
  const firstRow = page.locator('tbody tr').first();
  await expect(firstRow).toContainText('Useful-service reserve');
  await expect(firstRow).toContainText('500,000,000');
  const foot = await page.getByText(/Shown accounts hold/).textContent();
  const pct = Number(/([\d.]+) %/.exec(foot!)![1]);
  expect(pct).toBeLessThanOrEqual(100);
});

test('founder page shows the hardcoded facts from the API', async ({ page }) => {
  await page.goto('/founder', { waitUntil: 'networkidle' });
  await expect(page.getByText('100 basis points', { exact: false })).toBeVisible();
  await expect(page.getByText(FOUNDER, { exact: true }).first()).toBeVisible();
  await expect(page.getByText('96 periods', { exact: false })).toBeVisible();
  await expect(page.getByText('60,000,000 HASH', { exact: true }).first()).toBeVisible();
});

test('rewards page states there is no mining and shows the schedule', async ({ page }) => {
  await page.goto('/rewards', { waitUntil: 'networkidle' });
  await expect(page.getByText('No mining.', { exact: false })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Projected epoch budget over time' })).toBeVisible();
  await expect(page.getByText('12,500 HASH').first()).toBeVisible();
});

test('docs search finds sections and code blocks have copy buttons', async ({ page }) => {
  await page.goto('/docs/run-a-node', { waitUntil: 'networkidle' });
  await expect(page.locator('pre button[data-copy]').first()).toBeVisible();
  await page.getByLabel('Search documentation').fill('join-mainnet');
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.getByRole('listbox').getByRole('button').first().click();
  await expect(page).toHaveURL(/\/docs\//);
});
