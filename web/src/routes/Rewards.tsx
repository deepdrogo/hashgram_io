import { For, Show, createMemo, createSignal, onMount } from 'solid-js';
import { A } from '@solidjs/router';
import { HardDrive, Radio, Download, Phone, Coins, Timer, ShieldAlert, Gift, Info } from 'lucide-solid';
import { useQuery, usePaged, setTitle } from '../lib/query';
import type { RewardParams, RewardReserve, Epoch, CurrentEpoch, Provider, Welcome } from '../lib/api';
import { formatInt, formatHash, toBigInt, formatBytes, ratioPct } from '../lib/format';
import { PageHeader, Card, KV, Skeleton, ErrorState, Th, Empty, Badge, Note, Tabs, Table } from '../components/ui';
import { Amount, Address, TimeAgo, HeightLink } from '../components/values';
import { LineChart, ShareBar } from '../components/charts';

/** budget(e) = min(remaining_e × emission_bps / 10,000, cap); remaining_{e+1} = remaining_e − budget(e). */
export function projectEmission(remaining: bigint, emissionBps: number, cap: bigint, epochs: number, step = 1): Array<{ epoch: number; budget: bigint; remaining: bigint }> {
  const out: Array<{ epoch: number; budget: bigint; remaining: bigint }> = [];
  let r = remaining;
  for (let e = 0; e < epochs; e++) {
    let b = (r * BigInt(emissionBps)) / 10_000n;
    if (b > cap) b = cap;
    if (b > r) b = r;
    if (e % step === 0) out.push({ epoch: e, budget: b, remaining: r });
    r -= b;
  }
  return out;
}

