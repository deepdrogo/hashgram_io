import { For, Show, createMemo, onMount } from 'solid-js';
import { A } from '@solidjs/router';
import { ShieldCheck, Percent, Timer, Users, Lock, Gavel } from 'lucide-solid';
import { useQuery, setTitle } from '../lib/query';
import { useLive } from '../lib/live';
import type { Validator, Staking } from '../lib/api';
import { formatInt, formatPct, decToPct, formatDuration, ratioPct } from '../lib/format';
import { PageHeader, Card, Skeleton, ErrorState, Th, Empty, Badge, Note, Stat, KV, Table } from '../components/ui';
import { Amount } from '../components/values';
import { BarList, ShareBar, SignStrip } from '../components/charts';

export default function Validators() {
  const q = useQuery<{ items: Validator[]; height: number; signed_blocks_window: number }>('/validators', { refreshMs: 30_000 });
  const st = useQuery<Staking>('/staking', { refreshMs: 60_000 });
  const { store } = useLive();
  onMount(() => setTitle('Validators'));

  const items = createMemo(() => (q.data()?.items ?? []).slice().sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0)));
  const bonded = createMemo(() => items().filter((v) => v.status === 'BOND_STATUS_BONDED' && !v.jailed));
  const twoThirds = createMemo(() => {
    let acc = 0;
    let n = 0;
    for (const v of bonded()) {
      acc += v.voting_power_pct;
      n++;
      if (acc > 66.67) break;
    }
    return n;
  });
  const totalProposed = createMemo(() => items().reduce((a, v) => a + (v.proposed_count ?? 0), 0));
  const proposed = (v: Validator) => v.proposed_count ?? 0;
  const avgUptime = createMemo(() => (bonded().length ? bonded().reduce((a, v) => a + v.uptime_pct, 0) / bonded().length : 0));
  const avgCommission = createMemo(() => (bonded().length ? (bonded().reduce((a, v) => a + Number(v.commission_rate), 0) / bonded().length) * 100 : 0));
  const delegators = createMemo(() => items().reduce((a, v) => a + v.delegator_count, 0));
  const nakamoto = createMemo(() => {
    // Nakamoto coefficient for liveness: smallest set holding > 1/3 (enough to halt)
    let acc = 0;
    let n = 0;
    for (const v of bonded()) {
      acc += v.voting_power_pct;
      n++;
      if (acc > 33.34) break;
    }
    return n;
  });

  return (
    <div>
      <PageHeader title="Validators" lead="The validator set signs every block. The chain is live while validators holding more than two thirds of bonded power are online and agree; below that threshold no block can be finalised." />
      <Show when={!q.error()} fallback={<ErrorState error={q.error()} retry={q.refetch} />}>
        <Show when={q.data()} fallback={<Skeleton rows={10} />}>
          <div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <Stat label="Active validators" value={formatInt(bonded().length)} hint={st.data() ? `max ${st.data()!.params.max_validators} · ${st.data()!.validators.jailed} jailed` : undefined} />
            <Stat label="Bonded" value={st.data() ? formatPct(st.data()!.bonded_ratio * 100) : '—'} hint={st.data() ? <Amount uhash={st.data()!.bonded_uhash} compact /> : undefined} />
            <Stat label="Liveness set (> ⅔)" value={`${twoThirds()}`} hint="validators needed to finalise" />
            <Stat label="Halting set (> ⅓)" value={`${nakamoto()}`} hint="validators that could stop the chain" />
            <Stat label="Average uptime" value={formatPct(avgUptime())} hint={`over ${formatInt(q.data()!.signed_blocks_window)} blocks`} />
            <Stat label="Delegators" value={formatInt(delegators())} hint={`avg commission ${avgCommission().toFixed(2)} %`} />
          </div>

          <div class="mb-6 grid gap-4 lg:grid-cols-3">
            <Card title="Voting power distribution" action={<Percent class="size-4 text-ink-500" aria-hidden="true" />}>
              <Show when={bonded().length} fallback={<Empty title="No bonded validators" />}>
                <BarList items={bonded().slice(0, 25).map((v) => ({ label: v.moniker || v.operator, value: v.voting_power_pct, href: `/validators/${v.operator}` }))} format={(v) => `${v.toFixed(2)} %`} max={Math.max(1, ...bonded().map((v) => v.voting_power_pct))} />
              </Show>
            </Card>
            <Card title="Blocks proposed" action={<span class="text-xs text-ink-500">{formatInt(totalProposed())} indexed</span>}>
              <Show when={totalProposed() > 0} fallback={<Empty title="No blocks indexed yet" />}>
                <BarList items={items().filter((v) => proposed(v) > 0).slice(0, 25).map((v) => ({ label: v.moniker || v.operator, value: proposed(v), href: `/validators/${v.operator}` }))} format={(v) => `${formatInt(v)} (${totalProposed() ? ((v / totalProposed()) * 100).toFixed(1) : '0'} %)`} max={Math.max(1, ...items().map(proposed))} />
              </Show>
            </Card>
            <Card title="Staking parameters" action={<Lock class="size-4 text-ink-500" aria-hidden="true" />}>
              <Show when={st.data()} fallback={<Skeleton rows={5} />}>
                <KV
                  items={[
                    ['Bonded', <Amount uhash={st.data()!.bonded_uhash} maxFraction={0} />],
                    ['Not bonded', <Amount uhash={st.data()!.not_bonded_uhash} maxFraction={0} />],
                    ['Bonded ratio', formatPct(ratioPct(st.data()!.bonded_uhash, st.data()!.total_supply_uhash))],
                    ['Max validators', formatInt(st.data()!.params.max_validators)],
                    ['Unbonding time', formatDuration(st.data()!.params.unbonding_time_seconds)],
                    ['Min commission', decToPct(st.data()!.params.min_commission_rate)],
                    st.data()!.slashing?.signed_blocks_window ? ['Signed blocks window', formatInt(st.data()!.slashing!.signed_blocks_window)] : null,
                    st.data()!.slashing?.min_signed_per_window ? ['Min signed per window', decToPct(st.data()!.slashing!.min_signed_per_window)] : null,
                    st.data()!.slashing?.slash_fraction_downtime ? ['Downtime slash', decToPct(st.data()!.slashing!.slash_fraction_downtime, 2)] : null,
                    st.data()!.slashing?.slash_fraction_double_sign ? ['Double-sign slash', decToPct(st.data()!.slashing!.slash_fraction_double_sign)] : null,
                    st.data()!.slashing?.downtime_jail_duration_seconds ? ['Downtime jail', formatDuration(st.data()!.slashing!.downtime_jail_duration_seconds)] : null,
                  ]}
                />
              </Show>
            </Card>
          </div>

          <Show when={items().length} fallback={<Empty title="No validators indexed yet" />}>
            <div class="card overflow-x-auto">
              <Table>
                <thead>
                  <tr>
                    <Th num>#</Th>
                    <Th>Validator</Th>
                    <Th>Status</Th>
                    <Th num>Voting power</Th>
                    <Th class="min-w-[8rem]">Share</Th>
                    <Th class="min-w-[9rem]">Last 120 blocks</Th>
                    <Th num>Uptime</Th>
                    <Th num>Missed</Th>
                    <Th num>Proposed</Th>
                    <Th num>Commission</Th>
                    <Th num>Self-delegation</Th>
                    <Th num>Delegators</Th>
                  </tr>
                </thead>
                <tbody>
                  <For each={items()}>
                    {(v, i) => (
                      <tr>
                        <td class="num text-ink-500">{v.rank ?? i() + 1}</td>
                        <td>
                          <div class="flex items-center gap-2">
                            <span class="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-ink-800 bg-ink-900 text-ink-500" aria-hidden="true"><ShieldCheck class="size-3.5" /></span>
                            <div>
                              <A href={`/validators/${v.operator}`} class="font-medium hover:underline">{v.moniker || v.operator}</A>
                              <div class="font-mono text-xs text-ink-500">{v.operator.slice(0, 18)}…{v.operator.slice(-6)}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <Show when={v.jailed} fallback={<Badge variant={v.status === 'BOND_STATUS_BONDED' ? 'solid' : 'muted'}>{v.status.replace('BOND_STATUS_', '').toLowerCase()}</Badge>}>
                            <Badge><Gavel class="size-3" aria-hidden="true" /> jailed</Badge>
                          </Show>
                        </td>
                        <td class="num"><Amount uhash={v.tokens_uhash} unit={false} maxFraction={0} bold /></td>
                        <td>
                          <div class="flex items-center gap-2">
                            <ShareBar pct={v.voting_power_pct} label={`${v.moniker} voting power`} class="w-20" />
                            <span class="font-mono text-xs tabular">{v.voting_power_pct.toFixed(2)} %</span>
                          </div>
                        </td>
                        <td>
                          <Show when={v.signing_recent?.length} fallback={<span class="text-xs text-ink-500">—</span>}>
                            <SignStrip items={v.signing_recent!.map((s, k) => ({ height: k, signed: s }))} label={`${v.moniker} last ${v.signing_recent!.length} blocks`} />
                          </Show>
                        </td>
                        <td class="num">{formatPct(v.uptime_pct)}</td>
                        <td class="num">{formatInt(v.missed_blocks)}</td>
                        <td class="num">{formatInt(proposed(v))}</td>
                        <td class="num">{decToPct(v.commission_rate)}</td>
                        <td class="num text-ink-500"><Amount uhash={v.self_delegation_uhash} unit={false} maxFraction={0} /></td>
                        <td class="num"><span class="inline-flex items-center gap-1"><Users class="size-3 text-ink-500" aria-hidden="true" /> {formatInt(v.delegator_count)}</span></td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </Table>
            </div>
          </Show>
          <div class="mt-6 grid gap-4 lg:grid-cols-2">
            <Note title="Why ⅔ matters.">
              CometBFT finalises a block only when validators holding more than two thirds of bonded voting power sign it. Today {bonded().length} validator{bonded().length === 1 ? ' is' : 's are'} active and the {twoThirds()} largest already hold more than ⅔ of power — the chain stays live as long as at least that much power is online, regardless of what happens to any single machine, including the one that produced genesis. Conversely, {nakamoto()} validator{nakamoto() === 1 ? '' : 's'} holding more than ⅓ could halt it; more independent validators make both numbers healthier.
            </Note>
            <Note title="How to read the strip.">
              <span class="inline-flex items-center gap-1"><Timer class="size-3.5" aria-hidden="true" /> Each cell is one of the last 120 blocks — filled means the validator's signature is in the commit, empty means it was missing. Uptime is measured over a window of {formatInt(q.data()!.signed_blocks_window)} blocks; a validator that misses too many within the window is jailed and slashed. Head: {store.head ? formatInt(store.head.height) : '—'}.</span>
            </Note>
          </div>
        </Show>
      </Show>
    </div>
  );
}
