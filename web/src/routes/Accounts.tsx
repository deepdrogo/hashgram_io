import { For, Show, createMemo, onMount } from 'solid-js';
import { Landmark, Lock, ShieldCheck, UserRound, Coins, Gift, PiggyBank, Wallet } from 'lucide-solid';
import type { Component } from 'solid-js';
import type { LucideProps } from 'lucide-solid';
import { usePaged, setTitle } from '../lib/query';
import type { TopAccount } from '../lib/api';
import { formatInt, ppmToPct } from '../lib/format';
import { PageHeader, Pager, Skeleton, ErrorState, Th, Empty, Badge, Note, Stat, Table } from '../components/ui';
import { Address, Amount } from '../components/values';
import { ShareBar } from '../components/charts';

const KIND_LABEL: Record<string, string> = {
  user: 'User',
  module: 'Module',
  vesting: 'Vesting',
  validator_operator: 'Validator',
};

/** One icon per account kind / well-known label. Monochrome, currentColor. */
export function AccountIcon(props: { kind: string; label?: string; class?: string }) {
  const pick = (): Component<LucideProps> => {
    const l = props.label ?? '';
    if (l.startsWith('Useful-service')) return Coins;
    if (l.startsWith('Founder')) return Lock;
    if (l.startsWith('Welcome')) return Gift;
    if (l.includes('staking pool') || l.startsWith('Bonded') || l.startsWith('Unbonding')) return PiggyBank;
    switch (props.kind) {
      case 'module':
        return Landmark;
      case 'vesting':
        return Lock;
      case 'validator_operator':
        return ShieldCheck;
      default:
        return UserRound;
    }
  };
  const Icon = pick();
  return (
    <span class={`inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-ink-800 bg-ink-900 text-ink-500 ${props.class ?? ''}`} aria-hidden="true">
      <Icon class="size-3.5" />
    </span>
  );
}

export default function Accounts() {
  const page = usePaged<TopAccount>(() => '/accounts/top', () => ({}), 50);
  onMount(() => setTitle('Accounts'));
  const total = createMemo(() => (page.extra()?.total_supply_uhash as string | undefined) ?? undefined);
  const sumPpm = createMemo(() => page.items().reduce((a, x) => a + x.share_ppm, 0));
  const byKind = createMemo(() => {
    const m: Record<string, { n: number; ppm: number }> = {};
    for (const a of page.items()) {
      const k = (m[a.kind] ??= { n: 0, ppm: 0 });
      k.n++;
      k.ppm += a.share_ppm;
    }
    return m;
  });

  return (
    <div>
      <PageHeader title="Accounts" lead={<span>Top holders of HASH by balance, refreshed every 20 blocks from the node. Total supply is fixed at <Amount uhash={total() ?? '1000000000000000'} maxFraction={0} />.</span>} />
      <div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Module accounts" value={<span class="inline-flex items-center gap-2"><Landmark class="size-4 text-ink-500" aria-hidden="true" /> {formatInt(byKind().module?.n ?? 0)}</span>} hint={`${ppmToPct(byKind().module?.ppm ?? 0)} of supply`} />
        <Stat label="Vesting accounts" value={<span class="inline-flex items-center gap-2"><Lock class="size-4 text-ink-500" aria-hidden="true" /> {formatInt(byKind().vesting?.n ?? 0)}</span>} hint={`${ppmToPct(byKind().vesting?.ppm ?? 0)} of supply`} />
        <Stat label="Validator operators" value={<span class="inline-flex items-center gap-2"><ShieldCheck class="size-4 text-ink-500" aria-hidden="true" /> {formatInt(byKind().validator_operator?.n ?? 0)}</span>} hint={`${ppmToPct(byKind().validator_operator?.ppm ?? 0)} of supply`} />
        <Stat label="User accounts (shown)" value={<span class="inline-flex items-center gap-2"><Wallet class="size-4 text-ink-500" aria-hidden="true" /> {formatInt(byKind().user?.n ?? 0)}</span>} hint={`${ppmToPct(byKind().user?.ppm ?? 0)} of supply`} />
      </div>
      <Show when={!page.error()} fallback={<ErrorState error={page.error()} retry={page.refetch} />}>
        <Show when={!page.loading() || page.items().length} fallback={<Skeleton rows={12} />}>
          <Show when={page.items().length} fallback={<Empty title="Balances not yet indexed" hint="The first balance snapshot is taken 20 blocks after the indexer starts." />}>
            <div class="card overflow-x-auto">
              <Table>
                <thead>
                  <tr>
                    <Th num>#</Th>
                    <Th>Account</Th>
                    <Th>Kind</Th>
                    <Th num>Balance</Th>
                    <Th num>Spendable</Th>
                    <Th class="min-w-[10rem]">Share of supply</Th>
                    <Th num>Txs</Th>
                  </tr>
                </thead>
                <tbody>
                  <For each={page.items()}>
                    {(a) => (
                      <tr>
                        <td class="num text-ink-500">{a.rank}</td>
                        <td>
                          <div class="flex items-center gap-2">
                            <AccountIcon kind={a.kind} label={a.label} />
                            <Address value={a.address} label={a.label} />
                          </div>
                        </td>
                        <td><Badge variant={a.kind === 'user' ? 'muted' : 'default'}>{KIND_LABEL[a.kind] ?? a.kind}</Badge></td>
                        <td class="num"><Amount uhash={a.balance_uhash} unit={false} maxFraction={2} bold /></td>
                        <td class="num text-ink-500"><Amount uhash={a.spendable_uhash} unit={false} maxFraction={2} /></td>
                        <td>
                          <div class="flex items-center gap-2">
                            <ShareBar pct={a.share_ppm / 10_000} label={`${a.label ?? a.address} share`} class="w-24" />
                            <span class="font-mono text-xs tabular">{ppmToPct(a.share_ppm)}</span>
                          </div>
                        </td>
                        <td class="num">{formatInt(a.tx_count)}</td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </Table>
            </div>
            <Pager next={page.next()} onNext={page.goNext} onReset={page.reset} hasPrev={page.hasPrev()} loading={page.loading()} />
            <p class="mt-2 text-right font-mono text-xs text-ink-500">Shown accounts hold {ppmToPct(sumPpm())} of supply.</p>
          </Show>
        </Show>
      </Show>
      <Note class="mt-6" title="About module and reserve accounts.">
        Module accounts are owned by the protocol, not by people. The <em>Useful-service reserve</em> (500,000,000 HASH at genesis) pays storage, relay and media providers epoch by epoch; the four treasury sub-accounts (Treasury, Growth, Developer grants, Liquidity) move only by governance; the <em>Founder revenue</em> module collects 1 % of fees and pays the beneficiary every 7,200 blocks. The Founder's own account is a periodic vesting account: 19,000,000 HASH spendable, 180,000,000 HASH released over 96 monthly periods. Circulating supply excludes module accounts and the unvested balance.
      </Note>
    </div>
  );
}