export default function Rewards() {
  const params = useQuery<RewardParams>('/rewards/params');
  const reserve = useQuery<RewardReserve>('/rewards/reserve', { refreshMs: 30_000 });
  const epochs = useQuery<{ items: Epoch[]; current: CurrentEpoch; next_cursor?: string | null }>('/rewards/epochs?limit=30', { refreshMs: 30_000 });
  const providers = usePaged<Provider>(() => '/rewards/providers', () => ({}), 50);
  const welcome = useQuery<Welcome>('/rewards/welcome');
  const [horizon, setHorizon] = createSignal<'1y' | '5y' | '10y'>('10y');
  onMount(() => setTitle('Rewards — how nodes earn'));

  const projection = createMemo(() => {
    const p = params.data();
    const r = reserve.data();
    if (!p || !r) return null;
    const years = horizon() === '1y' ? 1 : horizon() === '5y' ? 5 : 10;
    const n = 365 * years;
    const step = Math.max(1, Math.floor(n / 240));
    const pts = projectEmission(toBigInt(r.remaining_uhash), p.emission_bps, toBigInt(p.epoch_cap_uhash), n, step);
    const cur = epochs.data()?.current.number ?? 0;
    return {
      budget: [{ name: 'Budget per epoch (HASH)', points: pts.map((x) => ({ x: cur + x.epoch, y: Number(x.budget / 1_000_000n) })), width: 1.75 }],
      remaining: [{ name: 'Reserve remaining (HASH)', points: pts.map((x) => ({ x: cur + x.epoch, y: Number(x.remaining / 1_000_000n) })), dash: '4 3', area: true }],
    };
  });

  const cur = () => epochs.data()?.current;
  const paidPct = () => (reserve.data() ? ratioPct(reserve.data()!.paid_total_uhash, reserve.data()!.initial_uhash) : 0);
  const epochPct = () => {
    const c = cur();
    if (!c || c.end_height <= c.start_height) return 0;
    return ((c.end_height - c.start_height - c.blocks_left) / (c.end_height - c.start_height)) * 100;
  };
  const totalPaidProviders = createMemo(() => providers.items().reduce((a, p) => a + toBigInt(p.lifetime_paid_uhash), 0n));

  return (
    <div>
      <PageHeader
        title="How nodes earn"
        lead="There is no mining on Hashgram. Rewards come from a fixed useful-service reserve and are paid, epoch by epoch, to providers for real bytes stored, relayed and served. The epoch budget is a ceiling, not a guarantee: what is not earned stays in the reserve."
      />

      <Show when={!reserve.error() && !params.error()} fallback={<ErrorState error={reserve.error() ?? params.error()} retry={() => { reserve.refetch(); params.refetch(); }} />}>
        {/* Reserve hero */}
        <section class="card mb-6 p-5">
          <div class="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <div class="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-500"><Coins class="size-3.5" aria-hidden="true" /> Useful-service reserve</div>
              <div class="mt-1 text-3xl font-semibold tabular tracking-tight sm:text-4xl"><Amount uhash={reserve.data()?.remaining_uhash} maxFraction={0} /></div>
              <div class="mt-1 text-sm text-ink-500">remaining of <Amount uhash={reserve.data()?.initial_uhash} maxFraction={0} /> at genesis · <Amount uhash={reserve.data()?.paid_total_uhash} maxFraction={2} /> paid so far ({paidPct().toFixed(4)} %)</div>
              <ShareBar class="mt-3" pct={paidPct()} label="Share of the reserve paid out" />
              <div class="mt-1 flex justify-between text-[11px] text-ink-500"><span>paid</span><span>remaining</span></div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="rounded-md border border-ink-900 p-3">
                <div class="text-[11px] uppercase tracking-wide text-ink-500">This epoch's budget</div>
                <div class="mt-1 text-lg font-semibold tabular"><Amount uhash={cur()?.budget_uhash ?? reserve.data()?.current_budget_uhash} maxFraction={0} /></div>
                <div class="font-mono text-[11px] text-ink-500">min(remaining × {params.data()?.emission_bps ?? 5}⁄10,000, {params.data() ? formatHash(params.data()!.epoch_cap_uhash, { maxFraction: 0 }) : '250,000'})</div>
              </div>
              <div class="rounded-md border border-ink-900 p-3">
                <div class="text-[11px] uppercase tracking-wide text-ink-500">Cap per provider</div>
                <div class="mt-1 text-lg font-semibold tabular"><Amount uhash={cur()?.provider_cap_uhash ?? reserve.data()?.provider_cap_uhash} maxFraction={0} /></div>
                <div class="text-[11px] text-ink-500">{params.data() ? `${params.data()!.provider_cap_bps / 100} % of the budget` : ''}</div>
              </div>
              <div class="rounded-md border border-ink-900 p-3">
                <div class="text-[11px] uppercase tracking-wide text-ink-500">Epoch length</div>
                <div class="mt-1 text-lg font-semibold tabular">{params.data() ? formatInt(params.data()!.epoch_length_blocks) : '—'} <span class="text-sm font-normal text-ink-500">blocks</span></div>
                <div class="text-[11px] text-ink-500">≈ one day at 4 s blocks</div>
              </div>
              <div class="rounded-md border border-ink-900 p-3">
                <div class="text-[11px] uppercase tracking-wide text-ink-500">Provider bond</div>
                <div class="mt-1 text-lg font-semibold tabular"><Amount uhash={params.data()?.provider_bond_uhash} maxFraction={0} /></div>
                <div class="text-[11px] text-ink-500">{params.data() ? `fraud: ${params.data()!.fraud_slash_bps / 100} % slash + jail` : ''}</div>
              </div>
            </div>
          </div>
        </section>

        {/* What earns credit */}
        <section class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="What earns credit">
          <For
            each={[
              { icon: HardDrive, title: 'Storage', rate: params.data() ? `${formatInt(params.data()!.credit_rates.storage_per_gib_epoch)} credit / GiB · epoch` : '—', text: 'Keep encrypted objects available and pass random storage challenges.' },
              { icon: Radio, title: 'Relay', rate: params.data() ? `${formatInt(params.data()!.credit_rates.relay_per_gib)} credit / GiB` : '—', text: 'Forward messages and media between peers; clients sign receipts.' },
              { icon: Download, title: 'Retrieval', rate: params.data() ? `${formatInt(params.data()!.credit_rates.retrieval_per_gib)} credit / GiB` : '—', text: 'Serve stored bytes when asked; paid on retrieval receipts.' },
              { icon: Phone, title: 'Calls', rate: params.data() ? `${formatInt(params.data()!.credit_rates.calls_per_hour)} credit / hour` : '—', text: 'Relay audio and video for calls; TURN and SFU nodes.' },
            ]}
          >
            {(c) => (
              <div class="card p-4">
                <div class="flex items-center gap-2">
                  <span class="inline-flex size-8 items-center justify-center rounded-md border border-ink-800 bg-ink-900 text-ink-500"><c.icon class="size-4" aria-hidden="true" /></span>
                  <div>
                    <div class="text-sm font-semibold">{c.title}</div>
                    <div class="font-mono text-[11px] text-ink-500">{c.rate}</div>
                  </div>
                </div>
                <p class="mt-3 text-xs text-ink-500">{c.text}</p>
              </div>
            )}
          </For>
        </section>

        <div class="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Card
            title="Emission schedule"
            action={
              <div role="group" aria-label="Projection horizon" class="flex gap-1">
                <For each={[['1y', '1 year'], ['5y', '5 years'], ['10y', '10 years']] as const}>
                  {([h, label]) => (
                    <button class={`btn h-7 px-2 text-xs ${horizon() === h ? 'btn-primary' : ''}`} aria-pressed={horizon() === h} onClick={() => setHorizon(h)}>
                      {label}
                    </button>
                  )}
                </For>
              </div>
            }
          >
            <Show when={projection()} fallback={<Skeleton rows={6} />}>
              <p class="mb-3 text-sm text-ink-500">
                Each epoch releases at most <span class="font-mono">min(remaining × {params.data()!.emission_bps}⁄10,000, {formatHash(params.data()!.epoch_cap_uhash, { maxFraction: 0 })})</span> HASH. Projected from the live reserve with exact integer math; unearned budget is never emitted, so the real curve can only be lower.
              </p>
              <LineChart series={projection()!.budget} height={220} ariaLabel="Projected epoch budget over time" yFormat={(v) => `${(v / 1000).toFixed(0)}k`} xFormat={(v) => `#${Math.round(v)}`} />
              <LineChart series={projection()!.remaining} height={160} ariaLabel="Projected reserve remaining over time" yFormat={(v) => `${(v / 1e6).toFixed(0)}M`} xFormat={(v) => `#${Math.round(v)}`} />
              <Show when={reserve.data()}>
                <dl class="mt-3 grid grid-cols-3 gap-3 text-xs">
                  <div class="rounded-md border border-ink-900 p-2"><dt class="text-ink-500">Next 30 epochs</dt><dd class="font-mono tabular"><Amount uhash={reserve.data()!.projections.epochs_30_uhash} maxFraction={0} /></dd></div>
                  <div class="rounded-md border border-ink-900 p-2"><dt class="text-ink-500">Next 365 epochs</dt><dd class="font-mono tabular"><Amount uhash={reserve.data()!.projections.epochs_365_uhash} maxFraction={0} /></dd></div>
                  <div class="rounded-md border border-ink-900 p-2"><dt class="text-ink-500">Next 3,650 epochs</dt><dd class="font-mono tabular"><Amount uhash={reserve.data()!.projections.epochs_3650_uhash} maxFraction={0} /></dd></div>
                </dl>
              </Show>
            </Show>
          </Card>

          <div class="space-y-4">
            <Card title="Current epoch" action={<Timer class="size-4 text-ink-500" aria-hidden="true" />}>
              <Show when={cur()} fallback={<Skeleton rows={5} />}>
                <div class="mb-3 flex items-baseline justify-between">
                  <span class="text-2xl font-semibold tabular">#{formatInt(cur()!.number)}</span>
                  <span class="text-xs text-ink-500">{epochPct().toFixed(1)} % elapsed</span>
                </div>
                <ShareBar pct={epochPct()} label="Epoch progress" />
                <KV
                  class="mt-4"
                  items={[
                    ['Blocks', <span><HeightLink height={cur()!.start_height} /> → <HeightLink height={cur()!.end_height} /></span>],
                    ['Blocks left', formatInt(cur()!.blocks_left)],
                    cur()!.estimated_end_time ? ['Ends', <TimeAgo iso={cur()!.estimated_end_time} />] : null,
                    ['Budget', <Amount uhash={cur()!.budget_uhash} maxFraction={0} />],
                    ['Provider cap', <Amount uhash={cur()!.provider_cap_uhash} maxFraction={0} />],
                    ['Active providers', formatInt(cur()!.providers_active)],
                  ]}
                />
              </Show>
            </Card>
            <Card title="How payment works" action={<Info class="size-4 text-ink-500" aria-hidden="true" />}>
              <ol class="space-y-2 text-sm text-ink-500">
                <li class="flex gap-2"><span class="font-mono text-white">1</span> Providers bond {params.data() ? formatHash(params.data()!.provider_bond_uhash, { maxFraction: 0 }) : '1,000'} HASH and declare their roles and storage.</li>
                <li class="flex gap-2"><span class="font-mono text-white">2</span> Clients sign receipts for bytes served; the chain issues random storage challenges.</li>
                <li class="flex gap-2"><span class="font-mono text-white">3</span> Credit accumulates per epoch; at epoch close the budget is split by credit, capped per provider.</li>
                <li class="flex gap-2"><span class="font-mono text-white">4</span> Payouts are plain transfers from the reserve account — every one is visible below.</li>
              </ol>
            </Card>
          </div>
        </div>
      </Show>

      <ProvidersAndEpochs providers={providers} epochs={epochs} totalPaid={totalPaidProviders()} />

      <Card title="Welcome rewards" class="mt-6" action={<Gift class="size-4 text-ink-500" aria-hidden="true" />}>
        <Show when={!welcome.error()} fallback={<ErrorState error={welcome.error()} compact />}>
          <Show when={welcome.data()} fallback={<Skeleton rows={3} />}>
            <div class="mb-3 flex items-center gap-2">
              <Badge variant={welcome.data()!.enabled ? 'solid' : 'default'}>{welcome.data()!.enabled ? '✓ enabled' : '✗ currently disabled'}</Badge>
              <span class="text-sm text-ink-500">{welcome.data()!.reason || (welcome.data()!.enabled ? '' : 'no attestor registered')}</span>
            </div>
            <p class="mb-3 text-sm text-ink-500">Small one-time grants for new accounts, paid from a separate pool once an attestor confirms the account is genuine. Until an attestor is registered by governance nobody can claim, and the site says so rather than guessing.</p>
            <Show when={welcome.data()!.tiers.length} fallback={<p class="text-sm text-ink-500">No tiers defined.</p>}>
              <div class="overflow-x-auto">
                <Table>
                  <thead><tr><For each={Object.keys(welcome.data()!.tiers[0] ?? {})}>{(k) => <Th>{k.replace(/_/g, ' ')}</Th>}</For></tr></thead>
                  <tbody>
                    <For each={welcome.data()!.tiers}>
                      {(t) => (
                        <tr>
                          <For each={Object.values(t)}>{(v) => <td class="font-mono text-xs">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</td>}</For>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </Table>
              </div>
            </Show>
            <p class="mt-3 text-xs text-ink-500">Claims so far: {formatInt(welcome.data()!.claims_total ?? welcome.data()!.claims.length)}.</p>
          </Show>
        </Show>
      </Card>

      <Note class="mt-6" title="No mining.">
        <span class="inline-flex items-start gap-2"><ShieldAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span>Hashgram has no proof-of-work and no block subsidy. The 500,000,000 HASH reserve is the only source of service rewards, its release is capped per epoch, and every payout is a transfer from the <A href="/accounts" class="underline">serviceproof module account</A> that you can audit here. Earnings require real traffic: a provider with no bytes to store or serve earns nothing.</span></span>
      </Note>
    </div>
  );
}

function ProvidersAndEpochs(props: { providers: ReturnType<typeof usePaged<Provider>>; epochs: ReturnType<typeof useQuery<{ items: Epoch[]; current: CurrentEpoch }>>; totalPaid: bigint }) {
  const [tab, setTab] = createSignal<'providers' | 'epochs'>('providers');
  return (
    <Card>
      <Tabs tabs={[{ id: 'providers', label: 'Providers', count: props.providers.items().length || undefined }, { id: 'epochs', label: 'Past epochs', count: props.epochs.data()?.items.length || undefined }]} value={tab()} onChange={setTab} />
      <Show when={tab() === 'providers'}>
        <Show when={!props.providers.error()} fallback={<ErrorState error={props.providers.error()} retry={props.providers.refetch} compact />}>
          <Show when={!props.providers.loading() || props.providers.items().length} fallback={<Skeleton rows={6} />}>
            <Show when={props.providers.items().length} fallback={<Empty title="No providers registered yet" hint="Run `hashgramctl configure-role store` (or relay / media) and bond 1,000 HASH to appear here." />}>
              <div class="overflow-x-auto">
                <Table>
                  <thead><tr><Th>Operator</Th><Th>Roles</Th><Th num>Bond</Th><Th num>Declared storage</Th><Th num>Epoch credit</Th><Th num>Lifetime paid</Th><Th num>Fraud score</Th><Th>Status</Th></tr></thead>
                  <tbody>
                    <For each={props.providers.items()}>
                      {(p) => (
                        <tr>
                          <td>
                            <A href={`/rewards/providers/${p.operator}`} class="font-medium hover:underline">{p.moniker || `${p.operator.slice(0, 12)}…${p.operator.slice(-5)}`}</A>
                            <Show when={p.moniker}><div class="font-mono text-xs text-ink-500">{p.operator.slice(0, 12)}…{p.operator.slice(-5)}</div></Show>
                          </td>
                          <td>
                            <div class="flex gap-1">
                              <For each={p.roles}>
                                {(r) => (
                                  <Badge variant="muted">
                                    {r === 'storage' ? <HardDrive class="size-3" aria-hidden="true" /> : r === 'relay' ? <Radio class="size-3" aria-hidden="true" /> : r === 'media' ? <Download class="size-3" aria-hidden="true" /> : r === 'call' ? <Phone class="size-3" aria-hidden="true" /> : null}
                                    {r}
                                  </Badge>
                                )}
                              </For>
                            </div>
                          </td>
                          <td class="num"><Amount uhash={p.bond_uhash} unit={false} maxFraction={0} /></td>
                          <td class="num">{formatBytes(p.declared_storage_bytes)}</td>
                          <td class="num font-mono">{formatInt(p.current_epoch_credit)}</td>
                          <td class="num"><Amount uhash={p.lifetime_paid_uhash} unit={false} maxFraction={2} bold /></td>
                          <td class="num"><span class="font-mono">{formatInt(p.fraud_score)}</span></td>
                          <td>{p.jailed ? <Badge>✗ jailed</Badge> : <Badge variant="solid">✓ active</Badge>}</td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </Table>
              </div>
              <p class="mt-3 text-xs text-ink-500">Lifetime paid to the providers shown: <Amount uhash={props.totalPaid} maxFraction={2} />. Reward addresses: <For each={props.providers.items().slice(0, 3)}>{(p) => <span class="mr-2"><Address value={p.reward_address} head={6} tail={4} copy={false} /></span>}</For>{props.providers.items().length > 3 ? '…' : ''}</p>
            </Show>
          </Show>
        </Show>
      </Show>
      <Show when={tab() === 'epochs'}>
        <Show when={props.epochs.data()} fallback={<Skeleton rows={6} />}>
          <Show when={props.epochs.data()!.items.length} fallback={<Empty title="No epoch has closed yet" hint={`The first epoch closes at height ${formatInt(props.epochs.data()!.current.end_height)}.`} />}>
            <div class="overflow-x-auto">
              <Table>
                <thead><tr><Th num>Epoch</Th><Th>Blocks</Th><Th num>Budget</Th><Th num>Paid</Th><Th class="min-w-[8rem]">Used</Th><Th num>Providers paid</Th><Th num>Closed</Th></tr></thead>
                <tbody>
                  <For each={props.epochs.data()!.items}>
                    {(e) => {
                      const used = toBigInt(e.budget_uhash) > 0n ? Number((toBigInt(e.paid_uhash) * 10_000n) / toBigInt(e.budget_uhash)) / 100 : 0;
                      return (
                        <tr>
                          <td class="num font-semibold">#{formatInt(e.number)}</td>
                          <td class="font-mono text-xs"><HeightLink height={e.start_height} /> → <HeightLink height={e.end_height} /></td>
                          <td class="num"><Amount uhash={e.budget_uhash} unit={false} maxFraction={0} /></td>
                          <td class="num"><Amount uhash={e.paid_uhash} unit={false} maxFraction={2} bold /></td>
                          <td><div class="flex items-center gap-2"><ShareBar pct={used} class="w-20" label={`epoch ${e.number} budget used`} /><span class="font-mono text-xs">{used.toFixed(1)} %</span></div></td>
                          <td class="num">{formatInt(e.providers_paid)}</td>
                          <td class="num text-ink-500">{e.end_time ? <TimeAgo iso={e.end_time} /> : e.closed ? '✓' : 'open'}</td>
                        </tr>
                      );
                    }}
                  </For>
                </tbody>
              </Table>
            </div>
          </Show>
        </Show>
      </Show>
    </Card>
  );
}
