import { Show, onMount, createMemo } from 'solid-js';
import { useQuery, setTitle } from '../lib/query';
import { useLive } from '../lib/live';
import type { Health } from '../lib/api';
import { formatInt } from '../lib/format';
import { MAINNET_GENESIS_SHA256 } from '../lib/genesis';
import { PageHeader, Card, KV, Skeleton, ErrorState, Badge, Glyph, Note } from '../components/ui';
import { TimeAgo, Hash, HeightLink } from '../components/values';

export default function Status() {
  const h = useQuery<Health>('/health', { refreshMs: 5_000 });
  const { store, now } = useLive();
  onMount(() => setTitle('Status'));
  const headLag = createMemo(() => (h.data()?.head_age_seconds !== undefined ? h.data()!.head_age_seconds : store.head ? (now() - Date.parse(store.head.latest_block_time)) / 1000 : null));

  return (
    <div>
      <PageHeader title="Status" lead="Health of this site's own node, indexer and live stream. Nothing here is an estimate: the node is on this machine." />
      <Show when={!h.error()} fallback={<ErrorState error={h.error()} retry={h.refetch} />}>
        <Show when={h.data()} fallback={<Skeleton rows={8} />}>
          {(hd) => (
            <div class="grid gap-4 md:grid-cols-2">
              <Card title="Indexer API" action={<Badge variant={hd().status === 'ok' ? 'solid' : 'default'}>{hd().status}</Badge>}>
                <KV
                  items={[
                    ['Chain height', <HeightLink height={hd().chain_height} />],
                    ['Indexed height', <HeightLink height={hd().indexed_height} />],
                    ['Indexer lag', <span class={hd().lag_blocks > 10 ? 'font-semibold' : ''}>{formatInt(hd().lag_blocks)} blocks {hd().lag_blocks > 10 ? '▲' : '✓'}</span>],
                    ['Database', <Glyph ok={hd().db_ok} />],
                    hd().version ? ['Version', <span class="font-mono text-xs">{hd().version}</span>] : null,
                  ]}
                />
              </Card>
              <Card title="Node" action={<Badge variant={hd().node_catching_up ? 'default' : 'solid'}>{hd().node_catching_up ? 'catching up' : 'synced'}</Badge>}>
                <KV
                  items={[
                    ['Head age', headLag() !== null ? <span class={headLag()! > 30 ? 'font-semibold' : ''}>{headLag()!.toFixed(0)} s {headLag()! > 30 ? '▲ stalled?' : '✓'}</span> : '—'],
                    hd().head_time ? ['Head time', <TimeAgo iso={hd().head_time} />] : null,
                    ['Genesis pin', <span class="inline-flex items-center gap-2"><Hash value={MAINNET_GENESIS_SHA256} head={8} tail={6} /> <Glyph ok={store.genesisOk} label={store.genesisOk ? 'matches' : 'mismatch'} /></span>],
                    ['Chain id', <span class="font-mono">{store.head?.chain_id ?? '—'}</span>],
                  ]}
                />
              </Card>
              <Card title="Live stream" action={<Badge variant={store.state === 'live' ? 'solid' : 'default'}>{store.state}</Badge>}>
                <KV
                  items={[
                    ['Transport', store.state === 'live' ? 'Server-Sent Events' : store.state === 'polling' ? 'Polling every 6 s' : store.state],
                    ['Server source', <span class="font-mono text-xs">{hd().live_source ?? '—'}</span>],
                    ['Connected clients', formatInt(hd().live_clients)],
                    ['Last event', store.lastEventAt ? `${Math.round((now() - store.lastEventAt) / 1000)} s ago` : '—'],
                    ['Reconnects', formatInt(store.reconnects)],
                    ['Recent blocks buffered', formatInt(store.blocks.length)],
                  ]}
                />
              </Card>
              <Card title="Independence">
                <p class="text-sm text-ink-500">This server runs its own full node joined through the seed list compiled into the binaries. It does not read from the genesis server or any remote RPC. If any single machine on the network disappears — including the one that produced genesis — this site keeps following the chain as long as the chain itself is live (more than ⅔ of validator power online).</p>
                <Note class="mt-3">Admin interfaces (26657, 1317, 9091, 26672, 1318, 5432) are loopback-only; the internet reaches only Caddy on 80/443.</Note>
              </Card>
            </div>
          )}
        </Show>
      </Show>
    </div>
  );
}
