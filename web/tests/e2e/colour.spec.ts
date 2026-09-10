import { test, expect } from '@playwright/test';
import { PNG } from 'pngjs';
import { ROUTES } from './routes.ts';

/**
 * The palette test. Every route is rendered, screenshotted full-page, and every
 * pixel is checked: max(|r−g|, |g−b|, |r−b|) must be ≤ TOLERANCE (sub-pixel
 * font rendering can introduce tiny channel differences). Any saturated pixel
 * fails the build. The site is dark-only; the test also runs with a light
 * `prefers-color-scheme` to prove the site ignores it.
 */
const TOLERANCE = 6;

async function saturatedPixels(buf: Buffer): Promise<{ count: number; sample: Array<[number, number, number, number]> }> {
  const png = PNG.sync.read(buf);
  let count = 0;
  const sample: Array<[number, number, number, number]> = [];
  for (let i = 0; i < png.data.length; i += 4) {
    const r = png.data[i]!;
    const g = png.data[i + 1]!;
    const b = png.data[i + 2]!;
    const a = png.data[i + 3]!;
    if (a === 0) continue;
    const spread = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
    if (spread > TOLERANCE) {
      count++;
      if (sample.length < 5) sample.push([r, g, b, i / 4]);
    }
  }
  return { count, sample };
}

for (const scheme of ['dark', 'light'] as const) {
  test.describe(`monochrome (prefers-color-scheme: ${scheme})`, () => {
    test.use({ colorScheme: scheme });
    for (const route of ROUTES) {
      test(`no saturated pixel on ${route}`, async ({ page }) => {
        await page.goto(route, { waitUntil: 'networkidle' });
        await page.waitForTimeout(800);
        // QR codes and the docs iframe are monochrome too, but the iframe is
        // cross-document; it is rendered by the indexer and covered by its own CSS.
        const shot = await page.screenshot({ fullPage: true, animations: 'disabled' });
        const { count, sample } = await saturatedPixels(shot);
        expect(count, `saturated pixels ${JSON.stringify(sample)}`).toBe(0);
        // background must be pure black regardless of the OS scheme
        const bg = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
        expect(bg).toBe('rgb(0, 0, 0)');
      });
    }
  });
}
