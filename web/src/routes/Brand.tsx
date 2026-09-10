import { For, Show, createResource, onMount } from 'solid-js';
import { Download } from 'lucide-solid';
import { setTitle } from '../lib/query';
import { PageHeader, Card, Note, Th, Table } from '../components/ui';
import { LogoMark } from '../components/Logo';
import { formatBytes } from '../lib/format';

const PALETTE = [
  { name: 'Black', hex: '#000000', use: 'Background' },
  { name: 'Ink 950', hex: '#0D0D0D', use: 'Cards, secondary surfaces' },
  { name: 'Ink 900', hex: '#1A1A1A', use: 'Borders, dividers' },
  { name: 'Ink 800', hex: '#262626', use: 'Inputs, hover borders' },
  { name: 'Ink 700', hex: '#404040', use: 'Disabled, tertiary strokes' },
  { name: 'Ink 500', hex: '#808080', use: 'Secondary text' },
  { name: 'White', hex: '#FFFFFF', use: 'Primary text, the mark' },
];

const VARIANTS = ['white', 'black', 'white-on-black', 'black-on-white'] as const;
const SIZES = [16, 32, 48, 64, 128, 180, 192, 256, 512, 1024];

export default function Brand() {
  onMount(() => setTitle('Brand assets'));
  const [manifest] = createResource(async () => {
    const r = await fetch('/brand/manifest.json');
    if (!r.ok) return null;
    return (await r.json()) as { files: Array<{ name: string; bytes: number }> };
  });
  const size = (name: string) => manifest()?.files.find((f) => f.name === name)?.bytes;

  return (
    <div>
      <PageHeader
        title="Brand"
        lead="The Hashgram mark, wordmark and palette — free to use unmodified to refer to Hashgram. Every file below is generated from one geometric source and is also in the zip."
        aside={
          <a href="/brand/hashgram-brand.zip" class="btn btn-primary" download="">
            <Download class="size-4" aria-hidden="true" /> Download kit{size('hashgram-brand.zip') ? ` (${formatBytes(size('hashgram-brand.zip'))})` : ''}
          </a>
        }
      />

      <section class="mb-8 grid gap-4 md:grid-cols-2">
        <div class="card flex aspect-[2/1] items-center justify-center bg-black">
          <LogoMark size={160} title="Hashgram mark, white on black" />
        </div>
        <div class="card flex aspect-[2/1] items-center justify-center bg-white text-black">
          <LogoMark size={160} title="Hashgram mark, black on white" />
        </div>
        <div class="card flex aspect-[3/1] items-center justify-center bg-black">
          <img src="/brand/wordmark-white.svg" alt="hashgram wordmark, white" class="h-16" />
        </div>
        <div class="card flex aspect-[3/1] items-center justify-center bg-white">
          <img src="/brand/wordmark-black.svg" alt="hashgram wordmark, black" class="h-16" />
        </div>
      </section>

      <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div class="space-y-4">
          <Card title="Mark">
            <p class="mb-4 text-sm text-ink-500">A heavy hash sign whose four intersections are knocked out: the negative-space squares read as blocks, the strokes as the chain linking them. Pixel-aligned at 16 px.</p>
            <div class="overflow-x-auto">
              <Table>
                <thead><tr><Th>Variant</Th><Th>SVG</Th><Th>PNG</Th></tr></thead>
                <tbody>
                  <For each={VARIANTS}>
                    {(v) => (
                      <tr>
                        <td class="flex items-center gap-3">
                          <img src={`/brand/logo-${v}.svg`} alt="" class={`size-8 ${v === 'black' ? 'bg-white' : ''} ${v === 'white' ? 'bg-black' : ''} rounded`} />
                          <span>{v.replace(/-/g, ' ')}</span>
                        </td>
                        <td><a class="inline-block py-1 underline decoration-ink-500 hover:decoration-white" href={`/brand/logo-${v}.svg`} download="">logo-{v}.svg</a></td>
                        <td class="whitespace-normal">
                          <For each={SIZES}>{(s) => <a class="mr-1 inline-block px-1 py-1 font-mono text-xs underline decoration-ink-500 hover:decoration-white" href={`/brand/logo-${v}-${s}.png`} download="">{s}</a>}</For>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </Table>
            </div>
          </Card>
          <Card title="Wordmark">
            <p class="mb-4 text-sm text-ink-500">Mark plus “hashgram” in Inter 700, lower case, converted to outlines. Word height 78 % of the mark; gap 32 % of the mark.</p>
            <div class="overflow-x-auto">
              <Table>
                <thead><tr><Th>Variant</Th><Th>SVG</Th><Th>PNG (height)</Th></tr></thead>
                <tbody>
                  <For each={VARIANTS}>
                    {(v) => (
                      <tr>
                        <td>{v.replace(/-/g, ' ')}</td>
                        <td><a class="inline-block py-1 underline decoration-ink-500 hover:decoration-white" href={`/brand/wordmark-${v}.svg`} download="">wordmark-{v}.svg</a></td>
                        <td><For each={[64, 128, 256, 512]}>{(s) => <a class="mr-1 inline-block px-1 py-1 font-mono text-xs underline decoration-ink-500 hover:decoration-white" href={`/brand/wordmark-${v}-${s}.png`} download="">{s}</a>}</For></td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </Table>
            </div>
          </Card>
          <Card title="Icons">
            <div class="flex flex-wrap items-end gap-4 text-xs">
              <For each={[['favicon-16.png', 16], ['favicon-32.png', 32], ['favicon-48.png', 48], ['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]] as const}>
                {([f, s]) => (
                  <a href={`/brand/${f}`} download="" class="flex flex-col items-center gap-1 hover:underline">
                    <img src={`/brand/${f}`} alt="" style={{ width: `${Math.min(s, 96)}px`, height: `${Math.min(s, 96)}px` }} class="rounded" />
                    <span class="font-mono">{f}</span>
                  </a>
                )}
              </For>
            </div>
          </Card>
        </div>
        <aside class="space-y-4">
          <Card title="Palette">
            <ul class="space-y-2">
              <For each={PALETTE}>
                {(c) => (
                  <li class="flex items-center gap-3 text-sm">
                    <span class="size-8 shrink-0 rounded border border-ink-800" style={{ background: c.hex }} aria-hidden="true" />
                    <div class="min-w-0">
                      <div class="flex items-center gap-2"><span class="font-medium">{c.name}</span><span class="font-mono text-xs text-ink-500">{c.hex}</span></div>
                      <div class="text-xs text-ink-500">{c.use}</div>
                    </div>
                  </li>
                )}
              </For>
            </ul>
            <a href="/brand/palette.json" class="btn mt-3" download="">palette.json</a>
          </Card>
          <Card title="Rules">
            <ul class="space-y-2 text-sm text-ink-500">
              <li>Clear space: ¼ of the mark's height on every side.</li>
              <li>Minimum size: mark 16 px / 6 mm; wordmark 20 px / 8 mm.</li>
              <li>Only pure white or pure black. No recolouring, shadows, gradients, outlines, rotation.</li>
              <li>On photographs, put a solid black or white plate behind it.</li>
            </ul>
            <a href="/brand/README.md" class="btn mt-3" download="">Brand README</a>
          </Card>
          <Note title="Licence.">Use the mark unmodified to refer to Hashgram in articles, wallets, explorers, integrations and dashboards. Do not imply endorsement or register it as your own.</Note>
          <Show when={manifest()}>
            <p class="text-xs text-ink-500">{manifest()!.files.length} files in the kit.</p>
          </Show>
        </aside>
      </div>
    </div>
  );
}
