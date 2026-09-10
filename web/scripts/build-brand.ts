/**
 * Generates every brand asset into public/brand/ from the single geometric
 * source in brand-lib.ts: SVG marks, wordmarks, favicons, PNG exports at all
 * sizes in the four monochrome combinations, and brand.zip for download.
 * Deterministic: re-running produces identical files.
 */
import { mkdirSync, writeFileSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { zipSync } from 'fflate';
import { markSvg, wordmarkSvg, BLACK, WHITE } from './brand-lib.ts';

const OUT = new URL('../public/brand/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const SIZES = [16, 32, 48, 64, 128, 180, 192, 256, 512, 1024];

interface Variant {
  id: string;
  fill: string;
  bg: string | null;
  label: string;
}
const VARIANTS: Variant[] = [
  { id: 'white', fill: WHITE, bg: null, label: 'White mark, transparent' },
  { id: 'black', fill: BLACK, bg: null, label: 'Black mark, transparent' },
  { id: 'white-on-black', fill: WHITE, bg: BLACK, label: 'White mark on black' },
  { id: 'black-on-white', fill: BLACK, bg: WHITE, label: 'Black mark on white' },
];

async function png(svg: string, width: number, height?: number): Promise<Buffer> {
  // Render at the intrinsic size declared in the SVG (crisp, pixel-aligned at
  // small sizes) and only resize when the requested size differs.
  const img = sharp(Buffer.from(svg), { density: 72 });
  const meta = await img.metadata();
  const w = width;
  const h = height ?? width;
  const out = meta.width === w && meta.height === h ? img : sharp(Buffer.from(svg), { density: 72 * Math.max(1, Math.ceil(w / (meta.width ?? w)))}).resize(w, h, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } });
  return out.png({ compressionLevel: 9, palette: false }).toBuffer();
}

async function main() {
  const files: Record<string, Uint8Array> = {};
  const put = (name: string, data: Buffer | string) => {
    const buf = typeof data === 'string' ? Buffer.from(data) : data;
    writeFileSync(join(OUT, name), buf);
    files[name] = new Uint8Array(buf);
  };

  // Marks
  for (const v of VARIANTS) {
    put(`logo-${v.id}.svg`, markSvg(v.fill, v.bg));
    for (const s of SIZES) put(`logo-${v.id}-${s}.png`, await png(markSvg(v.fill, v.bg, s), s));
  }
  put('logo.svg', markSvg(WHITE, null));

  // Wordmarks
  for (const v of VARIANTS) {
    const wm = wordmarkSvg(v.fill, v.bg, 64);
    put(`wordmark-${v.id}.svg`, wm.svg);
    for (const h of [64, 128, 256, 512]) {
      const w = Math.round((wm.width / wm.height) * h);
      put(`wordmark-${v.id}-${h}.png`, await png(wordmarkSvg(v.fill, v.bg, h).svg, w, h));
    }
  }
  put('wordmark.svg', wordmarkSvg(WHITE, null, 64).svg);

  // Favicons / app icons (white on black, rounded)
  put('favicon.svg', markSvg(WHITE, BLACK, 64, true));
  put('favicon-16.png', await png(markSvg(WHITE, BLACK, 16, true), 16));
  put('favicon-32.png', await png(markSvg(WHITE, BLACK, 32, true), 32));
  put('favicon-48.png', await png(markSvg(WHITE, BLACK, 48, true), 48));
  put('apple-touch-icon.png', await png(markSvg(WHITE, BLACK, 180, false), 180));
  put('icon-192.png', await png(markSvg(WHITE, BLACK, 192, true), 192));
  put('icon-512.png', await png(markSvg(WHITE, BLACK, 512, true), 512));
  put('icon-maskable-512.png', await png(markSvg(WHITE, BLACK, 512, false), 512));

  // Palette + brand README shipped with the kit
  const palette = {
    name: 'Hashgram monochrome',
    rule: 'Exactly these seven values. No other hue, tint or gradient.',
    colors: [
      { name: 'Black', hex: '#000000', use: 'Background' },
      { name: 'Ink 950', hex: '#0D0D0D', use: 'Cards, secondary surfaces' },
      { name: 'Ink 900', hex: '#1A1A1A', use: 'Borders, dividers' },
      { name: 'Ink 800', hex: '#262626', use: 'Inputs, hover borders' },
      { name: 'Ink 700', hex: '#404040', use: 'Disabled, tertiary strokes' },
      { name: 'Ink 500', hex: '#808080', use: 'Secondary text' },
      { name: 'White', hex: '#FFFFFF', use: 'Primary text, mark' },
    ],
  };
  put('palette.json', JSON.stringify(palette, null, 2) + '\n');
  const readmePath = new URL('../brand/README.md', import.meta.url).pathname;
  try {
    put('README.md', readFileSync(readmePath, 'utf8'));
  } catch {
    /* README generated separately */
  }

  // Zip everything for one-click download
  const zipped = zipSync(
    Object.fromEntries(Object.entries(files).map(([k, v]) => [`hashgram-brand/${k}`, v])),
    { level: 9, mtime: new Date('2026-09-10T00:00:00Z') },
  );
  writeFileSync(join(OUT, 'hashgram-brand.zip'), zipped);
  files['hashgram-brand.zip'] = zipped;

  // Manifest consumed by the /brand page
  const manifest = Object.keys(files)
    .sort()
    .map((name) => ({ name, bytes: statSync(join(OUT, name)).size }));
  writeFileSync(join(OUT, 'manifest.json'), JSON.stringify({ generated: 'build', files: manifest }, null, 2) + '\n');

  // Site manifest
  writeFileSync(
    new URL('../public/manifest.webmanifest', import.meta.url).pathname,
    JSON.stringify(
      {
        name: 'Hashgram',
        short_name: 'Hashgram',
        description: 'Live explorer, network dashboard and documentation for Hashgram Mainnet.',
        start_url: '/',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#000000',
        icons: [
          { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/brand/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      null,
      2,
    ) + '\n',
  );

  console.log(`brand: ${readdirSync(OUT).length} files → ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
