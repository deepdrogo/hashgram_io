import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'desktop', width: 1440, height: 1000, desktop: true },
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
