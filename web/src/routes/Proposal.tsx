import { For, Show, createEffect } from 'solid-js';
import { useParams } from '@solidjs/router';
import { useQuery, setTitle } from '../lib/query';
import type { ProposalDetail } from '../lib/api';
import { formatInt, decToPct } from '../lib/format';
import { PageHeader, Card, KV, Skeleton, ErrorState, Badge, Th, Empty, RawToggle, Glyph, Table } from '../components/ui';
import { Amount, Address, TimeAgo, Utc, HeightLink, TxLink } from '../components/values';
import { TallyBar } from '../components/charts';
import { statusLabel } from './Governance';

export default function ProposalPage() {
  const params = useParams<{ id: string }>();
  const q = useQuery<ProposalDetail>(() => `/gov/proposals/${params.id}`, { refreshMs: 30_000 });
  createEffect(() => setTitle(q.data() ? `Proposal #${q.data()!.id} — ${q.data()!.title}` : `Proposal #${params.id}`));
  const p = () => q.data();

  return (
    <div>
      <Show when={!q.error()} fallback={<ErrorState error={q.error()} retry={q.refetch} />}>
        <Show when={p()} fallback={<Skeleton rows={10} />}>
          {(pr) => (
            <>
              <PageHeader
                title={<span><span class="mr-2 font-mono text-ink-500">#{pr().id}</span>{pr().title}</span>}
                lead={pr().summary}
                aside={<Badge variant={pr().status === 'PROPOSAL_STATUS_VOTING_PERIOD' ? 'solid' : 'default'}>{statusLabel(pr().status)}</Badge>}
              />
              <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <div class="space-y-4">
                  <Card title="Tally">
                    <TallyBar yes={pr().tally.yes_pct ?? 0} no={pr().tally.no_pct ?? 0} veto={pr().tally.no_with_veto_pct ?? 0} abstain={pr().tally.abstain_pct ?? 0} quorumPct={Number(pr().params.quorum) * 100} />
                    <KV
                      class="mt-4"
                      items={[
                        ['Yes', <Amount uhash={pr().tally.yes_uhash} maxFraction={0} />],
                        ['No', <Amount uhash={pr().tally.no_uhash} maxFraction={0} />],
                        ['No with veto', <Amount uhash={pr().tally.no_with_veto_uhash} maxFraction={0} />],
                        ['Abstain', <Amount uhash={pr().tally.abstain_uhash} maxFraction={0} />],
                        ['Turnout', <span>{(pr().tally.turnout_pct ?? 0).toFixed(2)} % of <Amount uhash={pr().tally.bonded_uhash} maxFraction={0} /> bonded · quorum {decToPct(pr().params.quorum, 0)} <Glyph ok={pr().tally.quorum_reached} /></span>],
                        ['Passing now', <Glyph ok={pr().tally.passing} label={pr().tally.passing ? 'yes' : 'no'} />],
                      ]}
                    />
                  </Card>

                  <Card title={`Messages (${pr().messages.length})`}>
                    <For each={pr().messages}>
                      {(m) => (
                        <div class="mb-4 rounded-md border border-ink-900 p-3 last:mb-0">
                          <div class="mb-2 flex items-center gap-2"><Badge variant="solid">{m.type}</Badge><span class="break-hash font-mono text-xs text-ink-500">{m.type_url}</span></div>
                          <Show when={m.diff && m.diff.length}>
                            <Table class="mb-3">
                              <thead><tr><Th>Parameter</Th><Th>Current</Th><Th>Proposed</Th></tr></thead>
                              <tbody>
                                <For each={m.diff}>
                                  {(d) => (
                                    <tr>
                                      <td class="font-mono text-xs">{d.key}</td>
                                      <td class="font-mono text-xs text-ink-500 line-through">{typeof d.current === 'object' ? JSON.stringify(d.current) : String(d.current)}</td>
                                      <td class="font-mono text-xs font-semibold">{typeof d.proposed === 'object' ? JSON.stringify(d.proposed) : String(d.proposed)}</td>
                                    </tr>
                                  )}
                                </For>
                              </tbody>
                            </Table>
                          </Show>
                          <RawToggle data={m.value} label="message" />
                        </div>
                      )}
                    </For>
                  </Card>

                  <Card title={`Votes (${pr().votes.length})`}>
                    <Show when={pr().votes.length} fallback={<Empty title="No votes recorded yet" />}>
                      <div class="overflow-x-auto">
                        <Table>
                          <thead><tr><Th>Voter</Th><Th>Option</Th><Th num>Height</Th><Th>Tx</Th></tr></thead>
                          <tbody>
                            <For each={pr().votes}>
                              {(v) => (
                                <tr>
                                  <td><Address value={v.voter} label={v.label} /></td>
                                  <td><For each={v.options}>{(o) => <Badge class="mr-1">{o.option.replace('VOTE_OPTION_', '').replace(/_/g, ' ').toLowerCase()}{Number(o.weight) < 1 ? ` ${(Number(o.weight) * 100).toFixed(0)} %` : ''}</Badge>}</For></td>
                                  <td class="num">{v.height ? <HeightLink height={v.height} /> : '—'}</td>
                                  <td>{v.tx_hash ? <TxLink hash={v.tx_hash} head={6} tail={4} /> : '—'}</td>
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
                  <Card title="Timeline">
                    <ol class="space-y-3 text-sm">
                      <For each={pr().timeline}>
                        {(t) => (
                          <li class="flex gap-3">
                            <span class="font-mono">{t.done ? '●' : '○'}</span>
                            <div>
                              <div class={t.done ? 'font-medium' : 'text-ink-500'}>{t.event}</div>
                              <div class="text-xs text-ink-500"><Utc iso={t.time} /> · <TimeAgo iso={t.time} /></div>
                            </div>
                          </li>
                        )}
                      </For>
                    </ol>
                  </Card>
                  <Card title="Deposit">
                    <KV items={[['Total', <Amount uhash={pr().total_deposit_uhash} maxFraction={0} />], ['Minimum', <Amount uhash={pr().params.min_deposit_uhash} maxFraction={0} />], ['Proposer', <Address value={pr().proposer} head={6} tail={4} />]]} />
                    <Show when={pr().deposits.length}>
                      <ul class="mt-3 space-y-1 text-xs">
                        <For each={pr().deposits}>{(d) => <li class="flex justify-between"><Address value={d.depositor} head={6} tail={4} copy={false} /><Amount uhash={d.amount_uhash} maxFraction={0} /></li>}</For>
                      </ul>
                    </Show>
                  </Card>
                  <Card title="Rules">
                    <KV items={[['Quorum', decToPct(pr().params.quorum, 1)], ['Threshold', decToPct(pr().params.threshold, 1)], ['Veto', decToPct(pr().params.veto_threshold, 1)], ['Voting period', `${formatInt(Math.round(pr().params.voting_period_seconds / 86_400))} days`]]} />
                  </Card>
                </aside>
              </div>
            </>
          )}
        </Show>
      </Show>
    </div>
  );
}
