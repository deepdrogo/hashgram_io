import { For, Show, createMemo, createSignal, onMount } from 'solid-js';
import { useSearchParams } from '@solidjs/router';
import { Filter, X } from 'lucide-solid';
import { usePaged, useQuery, setTitle } from '../lib/query';
import { useLive } from '../lib/live';
import type { TxSummary } from '../lib/api';
import { formatInt, ADDR_RE } from '../lib/format';
import { PageHeader, Pager, Skeleton, ErrorState, Th, Empty, Badge, Stat, Table } from '../components/ui';
import { HeightLink, TimeAgo, TxLink, Success, Amount, Address } from '../components/values';

const COMMON_TYPES = ['Send', 'Delegate', 'Undelegate', 'BeginRedelegate', 'WithdrawDelegatorReward', 'Vote', 'SubmitProposal', 'RegisterProvider', 'SubmitReceipt', 'ClaimFounderRevenue', 'RegisterUsername', 'CreateValidator', 'EditValidator'];

const U = 1_000_000n;
/** Amount presets in uhash (moved by the transaction's transfer events). */
const AMOUNTS: Array<{ id: string; label: string; min?: bigint; max?: bigint }> = [
  { id: '', label: 'Any amount' },
  { id: 'dust', label: '< 1 HASH', max: U - 1n },
  { id: 'small', label: '1 – 100 HASH', min: U, max: 100n * U },
  { id: 'medium', label: '100 – 10,000 HASH', min: 100n * U, max: 10_000n * U },
  { id: 'large', label: '10,000 – 1M HASH', min: 10_000n * U, max: 1_000_000n * U },
  { id: 'whale', label: '> 1,000,000 HASH', min: 1_000_000n * U },
];

type Filters = { type: string; status: string; amount: string; signer: string; from: string; to: string };

