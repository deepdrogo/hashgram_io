import { test, expect, devices } from '@playwright/test';
import { ROUTES } from './routes.ts';

/**
 * Responsive guard: on a phone-sized viewport no element may extend past the
 * viewport unless it sits inside an intentionally scrollable container, and
 * tables must have collapsed into labelled cards.
 */
// iPhone 13 geometry on the Chromium project (the default browser here is Chromium, not WebKit).
const phone = devices['iPhone 13'];
test.use({ viewport: phone.viewport, userAgent: phone.userAgent, deviceScaleFactor: phone.deviceScaleFactor, isMobile: phone.isMobile, hasTouch: phone.hasTouch });

for (const route of ROUTES) {
  test(`mobile: no horizontal overflow on ${route}`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const offenders = await page.evaluate(() => {
      const vw = window.innerWidth;
      const out: string[] = [];
      for (const el of Array.from(document.querySelectorAll('body *'))) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0) continue;
        if (rect.right > vw + 1 || rect.left < -1) {
          let a = el.parentElement;
          let scrollable = false;
          while (a) {
            const o = getComputedStyle(a).overflowX;
            if (o === 'auto' || o === 'scroll') {
              scrollable = true;
              break;
            }
            a = a.parentElement;
          }
          if (!scrollable) out.push(`${el.tagName.toLowerCase()} ${(el.textContent ?? '').trim().slice(0, 40)}`);
        }
      }
      return out.slice(0, 5);
    });
    expect(offenders, offenders.join(' | ')).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });
}

test('mobile: tables collapse into labelled cards', async ({ page }) => {
  await page.goto('/blocks', { waitUntil: 'networkidle' });
  const labelled = page.locator('table.table tbody td[data-label="Height"]').first();
  await expect(labelled).toBeVisible();
  await expect.poll(async () => page.locator('table.table tbody td:not([data-label])').count()).toBe(0);
  const display = await labelled.evaluate((el) => getComputedStyle(el).display);
  expect(display).toBe('flex');
  const thead = await page.locator('table.table thead').first().evaluate((el) => getComputedStyle(el).display);
  expect(thead).toBe('none');
});

test('mobile: menu opens and navigates', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('navigation', { name: 'Primary mobile' }).getByRole('link', { name: 'Validators' }).click();
  await expect(page).toHaveURL(/\/validators$/);
});
