import { For, Show, createMemo, createSignal, onMount } from 'solid-js';
import { A, useNavigate } from '@solidjs/router';
import { Search as SearchIcon, ArrowRight } from 'lucide-solid';
import { usePaged, setTitle } from '../lib/query';
import { useLive } from '../lib/live';
import { getJson, type BlockSummary, type SearchResult } from '../lib/api';
import { formatInt, formatBytes, formatMs, HASH_RE, HEIGHT_RE } from '../lib/format';
import { PageHeader, Pager, Skeleton, ErrorState, Th, Empty, Stat, Table } from '../components/ui';
import { HeightLink, Hash, TimeAgo } from '../components/values';
import { Sparkline } from '../components/charts';

/** Block search: a height jumps straight there, a 64-hex hash is resolved by the API. */
function BlockSearch() {
  const nav = useNavigate();
  const { store } = useLive();
  const [q, setQ] = createSignal('');
  const [miss, setMiss] = createSignal<string | null>(null);
  const submit = async (e: Event) => {
    e.preventDefault();
    const s = q().trim().replace(/^#/, '').replace(/,/g, '');
    setMiss(null);
    if (!s) return;
    if (HEIGHT_RE.test(s)) {
      const h = Number(s);
      if (store.head && h > store.head.height) {
        setMiss(`Block ${formatInt(h)} does not exist yet — the head is ${formatInt(store.head.height)}.`);
        return;
      }
      nav(`/blocks/${h}`);
      return;
    }
    if (HASH_RE.test(s)) {
      try {
        const r = await getJson<SearchResult>(`/search?q=${encodeURIComponent(s)}`);
        if (r.type === 'block') return nav(`/blocks/${r.id}`);
        if (r.type === 'tx') return nav(`/txs/${r.id}`);
      } catch {
        /* fall through */
      }
      setMiss('No block or transaction with that hash.');
      return;
    }
    setMiss('Enter a block height (e.g. 1200) or a 64-character block hash.');
  };
  return (
    <form role="search" onSubmit={submit} class="w-full sm:w-96">
      <label for="block-search" class="sr-only">Find a block by height or hash</label>
      <div class="relative">
        <SearchIcon class="pointer-events-none absolute left-3 top-2.5 size-4 text-ink-500" aria-hidden="true" />
        <input id="block-search" class="input h-9 pl-9 pr-10 font-mono text-sm" placeholder="height or block hash…" value={q()} onInput={(e) => setQ(e.currentTarget.value)} autocomplete="off" spellcheck={false} aria-describedby={miss() ? 'block-search-miss' : undefined} />
        <button type="submit" class="absolute right-1 top-1 inline-flex size-7 items-center justify-center rounded text-ink-500 hover:bg-ink-900 hover:text-white" aria-label="Go to block">
          <ArrowRight class="size-4" aria-hidden="true" />
        </button>
      </div>
      <Show when={miss()}>
        <p id="block-search-miss" role="alert" class="mt-1 text-xs text-ink-500">{miss()}</p>
      </Show>
    </form>
  );
}

export default function Blocks() {
  const { store } = useLive();
  const page = usePaged<BlockSummary>(() => '/blocks');
  onMount(() => setTitle('Blocks'));

  // On the first page, merge the live blocks in front so new blocks prepend without reload.
  const rows = createMemo(() => {
    const base = page.items();
    if (page.hasPrev() || base.length === 0) return base;
    const top = base[0]!.height;
    const fresh = store.blocks.filter((b) => b.height > top);
    return [...fresh, ...base].slice(0, 25);
  });

  // Small statistics over the visible window.
  const win = createMemo(() => {
    const r = rows();
    if (r.length < 2) return null;
    const txs = r.reduce((a, b) => a + b.tx_count, 0);
    const size = r.reduce((a, b) => a + b.size_bytes, 0);
    const missing = r.reduce((a, b) => a + b.signatures.missing, 0);
    const span = (Date.parse(r[0]!.time) - Date.parse(r[r.length - 1]!.time)) / (r.length - 1);
    const proposers = new Set(r.map((b) => b.proposer.operator)).size;
    return { txs, size, missing, span, proposers, n: r.length, times: r.slice().reverse().map((b) => b.tx_count) };
  });

  return (
    <div>
      <PageHeader title="Blocks" lead="Every block produced by the validator set, as seen by this site's own node. New blocks appear at the top without a reload." aside={<BlockSearch />} />

      <div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Head" value={store.head ? formatInt(store.head.height) : '—'} hint={store.head ? <TimeAgo iso={store.head.latest_block_time} /> : undefined} live />
        <Stat label="Block time" value={formatMs(store.head?.avg_block_time_ms)} hint="Average of the last 100 blocks" />
        <Stat label={`Txs in last ${win()?.n ?? 0}`} value={win() ? formatInt(win()!.txs) : '—'} hint={win() ? `${(win()!.txs / win()!.n).toFixed(2)} per block` : undefined} spark={win() ? <Sparkline values={win()!.times} label="transactions per block" /> : undefined} />
        <Stat label="Bytes" value={win() ? formatBytes(win()!.size) : '—'} hint={win() ? `${formatBytes(win()!.size / win()!.n)} per block` : undefined} />
        <Stat label="Missing signatures" value={win() ? formatInt(win()!.missing) : '—'} hint={win() ? `${win()!.proposers} distinct proposer${win()!.proposers === 1 ? '' : 's'} in view` : undefined} />
      </div>

      <Show when={!page.error()} fallback={<ErrorState error={page.error()} retry={page.refetch} />}>
        <Show when={!page.loading() || rows().length} fallback={<Skeleton rows={12} />}>
          <Show when={rows().length} fallback={<Empty title="No blocks indexed yet" hint="The indexer is backfilling from genesis." />}>
            <div class="card overflow-x-auto">
              <Table>
                <thead>
                  <tr>
                    <Th>Height</Th>
                    <Th>Hash</Th>
                    <Th>Proposer</Th>
                    <Th num>Txs</Th>
                    <Th num>Gas used</Th>
                    <Th num>Size</Th>
                    <Th num>Signatures</Th>
                    <Th num>Age</Th>
                  </tr>
                </thead>
                <tbody aria-live="polite" aria-relevant="additions">
                  <For each={rows()}>
                    {(b) => (
                      <tr class="animate-slide-in">
                        <td>
                          <HeightLink height={b.height} class="font-semibold" />
                        </td>
                        <td>
                          <Hash value={b.hash} href={`/blocks/${b.height}`} head={8} tail={6} />
                        </td>
                        <td class="max-w-[14rem] truncate">
                          <A href={`/validators/${b.proposer.operator}`} class="hover:underline">
                            {b.proposer.moniker || b.proposer.operator}
                          </A>
                        </td>
                        <td class="num">{formatInt(b.tx_count)}</td>
                        <td class="num">{formatInt(b.gas_used)}</td>
                        <td class="num">{formatBytes(b.size_bytes)}</td>
                        <td class="num" title={`${b.signatures.missing} missing`}>
                          {b.signatures.present}/{b.signatures.total}
                          <Show when={b.signatures.missing > 0}>
                            <span class="ml-1 font-mono">▼</span>
                          </Show>
                        </td>
                        <td class="num text-ink-500">
                          <TimeAgo iso={b.time} />
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </Table>
            </div>
            <Pager next={page.next()} onNext={page.goNext} onReset={page.reset} hasPrev={page.hasPrev()} loading={page.loading()} />
          </Show>
        </Show>
      </Show>
    </div>
  );
}