export default function Txs() {
  const [sp, setSp] = useSearchParams<Partial<Filters>>();
  const { store } = useLive();
  const types = useQuery<{ items: Array<{ type: string; count: number }> }>('/txs/types', { refreshMs: 60_000 });
  const [f, setF] = createSignal<Filters>({ type: sp.type ?? '', status: sp.status ?? '', amount: sp.amount ?? '', signer: sp.signer ?? '', from: sp.from ?? '', to: sp.to ?? '' });
  onMount(() => setTitle('Transactions'));

  const params = createMemo(() => {
    const v = f();
    const a = AMOUNTS.find((x) => x.id === v.amount);
    return {
      type: v.type || undefined,
      status: v.status || undefined,
      min_amount: a?.min !== undefined ? a.min.toString() : undefined,
      max_amount: a?.max !== undefined ? a.max.toString() : undefined,
      signer: ADDR_RE.test(v.signer) ? v.signer : undefined,
      from_height: /^\d+$/.test(v.from) ? v.from : undefined,
      to_height: /^\d+$/.test(v.to) ? v.to : undefined,
    };
  });
  const page = usePaged<TxSummary>(() => '/txs', params);
  const active = createMemo(() => Object.values(params()).filter((v) => v !== undefined).length);

  const update = (patch: Partial<Filters>) => {
    const next = { ...f(), ...patch };
    setF(next);
    setSp(Object.fromEntries(Object.entries(next).map(([k, v]) => [k, v || undefined])));
  };
  const clear = () => update({ type: '', status: '', amount: '', signer: '', from: '', to: '' });

  const options = createMemo(() => {
    const seen = new Set<string>();
    const out: Array<{ type: string; count?: number }> = [];
    for (const t of types.data()?.items ?? []) {
      seen.add(t.type);
      out.push(t);
    }
    for (const t of COMMON_TYPES) if (!seen.has(t)) out.push({ type: t });
    return out;
  });
  const totalTyped = createMemo(() => (types.data()?.items ?? []).reduce((a, t) => a + t.count, 0));

  const rows = createMemo(() => {
    const base = page.items();
    if (page.hasPrev() || active() || base.length === 0) return base;
    const seen = new Set(base.map((t) => t.hash));
    const topHeight = base[0]!.height;
    const fresh = store.txs.filter((t) => t.height >= topHeight && !seen.has(t.hash));
    return [...fresh, ...base].slice(0, 25);
  });
  const failed = createMemo(() => rows().filter((t) => !t.success).length);

  return (
    <div>
      <PageHeader title="Transactions" lead="Decoded with the chain's own SDK codec. Fees are split between validators, the founder's 1 % and useful-service revenue. Filter by type, result, amount moved, signer or height range." />

      <div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total transactions" value={formatInt(store.head?.total_txs)} live href="/txs" />
        <Stat label="Message types seen" value={formatInt(types.data()?.items.length)} hint={totalTyped() ? `${formatInt(totalTyped())} messages in total` : undefined} />
        <Stat label="Most common" value={types.data()?.items[0]?.type ?? '—'} hint={types.data()?.items[0] ? `${formatInt(types.data()!.items[0]!.count)} messages` : undefined} />
        <Stat label="Failed in view" value={formatInt(failed())} hint={`of ${rows().length} shown`} />
      </div>

      <section class="card mb-4 p-4" aria-label="Filters">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="inline-flex items-center gap-2 text-sm font-semibold"><Filter class="size-4" aria-hidden="true" /> Filters {active() ? <Badge variant="solid">{active()}</Badge> : null}</h2>
          <Show when={active()}>
            <button class="btn h-7 px-2 text-xs" onClick={clear}><X class="size-3.5" aria-hidden="true" /> Clear</button>
          </Show>
        </div>
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label class="text-xs text-ink-500">
            Type
            <select class="input mt-1 h-9" value={f().type} onChange={(e) => update({ type: e.currentTarget.value })}>
              <option value="">All types</option>
              <For each={options()}>{(o) => <option value={o.type}>{o.type}{o.count !== undefined ? ` (${formatInt(o.count)})` : ''}</option>}</For>
            </select>
          </label>
          <div class="text-xs text-ink-500">
            Result
            <div role="group" aria-label="Result" class="mt-1 flex gap-1">
              <For each={[['', 'All'], ['success', '✓ Success'], ['failed', '✗ Failed']] as const}>
                {([id, label]) => (
                  <button class={`btn h-9 flex-1 justify-center px-2 text-xs ${f().status === id ? 'btn-primary' : ''}`} aria-pressed={f().status === id} onClick={() => update({ status: id })}>
                    {label}
                  </button>
                )}
              </For>
            </div>
          </div>
          <label class="text-xs text-ink-500">
            Amount moved
            <select class="input mt-1 h-9" value={f().amount} onChange={(e) => update({ amount: e.currentTarget.value })}>
              <For each={AMOUNTS}>{(a) => <option value={a.id}>{a.label}</option>}</For>
            </select>
          </label>
          <label class="text-xs text-ink-500">
            Signer
            <input class="input mt-1 h-9 font-mono" placeholder="hash1…" value={f().signer} onInput={(e) => update({ signer: e.currentTarget.value.trim() })} spellcheck={false} />
          </label>
          <label class="text-xs text-ink-500">
            From height
            <input class="input mt-1 h-9 font-mono" inputmode="numeric" placeholder="1" value={f().from} onInput={(e) => update({ from: e.currentTarget.value.replace(/\D/g, '') })} />
          </label>
          <label class="text-xs text-ink-500">
            To height
            <input class="input mt-1 h-9 font-mono" inputmode="numeric" placeholder={store.head ? String(store.head.height) : ''} value={f().to} onInput={(e) => update({ to: e.currentTarget.value.replace(/\D/g, '') })} />
          </label>
        </div>
      </section>

      <Show when={!page.error()} fallback={<ErrorState error={page.error()} retry={page.refetch} />}>
        <Show when={!page.loading() || rows().length} fallback={<Skeleton rows={12} />}>
          <Show when={rows().length} fallback={<Empty title="No transactions match" hint={active() ? 'Try widening the filters.' : 'Nothing has been indexed yet.'} />}>
            <div class="card overflow-x-auto">
              <Table>
                <thead>
                  <tr>
                    <Th>Status</Th>
                    <Th>Hash</Th>
                    <Th>Type</Th>
                    <Th>Signer</Th>
                    <Th>Summary</Th>
                    <Th num>Amount</Th>
                    <Th num>Fee</Th>
                    <Th num>Height</Th>
                    <Th num>Age</Th>
                  </tr>
                </thead>
                <tbody aria-live="polite" aria-relevant="additions">
                  <For each={rows()}>
                    {(t) => (
                      <tr class="animate-slide-in">
                        <td><Success ok={t.success} /></td>
                        <td><TxLink hash={t.hash} /></td>
                        <td>
                          <Badge>{t.type}</Badge>
                          <Show when={t.msg_count > 1}>
                            <span class="ml-1 text-xs text-ink-500">+{t.msg_count - 1}</span>
                          </Show>
                        </td>
                        <td><Show when={t.signer} fallback="—"><Address value={t.signer} head={6} tail={4} copy={false} /></Show></td>
                        <td class="max-w-[16rem] truncate text-ink-500">{t.summary ?? ''}</td>
                        <td class="num"><Show when={t.amount_uhash && t.amount_uhash !== '0'} fallback={<span class="text-ink-500">—</span>}><Amount uhash={t.amount_uhash} unit={false} maxFraction={2} bold /></Show></td>
                        <td class="num text-ink-500"><Amount uhash={t.fee_uhash} unit={false} /></td>
                        <td class="num"><HeightLink height={t.height} /></td>
                        <td class="num text-ink-500"><TimeAgo iso={t.time} /></td>
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
