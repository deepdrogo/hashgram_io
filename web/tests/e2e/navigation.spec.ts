import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'desktop', width: 1440, height: 1000, desktop: true },
  { name: 'compact desktop', width: 1280, height: 900, desktop: true },
  { name: 'tablet', width: 1024, height: 900, desktop: false },
  { name: 'mobile', width: 390, height: 844, desktop: false },
] as const;

for (const viewport of viewports) {
  test(`navigation fits at ${viewport.name} width`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/one', { waitUntil: 'networkidle' });

    const header = page.locator('header').first();
    await expect
      .poll(() => header.evaluate((element) => element.scrollWidth <= element.clientWidth))
      .toBe(true);

    const desktopNav = page.getByRole('navigation', { name: 'Primary', exact: true });
    const menuButton = page.getByRole('button', { name: 'Open menu' });
    if (viewport.desktop) {
      await expect(desktopNav).toBeVisible();
      await expect(menuButton).toBeHidden();
      await expect(desktopNav.getByRole('link', { name: 'Hashgram One' })).toBeVisible();

      await desktopNav.getByText('Explorer', { exact: true }).click();
      await expect(desktopNav.getByRole('link', { name: 'Transactions' })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(desktopNav.getByRole('link', { name: 'Transactions' })).toBeHidden();
    } else {
      await expect(desktopNav).toBeHidden();
      await expect(menuButton).toBeVisible();
      await menuButton.click();
      const mobileNav = page.getByRole('navigation', { name: 'Primary mobile' });
      await expect(mobileNav.getByRole('link', { name: 'Hashgram One' })).toBeVisible();
      await expect
        .poll(() => header.evaluate((element) => element.scrollWidth <= element.clientWidth))
        .toBe(true);
    }
  });
}

test('navigation stays centred beside the wide-screen search', async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 900 });
  await page.goto('/one', { waitUntil: 'networkidle' });

  const nav = page.getByRole('navigation', { name: 'Primary', exact: true });
  const search = page.locator('header').first().getByRole('search');
  await expect(nav).toBeVisible();
  await expect(search).toBeVisible();

  const navBox = await nav.boundingBox();
  const searchBox = await search.boundingBox();
  expect(navBox).not.toBeNull();
  expect(searchBox).not.toBeNull();
  expect(Math.abs(navBox!.x + navBox!.width / 2 - 1536 / 2)).toBeLessThanOrEqual(1);
  expect(navBox!.x + navBox!.width).toBeLessThanOrEqual(searchBox!.x);
});
