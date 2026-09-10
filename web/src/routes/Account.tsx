import { For, Show, createEffect, createMemo, createSignal } from 'solid-js';
import { A, useParams } from '@solidjs/router';
import { useQuery, usePaged, setTitle } from '../lib/query';
import type { AccountDetail, TxSummary, Transfer, Vesting } from '../lib/api';
import { formatInt, truncateMiddle, toBigInt, formatHash } from '../lib/format';
import { PageHeader, Card, KV, Skeleton, ErrorState, Badge, Tabs, Th, Pager, Empty, Note, Table } from '../components/ui';
import { Hash, TimeAgo, Utc, Amount, HeightLink, TxLink, Success, Address } from '../components/values';
import { LineChart } from '../components/charts';
import { QR } from '../components/QR';

export function VestingChart(props: { vesting: Vesting; height?: number; base?: bigint }) {
  const series = createMemo(() => {
    const v = props.vesting;
    const start = Date.parse(v.start_time);
    // Cumulative released over time. `original_uhash` is the vesting portion
    // (Cosmos original_vesting); `base` is what was unlocked at genesis.
    let released = props.base ?? 0n;
    const pts: Array<{ x: number; y: number }> = [{ x: start, y: Number(released / 1_000_000n) }];
    let t = start;
    for (const p of v.periods) {
      t += p.length_seconds * 1000;
      released += toBigInt(p.amount_uhash);
      pts.push({ x: t, y: Number(released / 1_000_000n) });
    }
    return [{ name: 'Released (HASH)', points: pts, step: true, area: true }];
  });
  return (
    <LineChart
      series={series()}
      xTime
      height={props.height ?? 220}
      ariaLabel="Vesting schedule: cumulative HASH released over time"
      yFormat={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : v.toLocaleString('en-US'))}
      marker={{ x: Date.now(), label: 'today' }}
    />
  );
}

