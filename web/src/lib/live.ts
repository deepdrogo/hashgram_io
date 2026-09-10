import { createSignal, createRoot, onCleanup } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { API_V1, getJson, type ChainInfo, type BlockSummary, type TxSummary, type Epoch, type Transfer, type Proposal } from './api';
import { genesisMatches } from './genesis';

export type LiveState = 'connecting' | 'live' | 'polling' | 'down';

export interface LiveStore {
  head: ChainInfo | null;
  blocks: BlockSummary[];
  txs: TxSummary[];
  state: LiveState;
  lastEventAt: number | null;
  /** null = not checked yet */
  genesisOk: boolean | null;
  error: string | null;
  events: { epoch: Epoch | null; founder_payout: Transfer | null; proposal: Proposal | null };
  reconnects: number;
}

const MAX_ITEMS = 20;
const POLL_MS = 6_000;
const STALE_MS = 40_000; // heartbeat is every 15 s; two misses → stale
const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

function createLive() {
  const [store, set] = createStore<LiveStore>({
    head: null,
    blocks: [],
    txs: [],
    state: 'connecting',
    lastEventAt: null,
    genesisOk: null,
    error: null,
    events: { epoch: null, founder_payout: null, proposal: null },
    reconnects: 0,
  });

  // A one-second clock for relative timestamps anywhere in the UI.
  const [now, setNow] = createSignal(Date.now());
  const clock = setInterval(() => setNow(Date.now()), 1000);

  let es: EventSource | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let staleTimer: ReturnType<typeof setInterval> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let backoff = RECONNECT_BASE_MS;

  const touch = () => set('lastEventAt', Date.now());

  function applyHead(h: ChainInfo) {
    set('head', h);
    set('genesisOk', genesisMatches(h.genesis_hash));
    set('error', null);
  }

  function pushBlock(b: BlockSummary) {
    set(
      produce((s) => {
        if (s.blocks.some((x) => x.height === b.height)) return;
        s.blocks.unshift(b);
        s.blocks.sort((a, c) => c.height - a.height);
        if (s.blocks.length > MAX_ITEMS) s.blocks.length = MAX_ITEMS;
        if (s.head && b.height > s.head.height) {
          s.head.height = b.height;
          s.head.latest_block_time = b.time;
          s.head.latest_block_hash = b.hash;
        }
      }),
    );
  }

  function pushTx(t: TxSummary) {
    set(
      produce((s) => {
        if (s.txs.some((x) => x.hash === t.hash)) return;
        s.txs.unshift(t);
        if (s.txs.length > MAX_ITEMS) s.txs.length = MAX_ITEMS;
      }),
    );
  }

  async function bootstrap() {
    try {
      const [head, blocks, txs] = await Promise.all([
        getJson<ChainInfo>('/chain'),
        getJson<{ items: BlockSummary[] }>('/blocks?limit=10'),
        getJson<{ items: TxSummary[] }>('/txs?limit=10'),
      ]);
      applyHead(head);
      set('blocks', blocks.items.slice(0, MAX_ITEMS));
      set('txs', txs.items.slice(0, MAX_ITEMS));
    } catch (e) {
      set('error', e instanceof Error ? e.message : String(e));
      set('state', 'down');
    }
  }

  async function poll() {
    try {
      const head = await getJson<ChainInfo>('/chain');
      const prev = store.head?.height ?? 0;
      applyHead(head);
      if (head.height > prev) {
        const blocks = await getJson<{ items: BlockSummary[] }>('/blocks?limit=10');
        blocks.items.forEach(pushBlock);
        const txs = await getJson<{ items: TxSummary[] }>('/txs?limit=10');
        txs.items.forEach(pushTx);
      }
      if (store.state === 'down') set('state', 'polling');
      touch();
    } catch (e) {
      set('error', e instanceof Error ? e.message : String(e));
      set('state', 'down');
    }
  }

  function startPolling() {
    if (pollTimer) return;
    set('state', (s) => (s === 'down' ? 'down' : 'polling'));
    void poll();
    pollTimer = setInterval(() => void poll(), POLL_MS);
  }

  function stopPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      set('reconnects', (n) => n + 1);
      connect();
    }, backoff);
    backoff = Math.min(RECONNECT_MAX_MS, backoff * 2);
  }

  function connect() {
    if (typeof EventSource === 'undefined') {
      startPolling();
      return;
    }
    es?.close();
    es = new EventSource(`${API_V1}/live`);

    es.onopen = () => {
      backoff = RECONNECT_BASE_MS;
      stopPolling();
      set('state', 'live');
      touch();
    };
    es.onerror = () => {
      // The browser retries automatically while readyState is CONNECTING; when it
      // gives up (CLOSED, e.g. 503 above the client cap) we back off ourselves.
      startPolling();
      if (es && es.readyState === EventSource.CLOSED) {
        es.close();
        es = null;
        scheduleReconnect();
      }
    };
    es.addEventListener('block', (ev) => {
      touch();
      pushBlock(JSON.parse((ev as MessageEvent).data) as BlockSummary);
    });
    es.addEventListener('tx', (ev) => {
      touch();
      pushTx(JSON.parse((ev as MessageEvent).data) as TxSummary);
    });
    es.addEventListener('stats', (ev) => {
      touch();
      applyHead(JSON.parse((ev as MessageEvent).data) as ChainInfo);
    });
    es.addEventListener('epoch', (ev) => {
      touch();
      set('events', 'epoch', JSON.parse((ev as MessageEvent).data) as Epoch);
    });
    es.addEventListener('founder_payout', (ev) => {
      touch();
      set('events', 'founder_payout', JSON.parse((ev as MessageEvent).data) as Transfer);
    });
    es.addEventListener('proposal', (ev) => {
      touch();
      set('events', 'proposal', JSON.parse((ev as MessageEvent).data) as Proposal);
    });
    es.addEventListener('heartbeat', () => touch());
  }

  // Stale detection: a silent stream is not "live" — say so and poll.
  staleTimer = setInterval(() => {
    const last = store.lastEventAt;
    if (store.state === 'live' && last && Date.now() - last > STALE_MS) {
      startPolling();
      es?.close();
      es = null;
      scheduleReconnect();
    }
  }, 5_000);

  void bootstrap().then(connect);

  onCleanup(() => {
    clearInterval(clock);
    if (staleTimer) clearInterval(staleTimer);
    stopPolling();
    if (reconnectTimer) clearTimeout(reconnectTimer);
    es?.close();
  });

  return { store, now, refresh: poll };
}

let instance: ReturnType<typeof createLive> | null = null;

/** Singleton live store shared by every route. Created lazily on first use. */
export function useLive() {
  if (!instance) instance = createRoot(() => createLive());
  return instance;
}

/** Test hook: reset the singleton. */
export function __resetLive() {
  instance = null;
}
