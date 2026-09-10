import { For, Show, createEffect } from 'solid-js';
import { useParams } from '@solidjs/router';
import { useQuery, setTitle } from '../lib/query';
import type { ProviderDetail } from '../lib/api';
import { formatInt, formatBytes, formatPct, truncateMiddle } from '../lib/format';
import { PageHeader, Card, KV, Skeleton, ErrorState, Badge, Th, Empty, RawToggle, Table } from '../components/ui';
import { Hash, TimeAgo, Amount, HeightLink, TxLink, Address } from '../components/values';

export default function ProviderPage() {
  const params = useParams<{ operator: string }>();
  const q = useQuery<ProviderDetail>(() => `/rewards/providers/${params.operator}`, { refreshMs: 30_000 });
  createEffect(() => setTitle(`Provider ${q.data()?.moniker ?? truncateMiddle(params.operator, 10, 6)}`));
  const p = () => q.data();

  return (
    <div>
      <PageHeader
        title={p()?.moniker ?? 'Provider'}
        lead={<Address value={params.operator} full />}
        aside={
          <Show when={p()}>
            <div class="flex gap-2">
              <For each={p()!.roles}>{(r) => <Badge>{r}</Badge>}</For>
              {p()!.jailed ? <Badge>✗ jailed</Badge> : <Badge variant="solid">✓ active</Badge>}
            </div>
          </Show>
        }
      />
      <Show when={!q.error()} fallback={<ErrorState error={q.error()} retry={q.refetch} />}>
        <Show when={p()} fallback={<Skeleton rows={10} />}>
          {(pr) => (
            <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div class="space-y-4">
                <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div class="card p-4"><div class="text-xs uppercase tracking-wide text-ink-500">Lifetime paid</div><div class="mt-1 text-xl font-semibold tabular"><Amount uhash={pr().lifetime_paid_uhash} maxFraction={2} /></div></div>
                  <div class="card p-4"><div class="text-xs uppercase tracking-wide text-ink-500">Epoch credit</div><div class="mt-1 text-xl font-semibold tabular font-mono">{formatInt(pr().current_epoch_credit)}</div></div>
                  <div class="card p-4"><div class="text-xs uppercase tracking-wide text-ink-500">Challenge pass rate</div><div class="mt-1 text-xl font-semibold tabular">{formatPct(pr().challenges.pass_rate * 100, 1)}</div><div class="text-xs text-ink-500">{pr().challenges.passed}/{pr().challenges.total}</div></div>
                  <div class="card p-4"><div class="text-xs uppercase tracking-wide text-ink-500">Fraud score</div><div class="mt-1 text-xl font-semibold tabular"><span class="font-mono">{formatInt(pr().fraud_score)}</span></div></div>
                </div>

                <Card title={`Payout history (${pr().payouts.length})`}>
                  <Show when={pr().payouts.length} fallback={<Empty title="No payouts yet" hint="Payouts are transfers from the serviceproof module account at epoch close." />}>
                    <div class="overflow-x-auto">
                      <Table>
                        <thead><tr><Th>Height</Th><Th>To</Th><Th num>Amount</Th><Th num>Age</Th></tr></thead>
                        <tbody>
                          <For each={pr().payouts}>
                            {(t) => (
                              <tr>
                                <td><Show when={t.tx_hash} fallback={<HeightLink height={t.height} />}><TxLink hash={t.tx_hash} head={6} tail={4} /></Show></td>
                                <td><Address value={t.to} head={6} tail={4} copy={false} /></td>
                                <td class="num"><Amount uhash={t.amount_uhash} bold /></td>
                                <td class="num text-ink-500"><TimeAgo iso={t.time} /></td>
                              </tr>
                            )}
                          </For>
                        </tbody>
                      </Table>
                    </div>
                  </Show>
                </Card>

                <Card title={`Assignments (${pr().assignments.length})`}>
                  <Show when={pr().assignments.length} fallback={<Empty title="No storage assignments" />}>
                    <RawToggle data={pr().assignments} label="assignments" />
                  </Show>
                </Card>

                <Show when={pr().challenges.recent?.length}>
                  <Card title="Recent challenges">
                    <RawToggle data={pr().challenges.recent} label="challenges" />
                  </Card>
                </Show>
                <Show when={pr().fraud && Object.keys(pr().fraud).length}>
                  <Card title="Fraud record">
                    <RawToggle data={pr().fraud} label="fraud record" />
                  </Card>
                </Show>
              </div>
              <aside class="space-y-4">
                <Card title="Record">
                  <KV
                    items={[
                      ['Operator', <Address value={pr().operator} head={10} tail={6} />],
                      ['Reward address', <Address value={pr().reward_address} head={10} tail={6} />],
                      ['Bond', <Amount uhash={pr().bond_uhash} maxFraction={0} />],
                      ['Declared storage', formatBytes(pr().declared_storage_bytes)],
                      pr().peer_id ? ['Peer id', <Hash value={pr().peer_id} head={10} tail={6} />] : null,
                      pr().registered_height ? ['Registered', <HeightLink height={pr().registered_height} />] : null,
                      pr().jailed && pr().jailed_until_height ? ['Jailed until', <HeightLink height={pr().jailed_until_height} />] : null,
                    ]}
                  />
                </Card>
                <Show when={pr().rewards_raw}>
                  <Card title="Raw rewards"><RawToggle data={pr().rewards_raw} label="rewards JSON" /></Card>
                </Show>
              </aside>
            </div>
          )}
        </Show>
      </Show>
    </div>
  );
}
