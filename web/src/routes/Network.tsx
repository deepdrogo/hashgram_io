import { For, Show, createMemo, onMount } from 'solid-js';
import { useSearchParams } from '@solidjs/router';
import { useQuery, setTitle } from '../lib/query';
import type { Network, Peer } from '../lib/api';
import { formatInt } from '../lib/format';
import { PageHeader, Card, KV, Skeleton, ErrorState, Th, Empty, Badge, Note, Stat, RawToggle, CopyButton, Table } from '../components/ui';
import { Hash, TimeAgo } from '../components/values';

function PeerTable(props: { peers: Peer[]; highlight?: string; layer: 'consensus' | 'p2p' }) {
  return (
    <Show when={props.peers.length} fallback={<Empty title="No peers seen" hint="The node has not reported any connections yet." />}>
      <div class="overflow-x-auto">
        <Table>
          <thead>
            <tr>
              <Th>{props.layer === 'consensus' ? 'Node id · moniker' : 'Peer id'}</Th>
              <Th>Version</Th>
              <Show when={props.layer === 'p2p'}><Th>Roles</Th></Show>
              <Th>IP /24</Th>
              <Th>Direction</Th>
              <Th num>First seen</Th>
              <Th num>Last seen</Th>
              <Th>Connected</Th>
            </tr>
          </thead>
          <tbody>
            <For each={props.peers}>
              {(p) => (
                <tr class={props.highlight && props.highlight === p.id ? 'bg-ink-900' : ''} id={`peer-${p.id}`}>
                  <td>
                    <Show when={p.moniker}><div class="font-medium">{p.moniker}</div></Show>
                    <Hash value={p.id} head={10} tail={6} />
                  </td>
                  <td class="font-mono text-xs">{p.version ?? '—'}</td>
                  <Show when={props.layer === 'p2p'}><td><div class="flex gap-1"><For each={p.roles ?? []}>{(r) => <Badge variant="muted">{r}</Badge>}</For></div></td></Show>
                  <td class="font-mono text-xs">{p.ip_prefix}</td>
                  <td class="text-xs text-ink-500">{p.outbound === undefined ? '—' : p.outbound ? '▲ outbound' : '▼ inbound'}</td>
                  <td class="num text-xs text-ink-500">{p.first_seen ? <TimeAgo iso={p.first_seen} /> : '—'}</td>
                  <td class="num text-xs text-ink-500"><TimeAgo iso={p.last_seen} /></td>
                  <td class="font-mono">{p.connected === undefined ? '·' : p.connected ? '✓' : '✗'}</td>
                </tr>
              )}
            </For>
          </tbody>
        </Table>
      </div>
    </Show>
  );
}

