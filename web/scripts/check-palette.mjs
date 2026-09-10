#!/usr/bin/env node
/**
 * Static palette guard: every colour literal in src/, index.html and public/brand
 * SVGs must be one of the seven allowed greys. Complements the runtime
 * Playwright pixel test (tests/e2e/colour.spec.ts).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ALLOWED = new Set(['#000000', '#0d0d0d', '#1a1a1a', '#262626', '#404040', '#808080', '#ffffff', '#000', '#fff']);
const ROOT = new URL('..', import.meta.url).pathname;
const SCAN = ['src', 'index.html', 'public/brand', 'public/manifest.webmanifest'];
const EXT = new Set(['.ts', '.tsx', '.css', '.html', '.svg', '.json', '.webmanifest']);

function* walk(p) {
  const st = statSync(p);
  if (st.isDirectory()) for (const f of readdirSync(p)) yield* walk(join(p, f));
  else if (EXT.has(extname(p)) && !p.endsWith('docs-index.json')) yield p; // docs prose, not styling
}

const HEX = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
const FUNC = /\b(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color)\(([^)]*)\)/g;
const NAMED = /\b(?:color|fill|stroke|background(?:-color)?|border-color)\s*[:=]\s*["']?(red|green|blue|yellow|orange|purple|pink|cyan|magenta|teal|lime|indigo|violet|brown|gold|silver|navy|maroon|olive|aqua|fuchsia|coral|salmon|tomato|crimson)\b/gi;

let bad = 0;
for (const target of SCAN) {
  for (const file of walk(join(ROOT, target))) {
    const text = readFileSync(file, 'utf8');
    const rel = file.slice(ROOT.length);
    for (const m of text.matchAll(HEX)) {
      const hex = m[0].toLowerCase();
      if (!ALLOWED.has(hex)) {
        bad++;
        console.error(`${rel}: disallowed colour ${m[0]}`);
      }
    }
    for (const m of text.matchAll(FUNC)) {
      const fn = m[1];
      const args = m[2].split(/[,\s/]+/).filter(Boolean);
      if ((fn === 'rgb' || fn === 'rgba') && args.length >= 3) {
        const [r, g, b] = args.slice(0, 3).map((v) => Number(v.replace('%', '')));
        if (r !== g || g !== b) {
          bad++;
          console.error(`${rel}: non-grey ${m[0]}`);
        }
      } else if ((fn === 'hsl' || fn === 'hsla') && args.length >= 3) {
        const s = Number(args[1].replace('%', ''));
        if (s !== 0) {
          bad++;
          console.error(`${rel}: saturated ${m[0]}`);
        }
      } else if (fn === 'oklch' || fn === 'lch') {
        const c = Number(args[1]);
        if (c !== 0) {
          bad++;
          console.error(`${rel}: chroma ${m[0]}`);
        }
      }
    }
    for (const m of text.matchAll(NAMED)) {
      bad++;
      console.error(`${rel}: named colour ${m[0]}`);
    }
  }
}
if (bad) {
  console.error(`check-palette: ${bad} violation(s)`);
  process.exit(1);
}
console.log('check-palette: ok — only the seven monochrome values are used');
