import { For, Show, createEffect, createMemo } from 'solid-js';
import { A, useParams } from '@solidjs/router';
import { ChevronLeft, ChevronRight } from 'lucide-solid';
import { useQuery, setTitle } from '../lib/query';
import { useLive } from '../lib/live';
import type { BlockDetail } from '../lib/api';
import { formatInt, formatBytes, formatMs } from '../lib/format';
import { PageHeader, Card, KV, Skeleton, ErrorState, RawToggle, Th, Glyph, Badge, Table } from '../components/ui';
import { Hash, TimeAgo, Utc, TxLink, Success, Amount, HeightLink } from '../components/values';

export default function Block() {
  const params = useParams<{ height: string }>();
  const { store } = useLive();
  const q = useQuery<BlockDetail>(() => `/blocks/${params.height}`);
  createEffect(() => setTitle(`Block ${formatInt(Number(params.height))}`));

  const b = () => q.data();
  const isHead = createMemo(() => store.head && b() && store.head.height === b()!.height);
  const missing = createMemo(() => (b()?.signature_list ?? []).filter((s) => !s.signed));

  return (
    <div>
      <PageHeader
        title={
          <span class="font-mono tabular">
            Block {formatInt(Number(params.height))}
          </span>
        }
        lead={b() ? <Utc iso={b()!.time} /> : undefined}
        aside={
          <nav class="flex gap-2" aria-label="Adjacent blocks">
            <A href={`/blocks/${Number(params.height) - 1}`} class={`btn ${Number(params.height) <= 1 ? 'pointer-events-none opacity-40' : ''}`} aria-disabled={Number(params.height) <= 1 ? true : undefined}>
              <ChevronLeft class="size-4" aria-hidden="true" /> Prev
            </A>
            <A href={`/blocks/${Number(params.height) + 1}`} class={`btn ${isHead() ? 'pointer-events-none opacity-40' : ''}`} aria-disabled={isHead() ? true : undefined}>
              Next <ChevronRight class="size-4" aria-hidden="true" />
            </A>
          </nav>
        }
      />
      <Show when={!q.error()} fallback={<ErrorState error={q.error()} retry={q.refetch} />}>
        <Show when={b()} fallback={<Skeleton rows={10} />}>
          {(blk) => (
            <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div class="space-y-4">
                <Card title="Header">
                  <KV
                    items={[
                      ['Hash', <Hash value={blk().hash} full />],
                      ['Time', <span><Utc iso={blk().time} /> <span class="text-ink-500">(<TimeAgo iso={blk().time} />)</span></span>],
                      ['Proposer', <A href={`/validators/${blk().proposer.operator}`} class="hover:underline">{blk().proposer.moniker || blk().proposer.operator}</A>],
                      ['Transactions', formatInt(blk().tx_count)],
                      ['Gas', <span class="tabular">{formatInt(blk().gas_used)} / {formatInt(blk().gas_wanted)}</span>],
                      ['Size', formatBytes(blk().size_bytes)],
                      blk().block_time_ms !== undefined ? ['Since previous', formatMs(blk().block_time_ms)] : null,
                      ['Previous hash', <Hash value={blk().last_block_hash} href={`/blocks/${blk().height - 1}`} head={10} tail={8} />],
                      ['App hash', <Hash value={blk().app_hash} head={10} tail={8} />],
                      ['Data hash', <Hash value={blk().data_hash} head={10} tail={8} />],
                      blk().validators_hash ? ['Validators hash', <Hash value={blk().validators_hash} head={10} tail={8} />] : null,
                    ]}
                  />
                </Card>

                <Card title={`Transactions (${blk().tx_count})`}>
                  <Show when={blk().txs.length} fallback={<p class="py-4 text-center text-sm text-ink-500">This block carries no transactions.</p>}>
                    <div class="overflow-x-auto">
                      <Table>
                        <thead>
                          <tr>
                            <Th>Status</Th>
                            <Th>Hash</Th>
                            <Th>Type</Th>
                            <Th>Summary</Th>
                            <Th num>Fee</Th>
                            <Th num>Gas</Th>
                          </tr>
                        </thead>
                        <tbody>
                          <For each={blk().txs}>
                            {(t) => (
                              <tr>
                                <td><Success ok={t.success} /></td>
                                <td><TxLink hash={t.hash} /></td>
                                <td><Badge>{t.type}</Badge>{t.msg_count > 1 ? <span class="ml-1 text-xs text-ink-500">+{t.msg_count - 1}</span> : null}</td>
                                <td class="max-w-[18rem] truncate text-ink-500">{t.summary ?? ''}</td>
                                <td class="num"><Amount uhash={t.fee_uhash} unit={false} /></td>
                                <td class="num">{formatInt(t.gas_used)}</td>
                              </tr>
                            )}
                          </For>
                        </tbody>
                      </Table>
                    </div>
                  </Show>
                </Card>

                <Card title="Signatures">
                  <p class="mb-3 text-sm text-ink-500">
                    {blk().signatures.present} of {blk().signatures.total} validators signed the previous block's commit included here.
                    <Show when={missing().length}> {missing().length} missing: {missing().map((m) => m.validator.moniker || m.validator.operator).join(', ')}.</Show>
                  </p>
                  <ul class="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                    <For each={blk().signature_list}>
                      {(s) => (
                        <li class="flex items-center gap-2 text-sm">
                          <Glyph ok={s.signed} label={s.signed ? 'signed' : 'missing'} />
                          <A href={`/validators/${s.validator.operator}`} class={`truncate hover:underline ${s.signed ? '' : 'font-semibold'}`}>
                            {s.validator.moniker || s.validator.operator}
                          </A>
                        </li>
                      )}
                    </For>
                  </ul>
                </Card>

                <Show when={blk().raw}>
                  <Card title="Raw">
                    <RawToggle data={blk().raw} label="block JSON" />
                  </Card>
                </Show>
              </div>

              <aside class="space-y-4">
                <Card title="Events">
                  <KV
                    items={[
                      ['Transfers', formatInt(blk().events_summary.transfers)],
                      ['Delegations', formatInt(blk().events_summary.delegations)],
                      ['Founder payouts', formatInt(blk().events_summary.founder_payouts)],
                      ['Service receipts', formatInt(blk().events_summary.service_receipts)],
                      ['Other', formatInt(blk().events_summary.other)],
                    ]}
                  />
                </Card>
                <Card title="Position">
                  <KV
                    items={[
                      ['Height', <HeightLink height={blk().height} />],
                      ['Head', store.head ? <HeightLink height={store.head.height} /> : '—'],
                      ['Confirmations', store.head ? formatInt(Math.max(0, store.head.height - blk().height)) : '—'],
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