export default function Account() {
  const params = useParams<{ address: string }>();
  const q = useQuery<AccountDetail>(() => `/accounts/${params.address}`, { refreshMs: 30_000 });
  const [tab, setTab] = createSignal<'txs' | 'transfers'>('txs');
  const txs = usePaged<TxSummary>(() => `/accounts/${params.address}/transactions`);
  const transfers = usePaged<Transfer>(() => `/accounts/${params.address}/transfers`);
  createEffect(() => setTitle(q.data()?.label ?? q.data()?.username ?? truncateMiddle(params.address, 10, 6)));
  const a = () => q.data();

  return (
    <div>
      <PageHeader
        title={
          <span class="flex flex-wrap items-center gap-3">
            <Show when={a()?.label}>
              <span>{a()!.label}</span>
            </Show>
            <Show when={a()?.username}>
              <Badge variant="solid">@{a()!.username}</Badge>
            </Show>
            <Show when={!a()?.label && !a()?.username}>
              <span>Account</span>
            </Show>
          </span>
        }
        lead={<Hash value={params.address} full />}
        aside={
          <Show when={a()}>
            <div class="flex gap-2">
              <Badge>{a()!.kind.replace('_', ' ')}</Badge>
              <Show when={a()!.validator}>
                <A href={`/validators/${a()!.validator!.operator}`} class="badge hover:bg-ink-800">
                  validator {a()!.validator!.moniker}
                </A>
              </Show>
              <Show when={a()!.provider}>
                <A href={`/rewards/providers/${a()!.provider!.operator}`} class="badge hover:bg-ink-800">
                  provider
                </A>
              </Show>
            </div>
          </Show>
        }
      />
      <Show when={!q.error()} fallback={<ErrorState error={q.error()} retry={q.refetch} />}>
        <Show when={a()} fallback={<Skeleton rows={10} />}>
          {(acc) => (
            <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div class="space-y-4">
                <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div class="card p-4">
                    <div class="text-xs uppercase tracking-wide text-ink-500">Balance</div>
                    <div class="mt-1 text-xl font-semibold tabular"><Amount uhash={acc().balance_uhash} maxFraction={2} /></div>
                  </div>
                  <div class="card p-4">
                    <div class="text-xs uppercase tracking-wide text-ink-500">Spendable</div>
                    <div class="mt-1 text-xl font-semibold tabular"><Amount uhash={acc().spendable_uhash} maxFraction={2} /></div>
                  </div>
                  <div class="card p-4">
                    <div class="text-xs uppercase tracking-wide text-ink-500">Delegated</div>
                    <div class="mt-1 text-xl font-semibold tabular"><Amount uhash={acc().total_delegated_uhash} maxFraction={2} /></div>
                    <div class="text-xs text-ink-500">rewards <Amount uhash={acc().total_rewards_uhash} maxFraction={2} /></div>
                  </div>
                </div>

                <Show when={acc().vesting}>
                  <Card title="Vesting">
                    <KV
                      class="mb-4"
                      items={[
                        ['Type', <span class="font-mono text-xs">{acc().vesting!.type}</span>],
                        ['Vesting total', <Amount uhash={acc().vesting!.original_uhash} maxFraction={0} />],
                        ['Released so far', <Amount uhash={acc().vesting!.vested_uhash} maxFraction={0} />],
                        ['Still vesting', <Amount uhash={acc().vesting!.vesting_uhash} maxFraction={0} />],
                        ['Start', <Utc iso={acc().vesting!.start_time} />],
                        ['End', <span><Utc iso={acc().vesting!.end_time} /> <span class="text-ink-500">(<TimeAgo iso={acc().vesting!.end_time} />)</span></span>],
                        ['Periods', `${acc().vesting!.periods.length} · ${acc().vesting!.periods.filter((p) => p.released).length} released`],
                      ]}
                    />
                    <VestingChart vesting={acc().vesting!} />
                  </Card>
                </Show>

                <Show when={acc().delegations.length}>
                  <Card title={`Delegations (${acc().delegations.length})`}>
                    <Table>
                      <thead>
                        <tr>
                          <Th>Validator</Th>
                          <Th num>Amount</Th>
                          <Th num>Pending rewards</Th>
                        </tr>
                      </thead>
                      <tbody>
                        <For each={acc().delegations}>
                          {(d) => (
                            <tr>
                              <td><A href={`/validators/${d.validator.operator}`} class="hover:underline">{d.validator.moniker || d.validator.operator}</A></td>
                              <td class="num"><Amount uhash={d.balance_uhash} maxFraction={2} /></td>
                              <td class="num text-ink-500"><Amount uhash={d.reward_uhash ?? '0'} maxFraction={4} /></td>
                            </tr>
                          )}
                        </For>
                      </tbody>
                    </Table>
                  </Card>
                </Show>

                <Card>
                  <Tabs tabs={[{ id: 'txs', label: 'Transactions', count: acc().tx_count }, { id: 'transfers', label: 'Transfers' }]} value={tab()} onChange={setTab} />
                  <Show when={tab() === 'txs'}>
                    <Show when={!txs.error()} fallback={<ErrorState error={txs.error()} retry={txs.refetch} compact />}>
                      <Show when={!txs.loading() || txs.items().length} fallback={<Skeleton rows={6} />}>
                        <Show when={txs.items().length} fallback={<Empty title="No transactions" />}>
                          <div class="overflow-x-auto">
                            <Table>
                              <thead><tr><Th>Status</Th><Th>Hash</Th><Th>Type</Th><Th>Summary</Th><Th num>Height</Th><Th num>Age</Th></tr></thead>
                              <tbody>
                                <For each={txs.items()}>
                                  {(t) => (
                                    <tr>
                                      <td><Success ok={t.success} /></td>
                                      <td><TxLink hash={t.hash} /></td>
                                      <td><Badge>{t.type}</Badge></td>
                                      <td class="max-w-[16rem] truncate text-ink-500">{t.summary ?? ''}</td>
                                      <td class="num"><HeightLink height={t.height} /></td>
                                      <td class="num text-ink-500"><TimeAgo iso={t.time} /></td>
                                    </tr>
                                  )}
                                </For>
                              </tbody>
                            </Table>
                          </div>
                          <Pager next={txs.next()} onNext={txs.goNext} onReset={txs.reset} hasPrev={txs.hasPrev()} loading={txs.loading()} />
                        </Show>
                      </Show>
                    </Show>
                  </Show>
                  <Show when={tab() === 'transfers'}>
                    <Show when={!transfers.error()} fallback={<ErrorState error={transfers.error()} retry={transfers.refetch} compact />}>
                      <Show when={!transfers.loading() || transfers.items().length} fallback={<Skeleton rows={6} />}>
                        <Show when={transfers.items().length} fallback={<Empty title="No transfers" />}>
                          <div class="overflow-x-auto">
                            <Table>
                              <thead><tr><Th>Direction</Th><Th>Counterparty</Th><Th num>Amount</Th><Th>Kind</Th><Th num>Height</Th><Th num>Age</Th></tr></thead>
                              <tbody>
                                <For each={transfers.items()}>
                                  {(t) => {
                                    const out = t.from === params.address;
                                    return (
                                      <tr>
                                        <td class="font-mono">{out ? '▲ out' : '▼ in'}</td>
                                        <td><Address value={out ? t.to : t.from} label={out ? t.to_label : t.from_label} /></td>
                                        <td class="num"><Amount uhash={t.amount_uhash} maxFraction={6} bold={!out} /></td>
                                        <td><Badge variant="muted">{t.kind ?? 'tx'}</Badge></td>
                                        <td class="num">
                                          <Show when={t.tx_hash} fallback={<HeightLink height={t.height} />}>
                                            <TxLink hash={t.tx_hash} head={6} tail={4} />
                                          </Show>
                                        </td>
                                        <td class="num text-ink-500"><TimeAgo iso={t.time} /></td>
                                      </tr>
                                    );
                                  }}
                                </For>
                              </tbody>
                            </Table>
                          </div>
                          <Pager next={transfers.next()} onNext={transfers.goNext} onReset={transfers.reset} hasPrev={transfers.hasPrev()} loading={transfers.loading()} />
                        </Show>
                      </Show>
                    </Show>
                  </Show>
                </Card>
              </div>

              <aside class="space-y-4">
                <Card title="Details">
                  <KV
                    items={[
                      acc().account_type ? ['Type', <span class="break-all font-mono text-xs">{acc().account_type}</span>] : null,
                      acc().account_number !== undefined ? ['Account #', formatInt(acc().account_number)] : null,
                      acc().sequence !== undefined ? ['Sequence', formatInt(acc().sequence)] : null,
                      acc().share_ppm !== undefined ? ['Share of supply', `${(acc().share_ppm! / 10_000).toFixed(4)} %`] : null,
                      acc().first_seen ? ['First seen', <span><HeightLink height={acc().first_seen!.height} /> · <TimeAgo iso={acc().first_seen!.time} /></span>] : null,
                      acc().last_seen ? ['Last seen', <span><HeightLink height={acc().last_seen!.height} /> · <TimeAgo iso={acc().last_seen!.time} /></span>] : null,
                    ]}
                  />
                </Card>
                <Show when={acc().provider}>
                  <Card title="Provider record">
                    <KV
                      items={[
                        ['Roles', acc().provider!.roles.join(', ') || '—'],
                        ['Bond', <Amount uhash={acc().provider!.bond_uhash} maxFraction={0} />],
                        ['Lifetime paid', <Amount uhash={acc().provider!.lifetime_paid_uhash} maxFraction={2} />],
                        ['Jailed', acc().provider!.jailed ? '✗ yes' : '✓ no'],
                      ]}
                    />
                    <A href={`/rewards/providers/${acc().provider!.operator}`} class="btn mt-3">Provider details</A>
                  </Card>
                </Show>
                <Card title="Address">
                  <div class="flex flex-col items-center gap-2">
                    <QR value={params.address} size={160} label={`QR code for ${params.address}`} />
                    <span class="break-all text-center font-mono text-xs text-ink-500">{params.address}</span>
                  </div>
                  <Note class="mt-3">Read-only. This site cannot send, sign or receive; the QR only encodes the address text. {formatHash(acc().balance_uhash, { unit: true })} on chain.</Note>
                </Card>
              </aside>
            </div>
          )}
        </Show>
      </Show>
    </div>
  );
}