export default function NetworkPage() {
  const [sp] = useSearchParams<{ peer?: string }>();
  const q = useQuery<Network>('/network', { refreshMs: 15_000 });
  const nodes = useQuery<{ consensus_peers: number; p2p_peers: number; validators: number }>('/network/nodes', { refreshMs: 60_000 });
  onMount(() => setTitle('Network'));
  const n = () => q.data();
  const magic = createMemo(() => (n()?.info as Record<string, unknown> | undefined)?.magic ?? (n()?.info as Record<string, unknown> | undefined)?.network_magic ?? 'HGM1');

  return (
    <div>
      <PageHeader title="Network" lead="What this server's own node sees. Three layers, three separate numbers — they are never added together: consensus peers are CometBFT connections, P2P peers are libp2p connections carrying the social layer, validators are the signing set." />
      <Show when={!q.error()} fallback={<ErrorState error={q.error()} retry={q.refetch} />}>
        <Show when={n()} fallback={<Skeleton rows={8} />}>
          {(net) => (
            <>
              <div class="mb-6 grid gap-3 sm:grid-cols-3">
                <Stat label="Consensus peers" value={formatInt(net().consensus.peer_count)} hint={<span>CometBFT connections now · {formatInt(nodes.data()?.consensus_peers)} distinct in 24 h</span>} live />
                <Stat label="P2P peers" value={formatInt(net().p2p.peer_count)} hint={<span>libp2p connections now · {formatInt(nodes.data()?.p2p_peers)} distinct in 24 h</span>} live />
                <Stat label="Validators" value={formatInt(nodes.data()?.validators)} hint="Signing set — see Validators" href="/validators" />
              </div>

              <div class="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
                <div class="min-w-0 space-y-4">
                  <Card title={`Consensus peers (${net().consensus.peer_count})`}>
                    <PeerTable peers={net().consensus.peers} layer="consensus" highlight={sp.peer} />
                  </Card>
                  <Card title={`P2P peers (${net().p2p.peer_count})`}>
                    <PeerTable peers={net().p2p.peers} layer="p2p" highlight={sp.peer} />
                  </Card>
                </div>
                <aside class="space-y-4">
                  <Card title="This node">
                    <KV
                      items={[
                        ['Moniker', net().consensus.moniker],
                        ['CometBFT id', <Hash value={net().consensus.node_id} head={10} tail={6} />],
                        ['libp2p peer id', <Hash value={net().p2p.peer_id} head={10} tail={6} />],
                        ['Roles', <div class="flex flex-wrap gap-1"><For each={net().p2p.roles}>{(r) => <Badge variant="muted">{r}</Badge>}</For></div>],
                        ['Listening', net().consensus.listening ? '✓' : '✗'],
                      ]}
                    />
                    <p class="mt-3 text-xs text-ink-500">Ids are read from the node at runtime; nothing about any specific machine is hardcoded in this site.</p>
                  </Card>
                  <Card title="Join Mainnet">
                    <p class="text-sm text-ink-500">Seeds are compiled into the binaries. No arguments, no peer list to copy:</p>
                    <pre class="mt-2 overflow-auto rounded-md border border-ink-900 bg-ink-950 p-3 text-xs"><code>hashgramctl init --moniker my-node{'\n'}hashgramctl join-mainnet{'\n'}hashgramctl start</code></pre>
                    <details class="mt-3 text-xs">
                      <summary class="cursor-pointer text-ink-500 hover:text-white">Built-in seed lists ({net().seeds.cometbft.length} CometBFT · {net().seeds.libp2p.length} libp2p)</summary>
                      <ul class="mt-2 space-y-1 font-mono">
                        <For each={net().seeds.cometbft}>{(s) => <li class="flex items-center gap-1 break-all"><span class="truncate">{s}</span><CopyButton value={s} /></li>}</For>
                        <For each={net().seeds.libp2p}>{(s) => <li class="flex items-center gap-1 break-all"><span class="truncate">{s}</span><CopyButton value={s} /></li>}</For>
                      </ul>
                    </details>
                  </Card>
                  <Card title="Versions seen">
                    <Show when={net().versions.length} fallback={<p class="text-sm text-ink-500">—</p>}>
                      <ul class="space-y-1 text-sm">
                        <For each={net().versions}>{(v) => <li class="flex justify-between font-mono text-xs"><span>{v.version}<Show when={v.layer}> <span class="text-ink-500">({v.layer})</span></Show></span><span>{formatInt(v.count)}</span></li>}</For>
                      </ul>
                    </Show>
                  </Card>
                </aside>
              </div>

              <div class="grid gap-4 lg:grid-cols-2">
                <Card title="Network identity">
                  <KV
                    items={[
                      ['Network id', <span class="font-mono">{String((net().info as Record<string, unknown>).network_id ?? (net().info as Record<string, unknown>).id ?? 'hashgram-1')}</span>],
                      ['Magic', <span class="font-mono">{String(magic())}</span>],
                      ['Protocol major', <span class="font-mono">{String((net().info as Record<string, unknown>).protocol_major ?? (net().info as Record<string, unknown>).protocol_version ?? '—')}</span>],
                    ]}
                  />
                  <RawToggle data={net().info} label="network info" />
                </Card>
                <Card title="Fork isolation">
                  <p class="mb-3 text-sm text-ink-500">Every handshake carries the network magic <span class="font-mono">{String(magic())}</span>, the protocol major version and the genesis hash. A node on a different chain, fork or incompatible version is refused before any block is exchanged — so a stale or malicious peer cannot pull this node onto another history.</p>
                  <RawToggle data={net().fork_isolation} label="fork isolation" />
                </Card>
              </div>
            </>
          )}
        </Show>
      </Show>
      <Note class="mt-6" title="Privacy.">Peer addresses are stored and shown as /24 (IPv4) or /48 (IPv6) prefixes only, on this server and in its logs.</Note>
    </div>
  );
}
