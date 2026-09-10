import { For, Show, createEffect, createMemo } from 'solid-js';
import { useParams } from '@solidjs/router';
import { useQuery, setTitle } from '../lib/query';
import type { TxDetail } from '../lib/api';
import { formatInt, truncateMiddle, ratioPct, formatPct, ADDR_RE, VALOPER_RE, HASH_RE } from '../lib/format';
import { PageHeader, Card, KV, Skeleton, ErrorState, RawToggle, Badge, Note } from '../components/ui';
import { Hash, TimeAgo, Utc, Success, Amount, HeightLink, Address } from '../components/values';
import { ShareBar } from '../components/charts';

/** Render a decoded message value as a definition list, linking addresses and amounts. */
function Value(props: { v: unknown; k?: string }) {
  const v = props.v;
  if (v === null || v === undefined) return <span class="text-ink-500">—</span>;
  if (typeof v === 'string') {
    if (VALOPER_RE.test(v) || ADDR_RE.test(v)) return <Address value={v} full />;
    if (HASH_RE.test(v)) return <Hash value={v} full />;
    return <span class="break-all font-mono text-[0.8125rem]">{v}</span>;
  }
  if (typeof v === 'number' || typeof v === 'boolean') return <span class="font-mono">{String(v)}</span>;
  if (Array.isArray(v)) {
    if (v.length === 0) return <span class="text-ink-500">[]</span>;
    // coins
    if (v.every((c) => c && typeof c === 'object' && 'denom' in c && 'amount' in c)) {
      return (
        <span class="space-x-2">
          <For each={v as Array<{ denom: string; amount: string }>}>{(c) => (c.denom === 'uhash' ? <Amount uhash={c.amount} /> : <span class="font-mono">{c.amount} {c.denom}</span>)}</For>
        </span>
      );
    }
    return (
      <ol class="space-y-1 border-l border-ink-800 pl-3">
        <For each={v}>{(x) => <li><Value v={x} /></li>}</For>
      </ol>
    );
  }
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if ('denom' in o && 'amount' in o) return o.denom === 'uhash' ? <Amount uhash={String(o.amount)} /> : <span class="font-mono">{String(o.amount)} {String(o.denom)}</span>;
    return (
      <dl class="kv border-l border-ink-800 pl-3">
        <For each={Object.entries(o)}>
          {([k, x]) => (
            <>
              <dt class="font-mono text-xs">{k}</dt>
              <dd><Value v={x} k={k} /></dd>
            </>
          )}
        </For>
      </dl>
    );
  }
  return <span>{String(v)}</span>;
}

