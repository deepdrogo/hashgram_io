/**
 * Shared brand geometry and text-to-path helpers for the build scripts.
 * The mark is a heavy `#` whose four intersections are knocked out: the
 * negative-space squares read as blocks in a chain. 64-unit grid, pixel-aligned
 * at 16 px (4 units per pixel: 3 px strokes, 2 px holes, 2 px gaps).
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import opentype from 'opentype.js';

const require = createRequire(import.meta.url);

export const MARK_PATH =
  'M16 4h12v56H16zM36 4h12v56H36zM4 16h12v12H4zM28 16h8v12h-8zM48 16h12v12H48zM4 36h12v12H4zM28 36h8v12h-8zM48 36h12v12H48zM18 18h8v8h-8zM38 18h8v8h-8zM18 38h8v8h-8zM38 38h8v8h-8z';

/**
 * Small-size variant (16 / 32 px): same strokes, 4-unit holes so every edge
 * lands on a whole pixel (1 px hole at 16 px, 2 px at 32 px).
 */
export const MARK_PATH_SMALL =
  'M16 4h12v56H16zM36 4h12v56H36zM4 16h12v12H4zM28 16h8v12h-8zM48 16h12v12H48zM4 36h12v12H4zM28 36h8v12h-8zM48 36h12v12H48zM20 20h4v4h-4zM40 20h4v4h-4zM20 40h4v4h-4zM40 40h4v4h-4z';

export const BLACK = '#000000';
export const WHITE = '#ffffff';

/** Mark as a standalone SVG. `bg` = null for transparent. */
export function markSvg(fill: string, bg: string | null, size = 64, rounded = false): string {
  const bgRect = bg ? `<rect width="64" height="64" fill="${bg}"${rounded ? ' rx="12"' : ''}/>` : '';
  const d = size <= 32 ? MARK_PATH_SMALL : MARK_PATH;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64" role="img" aria-label="Hashgram">${bgRect}<path fill="${fill}" fill-rule="evenodd" d="${d}"/></svg>`;
}

/** Mark scaled/translated into an arbitrary canvas. */
export function markGroup(fill: string, x: number, y: number, size: number): string {
  const s = size / 64;
  return `<g transform="translate(${x} ${y}) scale(${s})"><path fill="${fill}" fill-rule="evenodd" d="${MARK_PATH}"/></g>`;
}

let interCache: Record<number, opentype.Font> = {};
let monoCache: opentype.Font | null = null;

export function interFont(weight: 400 | 500 | 600 | 700 = 700): opentype.Font {
  if (!interCache[weight]) {
    const p = require.resolve(`@fontsource/inter/files/inter-latin-${weight}-normal.woff`);
    interCache[weight] = opentype.parse(toArrayBuffer(readFileSync(p)));
  }
  return interCache[weight]!;
}

export function monoFont(): opentype.Font {
  if (!monoCache) {
    const p = require.resolve('@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff');
    monoCache = opentype.parse(toArrayBuffer(readFileSync(p)));
  }
  return monoCache;
}

function toArrayBuffer(b: Buffer): ArrayBuffer {
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
}

export interface TextPath {
  d: string;
  width: number;
}

/** Render text as an SVG path so no system fonts are needed at build time. */
export function textPath(text: string, size: number, x: number, baselineY: number, font: opentype.Font, letterSpacing = 0): TextPath {
  // Glyph-by-glyph layout (kerning only). We deliberately bypass opentype.js's
  // GSUB pipeline, which cannot parse some lookup types in Inter.
  const scale = size / font.unitsPerEm;
  const glyphs = Array.from(text).map((c) => font.charToGlyph(c));
  let cx = x;
  const parts: string[] = [];
  for (let i = 0; i < glyphs.length; i++) {
    const g = glyphs[i]!;
    parts.push(g.getPath(cx, baselineY, size).toPathData(3));
    cx += (g.advanceWidth ?? 0) * scale + letterSpacing;
    if (i + 1 < glyphs.length) {
      let k = 0;
      try {
        k = font.getKerningValue(g, glyphs[i + 1]!);
      } catch {
        k = 0;
      }
      if (Number.isFinite(k)) cx += k * scale;
    }
  }
  return { d: parts.join(''), width: cx - x - letterSpacing };
}

export function textWidth(text: string, size: number, font: opentype.Font, letterSpacing = 0): number {
  return textPath(text, size, 0, 0, font, letterSpacing).width;
}

/** Wrap text into lines that fit `maxWidth` at `size`. */
export function wrap(text: string, size: number, maxWidth: number, font: opentype.Font): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (textWidth(t, size, font) > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Wordmark: mark + "hashgram" in Inter 700 as outlines. Height = mark height. */
export function wordmarkSvg(fill: string, bg: string | null, height = 64): { svg: string; width: number; height: number } {
  const font = interFont(700);
  const textSize = height * 0.78;
  const gap = height * 0.32;
  const baseline = height * 0.5 + textSize * 0.36;
  const tp = textPath('hashgram', textSize, height + gap, baseline, font, -textSize * 0.02);
  const width = Math.ceil(height + gap + tp.width);
  const pad = 0;
  const bgRect = bg ? `<rect width="${width + pad * 2}" height="${height + pad * 2}" fill="${bg}"/>` : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="hashgram">${bgRect}${markGroup(fill, 0, 0, height)}<path fill="${fill}" d="${tp.d}"/></svg>`;
  return { svg, width, height };
}
