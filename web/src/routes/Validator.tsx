import { For, Show, createEffect } from 'solid-js';
import { A, useParams } from '@solidjs/router';
import { useQuery, setTitle } from '../lib/query';
import type { ValidatorDetail } from '../lib/api';
import { formatInt, formatPct, decToPct, truncateMiddle } from '../lib/format';
import { PageHeader, Card, KV, Skeleton, ErrorState, Badge, Th, Empty, ExtLink, Table } from '../components/ui';
import { Hash, TimeAgo, Amount, HeightLink, Address } from '../components/values';
import { SignStrip } from '../components/charts';

export default function ValidatorPage() {
  const params = useParams<{ operator: string }>();
  const q = useQuery<ValidatorDetail>(() => `/validators/${params.operator}`, { refreshMs: 30_000 });
  createEffect(() => setTitle(q.data()?.moniker ?? truncateMiddle(params.operator, 14, 6)));
  const v = () => q.data();

  return (
    <div>
      <PageHeader
        title={v()?.moniker ?? 'Validator'}
        lead={<Hash value={params.operator} full />}
        aside={
          <Show when={v()}>
            <div class="flex gap-2">
              <Show when={v()!.jailed} fallback={<Badge variant={v()!.status === 'BOND_STATUS_BONDED' ? 'solid' : 'muted'}>{v()!.status.replace('BOND_STATUS_', '').toLowerCase()}</Badge>}>
                <Badge>✗ jailed</Badge>
              </Show>
              <Show when={v()!.rank !== undefined}>
                <Badge variant="muted">rank {v()!.rank}</Badge>
              </Show>
            </div>
          </Show>
        }
      />
      <Show when={!q.error()} fallback={<ErrorState error={q.error()} retry={q.refetch} />}>
        <Show when={v()} fallback={<Skeleton rows={10} />}>
          {(val) => (
            <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div class="space-y-4">
                <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div class="card p-4"><div class="text-xs uppercase tracking-wide text-ink-500">Voting power</div><div class="mt-1 text-xl font-semibold tabular">{val().voting_power_pct.toFixed(2)} %</div><div class="text-xs text-ink-500"><Amount uhash={val().tokens_uhash} maxFraction={0} /></div></div>
                  <div class="card p-4"><div class="text-xs uppercase tracking-wide text-ink-500">Uptime</div><div class="mt-1 text-xl font-semibold tabular">{formatPct(val().uptime_pct)}</div><div class="text-xs text-ink-500">{formatInt(val().missed_blocks)} missed of {formatInt(val().signed_blocks_window ?? 30_000)}</div></div>
                  <div class="card p-4"><div class="text-xs uppercase tracking-wide text-ink-500">Commission</div><div class="mt-1 text-xl font-semibold tabular">{decToPct(val().commission_rate)}</div><div class="text-xs text-ink-500">max {decToPct(val().commission_max_rate)} · Δ {decToPct(val().commission_max_change_rate)}</div></div>
                  <div class="card p-4"><div class="text-xs uppercase tracking-wide text-ink-500">Delegators</div><div class="mt-1 text-xl font-semibold tabular">{formatInt(val().delegator_count)}</div><div class="text-xs text-ink-500">self <Amount uhash={val().self_delegation_uhash} maxFraction={0} /></div></div>
                </div>

                <Card title="Signing history" action={<span class="text-xs text-ink-500">last {val().signing_history.length} blocks · filled = signed</span>}>
                  <SignStrip items={val().signing_history} label={`${val().moniker} signing history`} />
                </Card>

                <Card title={`Recent proposed blocks${val().proposed_count !== undefined ? ` (${formatInt(val().proposed_count)} total)` : ''}`}>
                  <Show when={val().proposed_blocks.length} fallback={<Empty title="No blocks proposed yet" />}>
                    <div class="overflow-x-auto">
                      <Table>
                        <thead><tr><Th>Height</Th><Th>Hash</Th><Th num>Txs</Th><Th num>Signatures</Th><Th num>Age</Th></tr></thead>
                        <tbody>
                          <For each={val().proposed_blocks}>
                            {(b) => (
                              <tr>
                                <td><HeightLink height={b.height} class="font-semibold" /></td>
                                <td><Hash value={b.hash} href={`/blocks/${b.height}`} head={8} tail={6} /></td>
                                <td class="num">{b.tx_count}</td>
                                <td class="num">{b.signatures.present}/{b.signatures.total}</td>
                                <td class="num text-ink-500"><TimeAgo iso={b.time} /></td>
                              </tr>
                            )}
                          </For>
                        </tbody>
                      </Table>
                    </div>
                  </Show>
                </Card>

                <Card title={`Delegations (${val().delegations.length})`}>
                  <Show when={val().delegations.length} fallback={<Empty title="No delegations" />}>
                    <div class="overflow-x-auto">
                      <Table>
                        <thead><tr><Th>Delegator</Th><Th num>Amount</Th></tr></thead>
                        <tbody>
                          <For each={val().delegations}>
                            {(d) => (
                              <tr>
                                <td><Address value={d.delegator} label={d.label} /></td>
                                <td class="num"><Amount uhash={d.balance_uhash} maxFraction={2} /></td>
                              </tr>
                            )}
                          </For>
                        </tbody>
                      </Table>
                    </div>
                  </Show>
                </Card>
              </div>

              <aside class="space-y-4">
                <Card title="Identity">
                  <KV
                    items={[
                      ['Operator', <Hash value={val().operator} head={14} tail={6} />],
                      ['Account', <A href={`/accounts/${val().operator.replace('hashvaloper1', 'hash1')}`} class="text-xs hover:underline">view account</A>],
                      ['Consensus', <Hash value={val().consensus_address} head={12} tail={6} />],
                      val().consensus_pubkey ? ['Pubkey', <Hash value={val().consensus_pubkey} head={10} tail={6} />] : null,
                      val().website ? ['Website', <ExtLink href={val().website!.startsWith('http') ? val().website! : `https://${val().website}`}>{val().website}</ExtLink>] : null,
                      val().identity ? ['Identity', <span class="font-mono text-xs">{val().identity}</span>] : null,
                      val().details ? ['Details', <span class="text-ink-500">{val().details}</span>] : null,
                      val().min_self_delegation ? ['Min self-delegation', <Amount uhash={val().min_self_delegation} maxFraction={0} />] : null,
                      val().unbonding_height ? ['Unbonding height', <HeightLink height={val().unbonding_height} />] : null,
                    ]}
                  />
                </Card>
              </aside>
            </div>
          )}
        </Show>
      </Show>
    </div>
  );
}
