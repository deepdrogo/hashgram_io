import { For, Show, createMemo, onMount } from 'solid-js';
import { A } from '@solidjs/router';
import { Boxes, ArrowLeftRight, Wallet, ShieldCheck, Coins, Vote, Network as NetworkIcon, Landmark, Lock, Radio, Timer } from 'lucide-solid';
import { useLive } from '../lib/live';
import { useQuery, setTitle } from '../lib/query';
import type { StatsSnapshot, TopAccount, Proposal, GovParams } from '../lib/api';
import { formatHash, formatInt, formatMs, ratioPct, formatPct, toBigInt } from '../lib/format';
import { Stat, Card, Badge } from '../components/ui';
import { SearchBox } from '../components/Search';
import { Sparkline, LineChart, ShareBar, TallyBar } from '../components/charts';
import { Amount, TimeAgo, Hash, HeightLink, TxLink, Success } from '../components/values';
import { LogoMark } from '../components/Logo';

export default function Home() {
  const { store } = useLive();
  const history = useQuery<{ items: StatsSnapshot[] }>('/stats/history?hours=24', { refreshMs: 60_000 });
  const top = useQuery<{ items: TopAccount[]; total_supply_uhash: string }>('/accounts/top?limit=100', { refreshMs: 120_000 });
  const gov = useQuery<{ items: Proposal[]; params: GovParams }>('/gov/proposals', { refreshMs: 60_000 });
  onMount(() => setTitle());

  const head = () => store.head;
  const items = () => history.data()?.items ?? [];
  const series = (pick: (s: StatsSnapshot) => number | null | undefined) => createMemo(() => items().map(pick));

  const sTxs = series((s) => s.total_txs);
  const sAccounts = series((s) => s.total_accounts);
  const sBonded = series((s) => (s.bonded_uhash ? Number(BigInt(s.bonded_uhash) / 1_000_000n) : null));
  const sValidators = series((s) => s.validators);
  const sCons = series((s) => s.consensus_peers);
  const sP2p = series((s) => s.p2p_peers);
  const sProviders = series((s) => s.providers);
  const sBlockTime = series((s) => s.block_time_ms);
  const sFounder = series((s) => (s.founder_accrued_uhash ? Number(BigInt(s.founder_accrued_uhash)) / 1e6 : null));
  const sCirc = series((s) => (s.circulating_uhash ? Number(BigInt(s.circulating_uhash) / 1_000_000n) : null));

  const bondedRatio = () => (head() ? ratioPct(head()!.bonded_uhash, head()!.total_supply_uhash) : 0);

  // 24 h charts
  const blockTimeSeries = createMemo(() => [{ name: 'Block time (s)', points: items().filter((s) => s.block_time_ms).map((s) => ({ x: Date.parse(s.time), y: (s.block_time_ms ?? 0) / 1000 })) }]);
  const txRateSeries = createMemo(() => {
    const pts: Array<{ x: number; y: number }> = [];
    const it = items();
    for (let i = 1; i < it.length; i++) {
      const dt = (Date.parse(it[i]!.time) - Date.parse(it[i - 1]!.time)) / 3_600_000;
      const dtx = (it[i]!.total_txs ?? 0) - (it[i - 1]!.total_txs ?? 0);
      if (dt > 0) pts.push({ x: Date.parse(it[i]!.time), y: Math.max(0, dtx / dt) });
    }
    return [{ name: 'Transactions per hour', points: pts, area: true }];
  });
  const heightSeries = createMemo(() => [{ name: 'Height', points: items().map((s) => ({ x: Date.parse(s.time), y: s.height })) }]);

  // Supply distribution from labelled accounts
  const supply = createMemo(() => {
    const t = top.data();
    if (!t) return null;
    const total = toBigInt(t.total_supply_uhash);
    const sum = (pred: (a: TopAccount) => boolean) => t.items.filter(pred).reduce((acc, a) => acc + toBigInt(a.balance_uhash), 0n);
    const reserve = sum((a) => a.label === 'Useful-service reserve');
    const treasury = sum((a) => ['Treasury', 'Growth', 'Developer grants', 'Liquidity'].includes(a.label ?? ''));
    const founder = sum((a) => a.label === 'Founder (vesting)');
    const bonded = toBigInt(head()?.bonded_uhash ?? '0');
    const welcome = sum((a) => a.label === 'Welcome rewards pool');
    const otherModules = sum((a) => a.kind === 'module' && !['Useful-service reserve', 'Treasury', 'Growth', 'Developer grants', 'Liquidity', 'Welcome rewards pool'].includes(a.label ?? '') && !(a.label ?? '').includes('staking pool'));
    const known = reserve + treasury + founder + bonded + welcome + otherModules;
    const rest = total > known ? total - known : 0n;
    const seg = (label: string, v: bigint, icon: 'reserve' | 'treasury' | 'founder' | 'bonded' | 'welcome' | 'other' | 'free') => ({ label, v, pct: total > 0n ? Number((v * 10_000n) / total) / 100 : 0, icon });
    return {
      total,
      segments: [
        seg('Useful-service reserve', reserve, 'reserve'),
        seg('Treasury reserves', treasury, 'treasury'),
        seg('Founder (vesting)', founder, 'founder'),
        seg('Bonded (staked)', bonded, 'bonded'),
        seg('Welcome pool', welcome, 'welcome'),
        seg('Other module accounts', otherModules, 'other'),
        seg('Free balances', rest, 'free'),
      ].filter((s) => s.v > 0n),
    };
  });
  const fills = ['#ffffff', '#808080', 'url(#hatch-home)', '#404040', '#262626', '#1a1a1a', 'url(#dots-home)'];

  const activeProposal = createMemo(() => (gov.data()?.items ?? []).slice().sort((a, b) => b.id - a.id).find((p) => p.status === 'PROPOSAL_STATUS_VOTING_PERIOD') ?? (gov.data()?.items ?? []).slice().sort((a, b) => b.id - a.id)[0]);
  const epochPct = () => {
    const e = head()?.epoch;
    if (!e || e.end_height <= e.start_height) return 0;
    return ((e.end_height - e.start_height - e.blocks_left) / (e.end_height - e.start_height)) * 100;
  };

  return (
    <div>
      <section class="mb-10 grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-end">
        <div>
          <div class="mb-4 flex items-center gap-3">
            <LogoMark size={40} />
            <span class="text-4xl font-bold tracking-tight sm:text-5xl">hashgram</span>
          </div>
          <p class="max-w-2xl text-lg text-ink-500">
            One identity, inbox and vault on a network nobody centrally controls. Hashgram One brings private mail, encrypted storage, people, feeds and shared spaces to a fixed-supply Layer-1.
          </p>
          <div class="mt-5 flex flex-wrap gap-2">
            <A href="/one" class="btn btn-primary">Explore Hashgram One</A>
            <A href="/docs/what-is-hashgram" class="btn">How it works</A>
          </div>
          <div class="mt-6">
            <SearchBox large />
          </div>
          <div class="mt-3 flex flex-wrap gap-2 text-xs text-ink-500">
            <span>Try:</span>
            <A href="/blocks/1" class="font-mono underline decoration-ink-700 hover:decoration-white">block 1</A>
            <A href="/accounts/hash13t8v5nnghrvgcuuqcrt9k5wyhtqwq7fl3ynjpy" class="font-mono underline decoration-ink-700 hover:decoration-white">founder account</A>
            <A href="/governance/1" class="font-mono underline decoration-ink-700 hover:decoration-white">proposal #1</A>
            <A href="/docs/short-links" class="underline decoration-ink-700 hover:decoration-white">short links for apps</A>
          </div>
        </div>
        <div class="card p-5">
          <div class="flex items-baseline justify-between">
            <span class="text-xs font-medium uppercase tracking-wide text-ink-500">Height</span>
            <Show when={head()}>
              <span class="text-xs text-ink-500">
                last block <TimeAgo iso={head()!.latest_block_time} />
              </span>
            </Show>
          </div>
          <div class="mt-1 font-mono text-4xl font-semibold tabular tracking-tight sm:text-5xl" aria-live="polite" aria-atomic="true">
            <Show when={head()} fallback={<span class="skeleton inline-block h-12 w-56" />}>
              <A href={`/blocks/${head()!.height}`} class="animate-tick hover:underline">
                {formatInt(head()!.height)}
              </A>
            </Show>
          </div>
          <dl class="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
            <div>
              <dt class="text-ink-500">Chain</dt>
              <dd class="font-mono">{head()?.chain_id ?? '—'}</dd>
            </div>
            <div>
              <dt class="text-ink-500">Block time</dt>
              <dd class="font-mono tabular">{formatMs(head()?.avg_block_time_ms)}</dd>
            </div>
            <div>
              <dt class="text-ink-500">Genesis</dt>
              <dd>
                <Hash value={head()?.genesis_hash} head={6} tail={4} copy={false} />
              </dd>
            </div>
            <div>
              <dt class="text-ink-500">Latest hash</dt>
              <dd>
                <Hash value={head()?.latest_block_hash} head={6} tail={4} copy={false} />
              </dd>
            </div>
            <div>
              <dt class="text-ink-500">Node</dt>
              <dd class="font-mono">CometBFT {head()?.cometbft_version ?? '—'}</dd>
            </div>
            <div>
              <dt class="text-ink-500">Indexed</dt>
              <dd class="font-mono tabular">{head() ? (head()!.height - head()!.indexed_height <= 1 ? '✓ at head' : `${formatInt(head()!.height - head()!.indexed_height)} behind`) : '—'}</dd>
            </div>
          </dl>
          <Show when={head()?.epoch}>
            <div class="mt-4 border-t border-ink-900 pt-3">
              <div class="mb-1 flex items-center justify-between text-xs">
                <span class="inline-flex items-center gap-1.5 text-ink-500"><Timer class="size-3.5" aria-hidden="true" /> Epoch #{formatInt(head()!.epoch!.number)}</span>
                <span class="font-mono tabular text-ink-500">{formatInt(head()!.epoch!.blocks_left)} blocks left</span>
              </div>
              <ShareBar pct={epochPct()} label="Epoch progress" />
            </div>
          </Show>
        </div>
      </section>

      <section class="card mb-10 grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center" aria-label="Hashgram One">
        <div>
          <div class="mb-2 flex flex-wrap gap-2">
            <Badge variant="solid">Hashgram One</Badge>
            <Badge variant="muted">Mail</Badge>
            <Badge variant="muted">Drive</Badge>
            <Badge variant="muted">Spaces</Badge>
          </div>
          <h2 class="text-xl font-semibold tracking-tight">The chain is infrastructure. Hashgram One is the product.</h2>
          <p class="mt-2 max-w-3xl text-sm leading-relaxed text-ink-500">
            Private application payloads travel inside MLS ciphertext; nodes store and relay what they cannot read. The chain holds only global facts such as identities, usernames, balances and provider records.
          </p>
          <p class="mt-2 text-xs text-ink-500">Protocol, SDK and reference CLI implemented. Complete desktop UI is not released yet.</p>
        </div>
        <A href="/one" class="btn">Product overview →</A>
      </section>

      <section class="mb-10 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Key statistics">
        <Stat label="Supply" value={<Amount uhash={head()?.total_supply_uhash} compact />} hint="Fixed — there is no mint module" href="/accounts" />
        <Stat label="Circulating" value={<Amount uhash={head()?.circulating_uhash} compact />} hint="Supply minus module accounts and unvested founder balance" spark={<Sparkline values={sCirc()} label="circulating 24 h" />} href="/accounts" />
        <Stat label="Bonded" value={formatPct(bondedRatio())} hint={<Amount uhash={head()?.bonded_uhash} compact />} spark={<Sparkline values={sBonded()} label="bonded 24 h" />} href="/validators" />
        <Stat label="Validators" value={formatInt(head()?.validators.active)} hint={head() ? `${head()!.validators.total} known · max ${head()!.validators.max}` : undefined} spark={<Sparkline values={sValidators()} label="validators 24 h" />} href="/validators" />
        <Stat label="Consensus peers" value={formatInt(head()?.consensus_peers)} hint="CometBFT connections of this node" spark={<Sparkline values={sCons()} label="consensus peers 24 h" />} href="/network" />
        <Stat label="P2P peers" value={formatInt(head()?.p2p_peers)} hint="libp2p peers of this node" spark={<Sparkline values={sP2p()} label="p2p peers 24 h" />} href="/network" />
        <Stat label="Providers" value={formatInt(head()?.providers)} hint="Registered useful-service providers" spark={<Sparkline values={sProviders()} label="providers 24 h" />} href="/rewards" />
        <Stat label="Transactions" value={formatInt(head()?.total_txs)} spark={<Sparkline values={sTxs()} label="transactions 24 h" />} href="/txs" live />
        <Stat label="Accounts" value={formatInt(head()?.total_accounts)} spark={<Sparkline values={sAccounts()} label="accounts 24 h" />} href="/accounts" />
        <Stat label="Block time" value={formatMs(head()?.avg_block_time_ms)} hint="Average of the last 100 blocks" spark={<Sparkline values={sBlockTime()} label="block time 24 h" />} href="/blocks" />
        <Stat
          label="Current epoch"
          value={head()?.epoch ? `#${formatInt(head()!.epoch!.number)}` : '—'}
          hint={head()?.epoch ? `budget ${formatHash(head()!.epoch!.budget_uhash, { unit: true, maxFraction: 0 })} · cap ${formatHash(head()!.epoch!.provider_cap_uhash, { maxFraction: 0 })} per provider` : undefined}
          href="/rewards"
        />
        <Stat label="Founder revenue accrued" value={<Amount uhash={head()?.founder_accrued_uhash} maxFraction={6} />} hint="1 % of protocol fees, live" spark={<Sparkline values={sFounder()} label="founder revenue 24 h" />} href="/founder" />
      </section>

      <section class="mb-10 grid gap-4 lg:grid-cols-3" aria-label="Last 24 hours">
        <Card title="Block time · 24 h" action={<span class="text-xs text-ink-500">5-minute samples</span>}>
          <Show when={items().length > 2} fallback={<p class="py-8 text-center text-sm text-ink-500">Collecting samples — the first appear after a few minutes.</p>}>
            <LineChart series={blockTimeSeries()} xTime height={180} ariaLabel="Block time over the last 24 hours" yFormat={(v) => `${v.toFixed(1)}s`} xFormat={(v) => new Date(v).toISOString().slice(11, 16)} />
          </Show>
        </Card>
        <Card title="Transactions per hour · 24 h">
          <Show when={items().length > 2} fallback={<p class="py-8 text-center text-sm text-ink-500">Collecting samples.</p>}>
            <LineChart series={txRateSeries()} xTime height={180} ariaLabel="Transactions per hour over the last 24 hours" yFormat={(v) => v.toFixed(0)} xFormat={(v) => new Date(v).toISOString().slice(11, 16)} />
          </Show>
        </Card>
        <Card title="Height · 24 h">
          <Show when={items().length > 2} fallback={<p class="py-8 text-center text-sm text-ink-500">Collecting samples.</p>}>
            <LineChart series={heightSeries()} xTime height={180} ariaLabel="Chain height over the last 24 hours" yFormat={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0))} xFormat={(v) => new Date(v).toISOString().slice(11, 16)} />
          </Show>
        </Card>
      </section>

      <section class="mb-10 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]" aria-label="Supply and governance">
        <Card title="Where the 1,000,000,000 HASH are" action={<A href="/accounts" class="text-xs text-ink-500 hover:text-white">All accounts →</A>}>
          <Show when={supply()} fallback={<div class="skeleton h-24" />}>
            <svg viewBox="0 0 100 10" width="100%" height="14" preserveAspectRatio="none" class="block overflow-visible rounded-sm" role="img" aria-label="Supply distribution">
              <defs>
                <pattern id="hatch-home" width="2" height="2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <line x1="0" y1="0" x2="0" y2="2" stroke="#ffffff" stroke-width="0.7" />
                </pattern>
                <pattern id="dots-home" width="2" height="2" patternUnits="userSpaceOnUse">
                  <circle cx="1" cy="1" r="0.45" fill="#808080" />
                </pattern>
              </defs>
              <rect width="100" height="10" fill="#1a1a1a" />
              <For each={supply()!.segments}>
                {(s, i) => {
                  const x = supply()!.segments.slice(0, i()).reduce((a, q) => a + q.pct, 0);
                  return <rect x={x} y="0" width={s.pct} height="10" fill={fills[i() % fills.length]} />;
                }}
              </For>
            </svg>
            <ul class="mt-4 grid gap-2 sm:grid-cols-2">
              <For each={supply()!.segments}>
                {(s, i) => (
                  <li class="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-sm">
                    <span class="inline-flex min-w-0 items-center gap-2">
                      <svg width="12" height="12" aria-hidden="true" class="shrink-0 rounded-sm">
                        <rect width="12" height="12" fill={fills[i() % fills.length]} />
                      </svg>
                      <span class="shrink-0 text-ink-500">
                        {s.icon === 'reserve' ? <Coins class="size-3.5" aria-hidden="true" /> : s.icon === 'treasury' ? <Landmark class="size-3.5" aria-hidden="true" /> : s.icon === 'founder' ? <Lock class="size-3.5" aria-hidden="true" /> : s.icon === 'bonded' ? <ShieldCheck class="size-3.5" aria-hidden="true" /> : <Wallet class="size-3.5" aria-hidden="true" />}
                      </span>
                      <span class="truncate">{s.label}</span>
                    </span>
                    <span class="ml-auto font-mono text-xs tabular">
                      <Amount uhash={s.v} unit={false} maxFraction={0} /> <span class="text-ink-500">· {s.pct.toFixed(2)} %</span>
                    </span>
                  </li>
                )}
              </For>
            </ul>
            <p class="mt-3 text-xs text-ink-500">Module accounts belong to the protocol, not to people. Bonded HASH is delegated stake counted separately from the accounts that own it. Nothing is ever minted.</p>
          </Show>
        </Card>

        <div class="space-y-4">
          <Card title="Governance" action={<A href="/governance" class="text-xs text-ink-500 hover:text-white">All proposals →</A>}>
            <Show when={activeProposal()} fallback={<p class="py-6 text-center text-sm text-ink-500">No proposals yet.</p>}>
              {(p) => (
                <div>
                  <div class="mb-1 flex items-center gap-2 text-xs text-ink-500">
                    <Vote class="size-3.5" aria-hidden="true" /> #{p().id} <Badge variant={p().status === 'PROPOSAL_STATUS_VOTING_PERIOD' ? 'solid' : 'muted'}>{p().status.replace('PROPOSAL_STATUS_', '').replace(/_/g, ' ').toLowerCase()}</Badge>
                    <Show when={p().voting_end_time}><span class="ml-auto">ends <TimeAgo iso={p().voting_end_time} /></span></Show>
                  </div>
                  <A href={`/governance/${p().id}`} class="font-semibold hover:underline">{p().title}</A>
                  <div class="mt-3">
                    <TallyBar yes={p().tally.yes_pct ?? 0} no={p().tally.no_pct ?? 0} veto={p().tally.no_with_veto_pct ?? 0} abstain={p().tally.abstain_pct ?? 0} quorumPct={Number(gov.data()?.params.quorum ?? '0.4') * 100} />
                  </div>
                  <p class="mt-2 text-xs text-ink-500">turnout {(p().tally.turnout_pct ?? 0).toFixed(1)} % {p().tally.quorum_reached ? '· ✓ quorum' : '· quorum not reached'}</p>
                </div>
              )}
            </Show>
          </Card>
          <Card title="This node" action={<A href="/network" class="text-xs text-ink-500 hover:text-white">Network →</A>}>
            <ul class="grid grid-cols-3 gap-2 text-center">
              <li class="rounded-md border border-ink-900 p-3">
                <Radio class="mx-auto size-4 text-ink-500" aria-hidden="true" />
                <div class="mt-1 text-lg font-semibold tabular">{formatInt(head()?.consensus_peers)}</div>
                <div class="text-[11px] text-ink-500">consensus peers</div>
              </li>
              <li class="rounded-md border border-ink-900 p-3">
                <NetworkIcon class="mx-auto size-4 text-ink-500" aria-hidden="true" />
                <div class="mt-1 text-lg font-semibold tabular">{formatInt(head()?.p2p_peers)}</div>
                <div class="text-[11px] text-ink-500">P2P peers</div>
              </li>
              <li class="rounded-md border border-ink-900 p-3">
                <ShieldCheck class="mx-auto size-4 text-ink-500" aria-hidden="true" />
                <div class="mt-1 text-lg font-semibold tabular">{formatInt(head()?.validators.active)}</div>
                <div class="text-[11px] text-ink-500">validators</div>
              </li>
            </ul>
            <p class="mt-3 text-xs text-ink-500">Three layers, three numbers — never added together. This site reads only from its own full node.</p>
          </Card>
        </div>
      </section>

      <section class="grid gap-4 lg:grid-cols-2" aria-label="Live activity">
        <Card
          title="Latest blocks"
          action={
            <A href="/blocks" class="inline-flex items-center gap-1 text-xs text-ink-500 hover:text-white">
              <Boxes class="size-3.5" aria-hidden="true" /> All blocks →
            </A>
          }
        >
          <ol class="divide-y divide-ink-900" aria-live="polite" aria-relevant="additions" aria-label="Latest blocks">
            <For each={store.blocks.slice(0, 10)}>
              {(b) => (
                <li class="animate-slide-in grid grid-cols-[6.5rem_1fr_auto] items-center gap-3 py-2 text-sm">
                  <HeightLink height={b.height} class="font-semibold" />
                  <div class="min-w-0 truncate">
                    <A href={`/validators/${b.proposer.operator}`} class="hover:underline">
                      {b.proposer.moniker || b.proposer.operator}
                    </A>
                    <span class="ml-2 text-xs text-ink-500 tabular">
                      {b.tx_count} tx · {b.signatures.present}/{b.signatures.total} sigs · {b.size_bytes} B
                    </span>
                  </div>
                  <TimeAgo iso={b.time} class="text-xs text-ink-500" />
                </li>
              )}
            </For>
            <Show when={store.blocks.length === 0}>
              <li class="py-6 text-center text-sm text-ink-500">Waiting for blocks…</li>
            </Show>
          </ol>
        </Card>
        <Card
          title="Latest transactions"
          action={
            <A href="/txs" class="inline-flex items-center gap-1 text-xs text-ink-500 hover:text-white">
              <ArrowLeftRight class="size-3.5" aria-hidden="true" /> All transactions →
            </A>
          }
        >
          <ol class="divide-y divide-ink-900" aria-live="polite" aria-relevant="additions" aria-label="Latest transactions">
            <For each={store.txs.slice(0, 10)}>
              {(t) => (
                <li class="animate-slide-in grid grid-cols-[auto_1fr_auto] items-center gap-3 py-2 text-sm">
                  <Success ok={t.success} />
                  <div class="min-w-0">
                    <div class="flex items-center gap-2">
                      <TxLink hash={t.hash} head={8} tail={6} />
                      <span class="badge">{t.type}</span>
                    </div>
                    <div class="truncate text-xs text-ink-500">{t.summary ?? `${t.msg_count} message${t.msg_count === 1 ? '' : 's'}`}</div>
                  </div>
                  <div class="text-right text-xs text-ink-500">
                    <HeightLink height={t.height} />
                    <div>
                      <TimeAgo iso={t.time} />
                    </div>
                  </div>
                </li>
              )}
            </For>
            <Show when={store.txs.length === 0}>
              <li class="py-6 text-center text-sm text-ink-500">No transactions yet in the recent window.</li>
            </Show>
          </ol>
        </Card>
      </section>
    </div>
  );
}
