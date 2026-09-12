import { For, Show, createMemo, onMount } from 'solid-js';
import { A } from '@solidjs/router';
import { Percent, Lock, Unlock, CalendarClock, ShieldCheck, Ban, Check, Landmark, Vote } from 'lucide-solid';
import { useQuery, setTitle } from '../lib/query';
import type { Founder, Fees, Treasury } from '../lib/api';
import { formatInt, formatPct, ratioPct, toBigInt, formatHash } from '../lib/format';
import { PageHeader, Card, KV, Skeleton, ErrorState, Th, Empty, Note, Stat, Badge, Table } from '../components/ui';
import { Amount, Address, TimeAgo, HeightLink, TxLink, Utc } from '../components/values';
import { ShareBar } from '../components/charts';
import { VestingChart } from './Account';
import { useLive } from '../lib/live';

export default function FounderPage() {
  const q = useQuery<Founder>('/founder', { refreshMs: 30_000 });
  const fees = useQuery<Fees>('/fees', { refreshMs: 60_000 });
  const treasury = useQuery<Treasury>('/treasury', { refreshMs: 60_000 });
  const { store, now } = useLive();
  onMount(() => setTitle('Founder — transparency'));
  const f = () => q.data();

  const unlocked = createMemo(() => (f()?.vesting ? toBigInt(f()!.allocation_uhash) - toBigInt(f()!.vesting!.original_uhash) : 0n));
  const releasedPct = createMemo(() => (f()?.vesting ? ratioPct(f()!.vesting!.vested_uhash, f()!.vesting!.original_uhash) : 0));
  const nextPeriod = createMemo(() => f()?.vesting?.periods.find((p) => !p.released));
  const blocksToPayout = createMemo(() => (f() && store.head ? Math.max(0, f()!.next_payout_height - store.head.height) : null));
  const etaPayout = createMemo(() => {
    const b = blocksToPayout();
    const bt = store.head?.avg_block_time_ms;
    if (b === null || !bt) return null;
    return new Date(now() + b * bt).toISOString();
  });

  return (
    <div>
      <PageHeader
        title="Founder — transparency"
        lead="Everything the founder receives from Hashgram, read live from the chain. Two things, and only two: a one-time allocation fixed at genesis, and a 1 % share of the fees the network already collects."
      />
      <Show when={!q.error()} fallback={<ErrorState error={q.error()} retry={q.refetch} />}>
        <Show when={f()} fallback={<Skeleton rows={10} />}>
          {(fd) => (
            <>
              {/* Plain-language summary */}
              <section class="mb-6 grid gap-3 md:grid-cols-2">
                <div class="card p-4">
                  <h2 class="mb-2 inline-flex items-center gap-2 text-sm font-semibold"><Check class="size-4" aria-hidden="true" /> What the founder receives</h2>
                  <ul class="space-y-1.5 text-sm text-ink-500">
                    <li><span class="text-white">{fd().params.fee_basis_points / 100} % of protocol fee revenue.</span> Every transaction pays a fee; the fee router sends {fd().params.fee_basis_points} basis points of it to the founder module, which pays the beneficiary every {formatInt(fd().payout_interval_blocks)} blocks.</li>
                    <li><span class="text-white"><Amount uhash={fd().allocation_uhash} maxFraction={0} /> at genesis</span> — <Amount uhash={unlocked()} maxFraction={0} /> unlocked, <Amount uhash={fd().vesting?.original_uhash ?? '0'} maxFraction={0} /> locked in a vesting account that releases in {fd().vesting?.periods.length ?? 0} monthly steps.</li>
                    <li>The same voting rights as any other delegator for the HASH it stakes — shown below.</li>
                  </ul>
                </div>
                <div class="card p-4">
                  <h2 class="mb-2 inline-flex items-center gap-2 text-sm font-semibold"><Ban class="size-4" aria-hidden="true" /> What the founder does not receive</h2>
                  <ul class="space-y-1.5 text-sm text-ink-500">
                    <li><span class="text-white">No transfer tax.</span> Nothing is taken from anyone's balance; the share comes out of fees only.</li>
                    <li><span class="text-white">No new coins.</span> Supply is fixed at 1,000,000,000 HASH; the founder share is never minted.</li>
                    <li><span class="text-white">No way to raise it.</span> The ceiling is {fd().params.ceiling_basis_points} bps, hardcoded in the binary — raising it means a new binary that validators would have to adopt.</li>
                    <li><span class="text-white">No special keys.</span> Changing the beneficiary is a governance decision and appears in the history below.</li>
                  </ul>
                </div>
              </section>

              <div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Fee share" value={<span class="inline-flex items-center gap-2"><Percent class="size-5 text-ink-500" aria-hidden="true" /> {fd().params.fee_basis_points / 100} %</span>} hint={`${fd().params.fee_basis_points} bps · ceiling ${fd().params.ceiling_basis_points} bps (binary)`} />
                <Stat label="Accrued so far" value={<Amount uhash={fd().revenue.accrued_uhash} maxFraction={6} />} hint="Lifetime founder revenue" live />
                <Stat label="Paid out" value={<Amount uhash={fd().revenue.paid_uhash} maxFraction={6} />} hint={`${fd().payouts.length} payout${fd().payouts.length === 1 ? '' : 's'} so far`} />
                <Stat label="Pending" value={<Amount uhash={fd().revenue.pending_uhash} maxFraction={6} />} hint={<span>next payout at <HeightLink height={fd().next_payout_height} />{blocksToPayout() !== null ? ` · ${formatInt(blocksToPayout()!)} blocks` : ''}{etaPayout() ? <> · <TimeAgo iso={etaPayout()} /></> : null}</span>} />
              </div>

              <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
                <div class="space-y-4">
                  <Card title="Allocation and vesting" action={<Lock class="size-4 text-ink-500" aria-hidden="true" />}>
                    <div class="mb-4 grid gap-3 sm:grid-cols-3">
                      <div class="rounded-md border border-ink-900 p-3">
                        <div class="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-ink-500"><Unlock class="size-3" aria-hidden="true" /> Unlocked at genesis</div>
                        <div class="mt-1 text-lg font-semibold tabular"><Amount uhash={unlocked()} maxFraction={0} /></div>
                      </div>
                      <div class="rounded-md border border-ink-900 p-3">
                        <div class="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-ink-500"><Lock class="size-3" aria-hidden="true" /> Vesting</div>
                        <div class="mt-1 text-lg font-semibold tabular"><Amount uhash={fd().vesting?.original_uhash ?? '0'} maxFraction={0} /></div>
                        <div class="text-[11px] text-ink-500">{fd().vesting?.periods.length ?? 0} periods · monthly</div>
                      </div>
                      <div class="rounded-md border border-ink-900 p-3">
                        <div class="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-ink-500"><CalendarClock class="size-3" aria-hidden="true" /> Released so far</div>
                        <div class="mt-1 text-lg font-semibold tabular"><Amount uhash={fd().vesting?.vested_uhash ?? '0'} maxFraction={0} /></div>
                        <div class="text-[11px] text-ink-500">{releasedPct().toFixed(2)} % of the vesting part</div>
                      </div>
                    </div>
                    <Show when={fd().vesting}>
                      <div class="mb-1 flex justify-between text-xs text-ink-500"><span>released</span><span>still locked · <Amount uhash={fd().vesting!.vesting_uhash} maxFraction={0} /></span></div>
                      <ShareBar pct={releasedPct()} label="Vesting released" />
                      <KV
                        class="my-4"
                        items={[
                          ['Beneficiary', <Address value={fd().beneficiary} full />],
                          ['Vesting account type', <span class="font-mono text-xs">{fd().vesting!.type}</span>],
                          ['Vesting started', <Utc iso={fd().vesting!.start_time} />],
                          nextPeriod() ? ['Next release', <span><Amount uhash={nextPeriod()!.amount_uhash} maxFraction={0} /> on <Utc iso={nextPeriod()!.end_time} /> <span class="text-ink-500">(<TimeAgo iso={nextPeriod()!.end_time} />)</span></span>] : null,
                          ['Fully vested', <span><Utc iso={fd().vesting!.end_time} /> <span class="text-ink-500">(<TimeAgo iso={fd().vesting!.end_time} />)</span></span>],
                          fd().balance_uhash ? ['Balance now', <Amount uhash={fd().balance_uhash} maxFraction={2} />] : null,
                          fd().spendable_uhash ? ['Spendable now', <Amount uhash={fd().spendable_uhash} maxFraction={2} />] : null,
                        ]}
                      />
                      <VestingChart vesting={fd().vesting!} base={unlocked()} />
                      <p class="mt-2 text-xs text-ink-500">Cumulative HASH released to the founder over time. The step chart starts at the unlocked amount and adds one period per month; "today" marks where the chain is now. Locked HASH can be staked but not spent.</p>
                    </Show>
                    <Show when={!fd().vesting}>
                      <Empty title="No vesting account found for the beneficiary" />
                    </Show>
                  </Card>

                  <Card title="Delegations and voting power" action={<Vote class="size-4 text-ink-500" aria-hidden="true" />}>
                    <Show when={fd().delegations.length} fallback={<Empty title="No delegations" />}>
                      <div class="overflow-x-auto">
                        <Table>
                          <thead><tr><Th>Validator</Th><Th num>Delegated</Th><Th num>Pending rewards</Th></tr></thead>
                          <tbody>
                            <For each={fd().delegations}>
                              {(d) => (
                                <tr>
                                  <td><A href={`/validators/${d.validator.operator}`} class="hover:underline">{d.validator.moniker || d.validator.operator}</A><div class="font-mono text-xs text-ink-500">{d.validator.operator}</div></td>
                                  <td class="num"><Amount uhash={d.balance_uhash} maxFraction={0} bold /></td>
                                  <td class="num text-ink-500"><Amount uhash={d.reward_uhash ?? '0'} maxFraction={2} /></td>
                                </tr>
                              )}
                            </For>
                          </tbody>
                        </Table>
                      </div>
                    </Show>
                    <div class="mt-3 grid gap-3 sm:grid-cols-2">
                      <div class="rounded-md border border-ink-900 p-3">
                        <div class="text-[11px] uppercase tracking-wide text-ink-500">Total delegated</div>
                        <div class="mt-1 text-lg font-semibold tabular"><Amount uhash={fd().total_delegated_uhash} maxFraction={0} /></div>
                      </div>
                      <div class="rounded-md border border-ink-900 p-3">
                        <div class="text-[11px] uppercase tracking-wide text-ink-500">Share of bonded voting power</div>
                        <div class="mt-1 flex items-center gap-3"><span class="text-lg font-semibold tabular">{formatPct(fd().voting_power_pct)}</span><ShareBar pct={fd().voting_power_pct} class="flex-1" label="Founder share of voting power" /></div>
                      </div>
                    </div>
                    <p class="mt-3 text-xs text-ink-500">Voting power is proportional to bonded stake. It falls as other holders delegate; nothing about the founder's stake is privileged.</p>
                  </Card>

                  <Card title={`Payout history (${fd().payouts.length})`} action={<span class="text-xs text-ink-500">every {formatInt(fd().payout_interval_blocks)} blocks</span>}>
                    <Show when={fd().payouts.length} fallback={<Empty title="No payouts yet" hint={<span>The founder module pays the beneficiary every {formatInt(fd().payout_interval_blocks)} blocks. Next at height <HeightLink height={fd().next_payout_height} />{etaPayout() ? <>, <TimeAgo iso={etaPayout()} /></> : null}. Pending now: {formatHash(fd().revenue.pending_uhash, { unit: true })}.</span>} />}>
                      <div class="overflow-x-auto">
                        <Table>
                          <thead><tr><Th>Height</Th><Th>From</Th><Th>To</Th><Th num>Amount</Th><Th num>Age</Th></tr></thead>
                          <tbody>
                            <For each={fd().payouts}>
                              {(t) => (
                                <tr>
                                  <td><HeightLink height={t.height} /><Show when={t.tx_hash}> · <TxLink hash={t.tx_hash} head={6} tail={4} /></Show></td>
                                  <td><Address value={t.from} label={t.from_label ?? 'Founder revenue (module)'} copy={false} /></td>
                                  <td><Address value={t.to} head={6} tail={4} copy={false} /></td>
                                  <td class="num"><Amount uhash={t.amount_uhash} maxFraction={6} bold /></td>
                                  <td class="num text-ink-500"><TimeAgo iso={t.time} /></td>
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
                  <Card title="Parameters" action={<ShieldCheck class="size-4 text-ink-500" aria-hidden="true" />}>
                    <KV
                      items={[
                        ['fee_basis_points', <span class="font-mono">{fd().params.fee_basis_points}</span>],
                        ['ceiling', <span class="font-mono">{fd().params.ceiling_basis_points} bps <Badge variant="muted">binary</Badge></span>],
                        ['Module account', <Address value={fd().module_address} head={8} tail={5} />],
                        ['Payout interval', `${formatInt(fd().payout_interval_blocks)} blocks`],
                        ['Last payout', fd().payouts[0] ? <HeightLink height={fd().payouts[0]!.height} /> : '—'],
                      ]}
                    />
                    <A href="/governance" class="btn mt-3">Governance parameters</A>
                  </Card>

                  <Card title="Beneficiary history">
                    <ol class="space-y-2 text-sm">
                      <For each={fd().beneficiary_history}>
                        {(h) => (
                          <li>
                            <Address value={h.address} head={8} tail={5} />
                            <div class="text-xs text-ink-500">{h.height ? <HeightLink height={h.height} /> : 'set at genesis'}{h.time ? <> · <TimeAgo iso={h.time} /></> : null}</div>
                          </li>
                        )}
                      </For>
                      <Show when={fd().beneficiary_history.length === 0}>
                        <li class="text-ink-500">Unchanged since genesis.</li>
                      </Show>
                    </ol>
                  </Card>

                  <Card title="Where fees go" action={<Landmark class="size-4 text-ink-500" aria-hidden="true" />}>
                    <Show when={fees.data()} fallback={<Skeleton rows={4} />}>
                      <Show when={fees.data()!.summary} fallback={<pre class="overflow-auto text-xs">{JSON.stringify(fees.data()!.totals, null, 2)}</pre>}>
                        <ul class="space-y-3 text-sm">
                          <For
                            each={[
                              { label: 'Validators & delegators', v: fees.data()!.summary!.to_validators_uhash },
                              { label: `Founder (${fd().params.fee_basis_points / 100} %)`, v: fees.data()!.summary!.to_founder_uhash },
                              { label: 'Treasury / service revenue', v: fees.data()!.summary!.to_service_uhash },
                            ]}
                          >
                            {(s) => (
                              <li>
                                <div class="mb-1 flex justify-between"><span>{s.label}</span><span class="font-mono text-xs text-ink-500">{formatPct(ratioPct(s.v, fees.data()!.summary!.total_fees_uhash), 1)}</span></div>
                                <ShareBar pct={ratioPct(s.v, fees.data()!.summary!.total_fees_uhash)} label={s.label} />
                                <div class="mt-1 text-xs text-ink-500"><Amount uhash={s.v} maxFraction={6} /></div>
                              </li>
                            )}
                          </For>
                        </ul>
                        <p class="mt-3 text-xs text-ink-500">Total fees collected so far: <Amount uhash={fees.data()!.summary!.total_fees_uhash} maxFraction={6} />.</p>
                      </Show>
                    </Show>
                  </Card>

                  <Card title="Treasury reserves">
                    <Show when={treasury.data()} fallback={<Skeleton rows={4} />}>
                      <ul class="space-y-2 text-sm">
                        <For each={treasury.data()!.reserves}>
                          {(r) => (
                            <li class="flex items-center justify-between gap-2">
                              <Address value={r.address} label={r.label} head={6} tail={4} copy={false} />
                              <Amount uhash={r.balance_uhash} maxFraction={0} />
                            </li>
                          )}
                        </For>
                      </ul>
                      <p class="mt-2 text-xs text-ink-500">Total <Amount uhash={treasury.data()!.total_uhash} maxFraction={0} /> · {formatInt(treasury.data()!.disbursements.length)} disbursements, by governance only. Not the founder's.</p>
                    </Show>
                  </Card>
                </aside>
              </div>
            </>
          )}
        </Show>
      </Show>
      <Note class="mt-6" title="How to verify this yourself.">
        Every figure on this page is a chain query: <span class="font-mono">/hashgram/founder/v1/params</span>, <span class="font-mono">/hashgram/founder/v1/revenue</span>, the beneficiary's vesting account in <span class="font-mono">x/auth</span>, its delegations in <span class="font-mono">x/staking</span>, and the transfer events from the founder module account. Run your own node and compare — the point of this page is that you do not have to trust it.
      </Note>
    </div>
  );
}