export default function Tx() {
  const params = useParams<{ hash: string }>();
  const q = useQuery<TxDetail>(() => `/txs/${params.hash.toUpperCase()}`);
  createEffect(() => setTitle(`Tx ${truncateMiddle(params.hash, 8, 6)}`));
  const t = () => q.data();

  const split = createMemo(() => {
    const f = t()?.fee;
    if (!f) return null;
    const total = f.total_uhash;
    return [
      { label: 'Validators & delegators', uhash: f.validators_uhash, pct: ratioPct(f.validators_uhash, total) },
      { label: `Founder (${f.founder_bps / 100} %)`, uhash: f.founder_uhash, pct: ratioPct(f.founder_uhash, total) },
      { label: 'Useful-service revenue', uhash: f.service_uhash, pct: ratioPct(f.service_uhash, total) },
    ];
  });

  return (
    <div>
      <PageHeader title="Transaction" lead={<Hash value={params.hash.toUpperCase()} full />} />
      <Show when={!q.error()} fallback={<ErrorState error={q.error()} retry={q.refetch} />}>
        <Show when={t()} fallback={<Skeleton rows={10} />}>
          {(tx) => (
            <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div class="space-y-4">
                <Card title="Overview">
                  <KV
                    items={[
                      ['Status', <span class="inline-flex items-center gap-2"><Success ok={tx().success} /> {tx().success ? 'Success' : `Failed (code ${tx().code})`}</span>],
                      ['Height', <HeightLink height={tx().height} />],
                      ['Time', <span><Utc iso={tx().time} /> <span class="text-ink-500">(<TimeAgo iso={tx().time} />)</span></span>],
                      ['Signers', <div class="flex flex-col gap-1"><For each={tx().signers}>{(s) => <Address value={s} full />}</For></div>],
                      ['Fee', <Amount uhash={tx().fee.total_uhash} />],
                      ['Gas', <span class="tabular">{formatInt(tx().gas_used)} / {formatInt(tx().gas_wanted)}</span>],
                      tx().memo ? ['Memo', <span class="break-all">{tx().memo}</span>] : null,
                      tx().timeout_height ? ['Timeout height', formatInt(tx().timeout_height)] : null,
                    ]}
                  />
                </Card>

                <Show when={!tx().success && tx().raw_log}>
                  <Card title="Failure log">
                    <pre class="overflow-auto whitespace-pre-wrap break-all rounded-md border border-ink-900 bg-ink-950 p-3 text-xs">{tx().raw_log}</pre>
                  </Card>
                </Show>

                <Card title={`Messages (${tx().messages.length})`}>
                  <ol class="space-y-4">
                    <For each={tx().messages}>
                      {(m, i) => (
                        <li class="rounded-md border border-ink-900 p-3">
                          <div class="mb-2 flex flex-wrap items-center gap-2">
                            <span class="font-mono text-xs text-ink-500">#{i()}</span>
                            <Badge variant="solid">{m.type}</Badge>
                            <span class="break-hash font-mono text-xs text-ink-500">{m.type_url}</span>
                          </div>
                          <Value v={m.value} />
                        </li>
                      )}
                    </For>
                  </ol>
                </Card>

                <Card title={`Events (${tx().events.length})`}>
                  <Show when={tx().events.length} fallback={<p class="text-sm text-ink-500">No events emitted.</p>}>
                    <ol class="space-y-3">
                      <For each={tx().events}>
                        {(ev) => (
                          <li>
                            <div class="mb-1 flex items-center gap-2 text-sm">
                              <span class="font-mono font-medium">{ev.type}</span>
                              <Show when={ev.msg_index !== null && ev.msg_index !== undefined}>
                                <span class="text-xs text-ink-500">msg #{ev.msg_index}</span>
                              </Show>
                            </div>
                            <dl class="kv text-xs">
                              <For each={ev.attributes}>
                                {(a) => (
                                  <>
                                    <dt class="font-mono">{a.key}</dt>
                                    <dd><Value v={a.value} /></dd>
                                  </>
                                )}
                              </For>
                            </dl>
                          </li>
                        )}
                      </For>
                    </ol>
                  </Show>
                </Card>

                <Show when={tx().raw}>
                  <Card title="Raw">
                    <RawToggle data={tx().raw} label="transaction JSON" />
                  </Card>
                </Show>
              </div>

              <aside class="space-y-4">
                <Card title="Where the fee went">
                  <Show when={split()} fallback={<p class="text-sm text-ink-500">No fee.</p>}>
                    <ul class="space-y-3">
                      <For each={split()!}>
                        {(s) => (
                          <li>
                            <div class="mb-1 flex items-baseline justify-between text-sm">
                              <span>{s.label}</span>
                              <span class="font-mono text-xs text-ink-500">{formatPct(s.pct, 1)}</span>
                            </div>
                            <ShareBar pct={s.pct} label={s.label} />
                            <div class="mt-1 text-xs text-ink-500"><Amount uhash={s.uhash} /></div>
                          </li>
                        )}
                      </For>
                    </ul>
                  </Show>
                  <Note class="mt-3">The founder share is 1 % of protocol fee revenue — a share of fees, not a transfer tax. Its ceiling is hardcoded in the binary.</Note>
                </Card>
                <Card title="Short link">
                  <p class="text-xs text-ink-500">Any client can link straight to this transaction:</p>
                  <Hash value={`hashgram.io/${params.hash.toUpperCase()}`} head={14} tail={8} class="mt-1" />
                </Card>
              </aside>
            </div>
          )}
        </Show>
      </Show>
    </div>
  );
}
