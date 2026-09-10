/**
 * Open Graph images (1200×630, black, large type) for every top-level route.
 * Text is converted to outlines at build time, so no fonts are needed on the
 * host. Output: public/og/<route>.png
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { markGroup, textPath, wrap, interFont, monoFont, WHITE } from './brand-lib.ts';

const OUT = new URL('../public/og/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const W = 1200;
const H = 630;

const PAGES: Array<{ id: string; title: string; sub: string }> = [
  { id: 'default', title: 'hashgram', sub: 'Live explorer, network dashboard and documentation for Hashgram Mainnet.' },
  { id: 'blocks', title: 'Blocks', sub: 'Every block, live from this site\u2019s own node.' },
  { id: 'txs', title: 'Transactions', sub: 'Decoded messages, fees and where they went.' },
  { id: 'accounts', title: 'Accounts', sub: 'Top holders, module accounts, vesting.' },
  { id: 'validators', title: 'Validators', sub: 'Voting power, uptime, the \u2154 liveness rule.' },
  { id: 'rewards', title: 'How nodes earn', sub: 'No mining. Rewards for real bytes stored and served.' },
  { id: 'founder', title: 'Founder transparency', sub: '1 % of protocol fees, hardcoded ceiling, live payouts.' },
  { id: 'governance', title: 'Governance', sub: 'Proposals, tallies, parameters.' },
  { id: 'network', title: 'Network', sub: 'Consensus peers, P2P peers, validators \u2014 three numbers.' },
  { id: 'docs', title: 'Documentation', sub: 'Architecture, protocol, tokenomics, operations.' },
  { id: 'status', title: 'Status', sub: 'Node, indexer and live stream health.' },
  { id: 'brand', title: 'Brand', sub: 'Mark, wordmark, palette \u2014 download the kit.' },
];

function ogSvg(title: string, sub: string): string {
  const bold = interFont(700);
  const medium = interFont(500);
  const mono = monoFont();
  const pad = 80;
  const markSize = 96;
  const titleSize = title.length > 18 ? 84 : 112;
  const titleLines = wrap(title, titleSize, W - pad * 2, bold).slice(0, 2);
  const subSize = 34;
  const subLines = wrap(sub, subSize, W - pad * 2, medium).slice(0, 3);
  const parts: string[] = [];
  parts.push(`<rect width="${W}" height="${H}" fill="#000000"/>`);
  // header: mark + wordmark
  const headerMark = 64;
  parts.push(markGroup(WHITE, pad, pad, headerMark));
  const wm = textPath('hashgram', 44, pad + headerMark + 20, pad + headerMark * 0.5 + 16, bold, -1);
  parts.push(`<path fill="${WHITE}" d="${wm.d}"/>`);
  // title block, vertically centred between header and footer
  const footerTop = H - 72;
  const blockH = titleLines.length * titleSize * 1.08 + 20 + subLines.length * subSize * 1.4;
  let y = pad + headerMark + (footerTop - (pad + headerMark) - blockH) / 2 + titleSize * 0.85;
  for (const l of titleLines) {
    parts.push(`<path fill="${WHITE}" d="${textPath(l, titleSize, pad, y, bold, -titleSize * 0.03).d}"/>`);
    y += titleSize * 1.08;
  }
  y += 20;
  for (const l of subLines) {
    parts.push(`<path fill="#808080" d="${textPath(l, subSize, pad, y, medium).d}"/>`);
    y += subSize * 1.4;
  }
  parts.push(`<rect x="${pad}" y="${footerTop}" width="${W - pad * 2}" height="1" fill="#1a1a1a"/>`);
  const foot = textPath('hashgram.io  ·  chain-id hashgram-1  ·  read-only', 22, pad, H - 34, mono);
  parts.push(`<path fill="#808080" d="${foot.d}"/>`);
  void markSize;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join('')}</svg>`;
}

async function main() {
  for (const p of PAGES) {
    const buf = await sharp(Buffer.from(ogSvg(p.title, p.sub)), { density: 72 }).png({ compressionLevel: 9 }).toBuffer();
    writeFileSync(join(OUT, `${p.id}.png`), buf);
  }
  console.log(`og: ${PAGES.length} images → ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
