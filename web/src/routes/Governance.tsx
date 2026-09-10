import { For, Show, onMount } from 'solid-js';
import { A } from '@solidjs/router';
import { useQuery, setTitle } from '../lib/query';
import type { Proposal, GovParams } from '../lib/api';
import { formatDuration, decToPct, formatInt } from '../lib/format';
import { PageHeader, Card, Skeleton, ErrorState, Empty, Badge, KV, Note } from '../components/ui';
import { Amount, TimeAgo, Address } from '../components/values';
import { TallyBar } from '../components/charts';

export function statusLabel(s: string): string {
  return s.replace('PROPOSAL_STATUS_', '').replace(/_/g, ' ').toLowerCase();
}

export function ProposalCard(props: { p: Proposal; quorum: number }) {
  const p = props.p;
  const voting = p.status === 'PROPOSAL_STATUS_VOTING_PERIOD';
  return (
    <article class="card card-hover p-4">
      <div class="mb-2 flex flex-wrap items-center gap-2">
        <span class="font-mono text-xs text-ink-500">#{p.id}</span>
        <Badge variant={voting ? 'solid' : p.status === 'PROPOSAL_STATUS_PASSED' ? 'default' : 'muted'}>{statusLabel(p.status)}</Badge>
        <For each={p.messages}>{(m) => <Badge variant="muted">{m.type}</Badge>}</For>
        <span class="ml-auto text-xs text-ink-500">
          {voting && p.voting_end_time ? <>ends <TimeAgo iso={p.voting_end_time} /></> : <>submitted <TimeAgo iso={p.submit_time} /></>}
        </span>
      </div>
      <h2 class="text-base font-semibold">
        <A href={`/governance/${p.id}`} class="hover:underline">
          {p.title}
        </A>
      </h2>
      <p class="mt-1 line-clamp-2 text-sm text-ink-500">{p.summary}</p>
      <div class="mt-3">
        <TallyBar yes={p.tally.yes_pct ?? 0} no={p.tally.no_pct ?? 0} veto={p.tally.no_with_veto_pct ?? 0} abstain={p.tally.abstain_pct ?? 0} quorumPct={props.quorum} />
      </div>
      <div class="mt-2 flex flex-wrap gap-4 text-xs text-ink-500">
        <span>turnout {(p.tally.turnout_pct ?? 0).toFixed(1)} % {p.tally.quorum_reached ? '✓ quorum' : '· quorum not reached'}</span>
        <span>deposit <Amount uhash={p.total_deposit_uhash} maxFraction={0} /></span>
        <span>by <Address value={p.proposer} head={6} tail={4} copy={false} /></span>
        <A href={`/governance/${p.id}`} class="ml-auto inline-block py-1 underline decoration-ink-500 hover:decoration-white">
          Details, votes and timeline →
        </A>
      </div>
    </article>
  );
}

export default function Governance() {
  const q = useQuery<{ items: Proposal[]; params: GovParams }>('/gov/proposals', { refreshMs: 30_000 });
  onMount(() => setTitle('Governance'));
  const quorum = () => Number(q.data()?.params.quorum ?? '0.4') * 100;

  return (
    <div>
      <PageHeader title="Governance" lead="Bonded HASH votes on parameter changes, treasury disbursements and upgrades. Proposals need 40 % turnout, more than 50 % Yes, and fewer than 33.4 % No-with-veto votes to pass, over a 7-day voting period." />
      <Show when={!q.error()} fallback={<ErrorState error={q.error()} retry={q.refetch} />}>
        <Show when={q.data()} fallback={<Skeleton rows={8} />}>
          <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div class="space-y-3">
              <Show when={q.data()!.items.length} fallback={<Empty title="No proposals yet" />}>
                <For each={q.data()!.items.slice().sort((a, b) => b.id - a.id)}>{(p) => <ProposalCard p={p} quorum={quorum()} />}</For>
              </Show>
            </div>
            <aside class="space-y-4">
              <Card title="Parameters">
                <KV
                  items={[
                    ['Quorum', decToPct(q.data()!.params.quorum, 1)],
                    ['Threshold', decToPct(q.data()!.params.threshold, 1)],
                    ['Veto threshold', decToPct(q.data()!.params.veto_threshold, 1)],
                    ['Voting period', formatDuration(q.data()!.params.voting_period_seconds)],
                    q.data()!.params.expedited_voting_period_seconds ? ['Expedited period', formatDuration(q.data()!.params.expedited_voting_period_seconds)] : null,
                    ['Min deposit', <Amount uhash={q.data()!.params.min_deposit_uhash} maxFraction={0} />],
                    ['Deposit period', formatDuration(q.data()!.params.max_deposit_period_seconds)],
                    ['Proposals', formatInt(q.data()!.items.length)],
                  ]}
                />
              </Card>
              <Note title="How a vote passes.">Turnout must reach the quorum (dashed line on each bar); of the votes cast excluding Abstain, more than the threshold must be Yes; and No-with-veto must stay below the veto threshold, otherwise the deposit is burned.</Note>
            </aside>
          </div>
        </Show>
      </Show>
    </div>
  );
}
