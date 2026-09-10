#!/usr/bin/env node
/**
 * Deterministic mock of the read API (same routes and shapes as
 * indexer/openapi.yaml) for Playwright, Lighthouse and offline development.
 * Numbers mirror Hashgram Mainnet's genesis facts so pages look real.
 *
 *   node tests/mock-api.mjs            # listens on 127.0.0.1:1318 (override with PORT)
 *   INDEXER_URL=http://127.0.0.1:1318 pnpm dev
 */
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';

const PORT = Number(process.env.PORT ?? 1318);
const GENESIS = process.env.MOCK_GENESIS ?? 'e322bc2319f6e0173286fa526dab5a8ff8ad0797c7b80dd03e7c9d98621d5e4d';
const GENESIS_TIME = Date.parse('2026-09-10T13:05:25Z');
const BLOCK_MS = 4000;
const START_HEIGHT = Math.floor((Date.now() - GENESIS_TIME) / BLOCK_MS);
const T0 = Date.now();
const height = () => START_HEIGHT + Math.floor((Date.now() - T0) / BLOCK_MS);
const timeAt = (h) => new Date(GENESIS_TIME + h * BLOCK_MS).toISOString();
const hex = (s, n = 64) => createHash('sha256').update(String(s)).digest('hex').slice(0, n).toUpperCase();

const FOUNDER = 'hash13t8v5nnghrvgcuuqcrt9k5wyhtqwq7fl3ynjpy';
const FOUNDER_MODULE = 'hash1t9zc2z9qsf707huqa5y3a0vgpra7vlyhyvdeeh';
const VAL1 = 'hashvaloper127zemcfnxd3jrldpjzzgcckek4dswyw0l7rfcq';
const VALIDATORS = [
  { operator: VAL1, moniker: 'genesis-one', cons: 'hashvalcons1' + 'a'.repeat(38), tokens: 60_000_000n },
  { operator: 'hashvaloper1' + 'q2w3e4r5t6y7u8i9o0p1a2s3d4f5g6h7j8k9l0', moniker: 'north-star', cons: 'hashvalcons1' + 'b'.repeat(38), tokens: 12_500_000n },
  { operator: 'hashvaloper1' + 'z9x8c7v6b5n4m3l2k1j0h9g8f7d6s5a4p3o2i1', moniker: 'relay-house', cons: 'hashvalcons1' + 'c'.repeat(38), tokens: 8_000_000n },
  { operator: 'hashvaloper1' + 'm1n2b3v4c5x6z7l8k9j0h1g2f3d4s5a6p7o8i9', moniker: 'quiet-signal', cons: 'hashvalcons1' + 'd'.repeat(38), tokens: 4_250_000n },
];
const U = 1_000_000n;
const totalBonded = VALIDATORS.reduce((a, v) => a + v.tokens, 0n) * U;
const SUPPLY = 1_000_000_000n * U;
const RESERVE = 500_000_000n * U;
const vref = (v) => ({ operator: v.operator, moniker: v.moniker, consensus_address: v.cons });
const proposerAt = (h) => VALIDATORS[h % VALIDATORS.length];

const TYPES = ['Send', 'Delegate', 'Vote', 'RegisterUsername', 'SubmitReceipt', 'WithdrawDelegatorReward', 'RegisterProvider', 'ClaimFounderRevenue'];
const addrAt = (i) => 'hash1' + hex(`addr${i}`, 38).toLowerCase().replace(/[1bio]/g, 'q');
const txCountAt = (h) => (h % 7 === 0 ? 3 : h % 3 === 0 ? 1 : 0);
const txHash = (h, i) => hex(`tx${h}-${i}`);

function txSummary(h, i) {
  const type = TYPES[(h + i) % TYPES.length];
  const ok = (h + i) % 11 !== 0;
  const amt = ((h * 7919 + i * 104729) % 5000) + 1;
  return {
    hash: txHash(h, i),
    height: h,
    time: timeAt(h),
    success: ok,
    code: ok ? 0 : 5,
    type,
    types: [type],
    msg_count: 1,
    fee_uhash: '2500',
    gas_used: 78_000 + i * 1000,
    gas_wanted: 120_000,
    signer: addrAt(h + i),
    summary: type === 'Send' ? `Send ${amt} HASH` : type === 'Delegate' ? `Delegate ${amt} HASH to ${proposerAt(h).moniker}` : type,
  };
}
function blockSummary(h) {
  const missing = h % 97 === 0 ? 1 : 0;
  return {
    height: h,
    hash: hex(`block${h}`),
    time: timeAt(h),
    proposer: vref(proposerAt(h)),
    tx_count: txCountAt(h),
    size_bytes: 1200 + txCountAt(h) * 640,
    gas_used: txCountAt(h) * 80_000,
    gas_wanted: txCountAt(h) * 120_000,
    signatures: { present: VALIDATORS.length - missing, missing, total: VALIDATORS.length },
  };
}
function blockDetail(h) {
  const b = blockSummary(h);
  return {
    ...b,
    app_hash: hex(`app${h}`),
    last_block_hash: hex(`block${h - 1}`),
    data_hash: hex(`data${h}`),
    validators_hash: hex('valset'),
    block_time_ms: BLOCK_MS,
    txs: Array.from({ length: b.tx_count }, (_, i) => txSummary(h, i)),
    events_summary: { transfers: b.tx_count, delegations: h % 3 === 0 ? 1 : 0, founder_payouts: h % 7200 === 0 ? 1 : 0, service_receipts: 0, other: 2 },
    signature_list: VALIDATORS.map((v, i) => ({ validator: vref(v), signed: !(b.signatures.missing && i === VALIDATORS.length - 1), timestamp: timeAt(h) })),
    raw: { header: { height: String(h), chain_id: 'hashgram-1' } },
  };
}
function txDetail(hash) {
  // find by scanning recent heights (mock only)
  const H = height();
  for (let h = H; h > Math.max(1, H - 50_000); h--) {
    for (let i = 0; i < txCountAt(h); i++) if (txHash(h, i) === hash) return txDetailAt(h, i);
  }
  return null;
}
function txDetailAt(h, i) {
  const s = txSummary(h, i);
  const fee = 2500n;
  const founder = fee / 100n;
  const service = fee / 10n;
  return {
    ...s,
    messages: [
      s.type === 'Send'
        ? { type: 'Send', type_url: '/cosmos.bank.v1beta1.MsgSend', value: { from_address: s.signer, to_address: addrAt(h * 3 + i), amount: [{ denom: 'uhash', amount: '12500000' }] } }
        : { type: s.type, type_url: `/hashgram.${s.type.toLowerCase()}.v1.Msg${s.type}`, value: { operator: s.signer, note: 'mock' } },
    ],
    fee: { total_uhash: fee.toString(), validators_uhash: (fee - founder - service).toString(), founder_uhash: founder.toString(), service_uhash: service.toString(), founder_bps: 100, denom: 'uhash' },
    events: [{ type: 'transfer', msg_index: 0, attributes: [{ key: 'sender', value: s.signer }, { key: 'recipient', value: addrAt(h * 3 + i) }, { key: 'amount', value: '12500000uhash' }] }],
    signers: [s.signer],
    raw_log: s.success ? undefined : 'insufficient funds: spendable balance 0uhash is smaller than 12500000uhash',
    raw: { tx: { body: { memo: '' } } },
  };
}

const vesting = () => {
  const periods = Array.from({ length: 96 }, () => ({ length_seconds: 2_629_746, amount_uhash: (1_875_000n * U).toString(), end_time: '', released: false }));
  let t = GENESIS_TIME;
  for (const p of periods) {
    t += p.length_seconds * 1000;
    p.end_time = new Date(t).toISOString();
    p.released = t < Date.now();
  }
  const vested = periods.filter((p) => p.released).length;
  return {
    type: '/cosmos.vesting.v1beta1.PeriodicVestingAccount',
    original_uhash: (180_000_000n * U).toString(),
    vested_uhash: (BigInt(vested) * 1_875_000n * U).toString(),
    vesting_uhash: (BigInt(96 - vested) * 1_875_000n * U).toString(),
    start_time: new Date(GENESIS_TIME).toISOString(),
    end_time: periods[95].end_time,
    periods,
  };
};

const chain = () => {
  const H = height();
  return {
    chain_id: 'hashgram-1',
    network_id: 'hashgram-1',
    genesis_hash: GENESIS,
    genesis_time: new Date(GENESIS_TIME).toISOString(),
    height: H,
    latest_block_hash: hex(`block${H}`),
    latest_block_time: timeAt(H),
    avg_block_time_ms: BLOCK_MS,
    node_version: '0.38.17',
    app_version: '1.0.0',
    cometbft_version: '0.38.17',
    validators: { active: VALIDATORS.length, total: VALIDATORS.length, max: 100 },
    bonded_uhash: totalBonded.toString(),
    total_supply_uhash: SUPPLY.toString(),
    circulating_uhash: (SUPPLY - RESERVE - 180_000_000n * U - 120_000_000n * U).toString(),
    total_txs: Math.floor(H * 0.6),
    total_accounts: 1_284 + Math.floor(H / 500),
    providers: 3,
    consensus_peers: 7,
    p2p_peers: 19,
    indexed_height: H,
    epoch: { number: Math.floor(H / 21_600), start_height: Math.floor(H / 21_600) * 21_600, end_height: (Math.floor(H / 21_600) + 1) * 21_600, blocks_left: 21_600 - (H % 21_600), budget_uhash: (250_000n * U).toString(), provider_cap_uhash: (12_500n * U).toString(), providers_active: 3, estimated_end_time: timeAt((Math.floor(H / 21_600) + 1) * 21_600) },
    founder_accrued_uhash: String(BigInt(Math.floor(H * 0.6)) * 25n),
  };
};

const TOP = () => {
  const items = [
    { address: 'hash1' + 'serviceproof'.padEnd(38, 'q'), label: 'Useful-service reserve', kind: 'module', balance: RESERVE, spendable: RESERVE },
    { address: FOUNDER, label: 'Founder (vesting)', kind: 'vesting', balance: 199_000_000n * U - 60_000_000n * U, spendable: 19_000_000n * U },
    { address: 'hash1' + 'treasury'.padEnd(38, 'q'), label: 'Treasury', kind: 'module', balance: 60_000_000n * U, spendable: 60_000_000n * U },
    { address: 'hash1' + 'growth'.padEnd(38, 'q'), label: 'Growth', kind: 'module', balance: 30_000_000n * U, spendable: 30_000_000n * U },
    { address: 'hash1' + 'devgrants'.padEnd(38, 'q'), label: 'Developer grants', kind: 'module', balance: 20_000_000n * U, spendable: 20_000_000n * U },
    { address: 'hash1' + 'liquidity'.padEnd(38, 'q'), label: 'Liquidity', kind: 'module', balance: 10_000_000n * U, spendable: 10_000_000n * U },
    { address: FOUNDER_MODULE, label: 'Founder revenue (module)', kind: 'module', balance: 1234n * U, spendable: 1234n * U },
    ...Array.from({ length: 20 }, (_, i) => ({ address: addrAt(i), label: undefined, kind: i % 5 === 0 ? 'validator_operator' : 'user', balance: BigInt(5_000_000 - i * 200_000) * U, spendable: BigInt(5_000_000 - i * 200_000) * U })),
  ];
  return items.map((a, i) => ({ rank: i + 1, address: a.address, label: a.label, kind: a.kind, balance_uhash: a.balance.toString(), spendable_uhash: a.spendable.toString(), share_ppm: Number((a.balance * 1_000_000n) / SUPPLY), tx_count: 12 + i }));
};

const validators = () =>
  VALIDATORS.map((v, i) => ({
    operator: v.operator,
    consensus_address: v.cons,
    consensus_pubkey: hex(v.moniker, 44),
    moniker: v.moniker,
    website: i === 0 ? 'https://hashgram.io' : '',
    details: '',
    identity: '',
    tokens_uhash: (v.tokens * U).toString(),
    delegator_shares: (v.tokens * U).toString() + '.000000000000000000',
    voting_power_pct: Number((v.tokens * U * 10_000n) / totalBonded) / 100,
    rank: i + 1,
    commission_rate: '0.050000000000000000',
    commission_max_rate: '0.200000000000000000',
    commission_max_change_rate: '0.010000000000000000',
    status: 'BOND_STATUS_BONDED',
    jailed: false,
    uptime_pct: 100 - i * 0.03,
    missed_blocks: i * 9,
    signed_blocks_window: 30_000,
    delegator_count: 3 + i * 7,
    self_delegation_uhash: (1_000_000n * U).toString(),
    min_self_delegation: '1000000',
  }));

const network = () => ({
  consensus: {
    node_id: hex('self', 40).toLowerCase(),
    moniker: 'hashgram-io',
    listening: true,
    peer_count: 7,
    peers: Array.from({ length: 7 }, (_, i) => ({ id: hex(`peer${i}`, 40).toLowerCase(), moniker: `node-${i}`, version: '0.38.17', ip_prefix: `203.0.${i}.0/24`, outbound: i % 2 === 0, first_seen: timeAt(height() - 5000 - i * 100), last_seen: timeAt(height()), connected: true })),
  },
  p2p: {
    peer_id: '12D3KooW' + hex('selfp2p', 44),
    peer_count: 19,
    roles: ['indexer'],
    peers: Array.from({ length: 19 }, (_, i) => ({ id: '12D3KooW' + hex(`p2p${i}`, 44), version: 'hashgram-node/1.0.0', roles: i % 3 === 0 ? ['storage'] : i % 3 === 1 ? ['relay'] : ['media', 'relay'], ip_prefix: `198.51.${i}.0/24`, first_seen: timeAt(height() - 8000 - i * 50), last_seen: timeAt(height()), connected: true })),
    status: {},
  },
  seeds: { cometbft: ['seed-1.mainnet.hashgram.example:26656', 'seed-2.mainnet.hashgram.example:26656'], libp2p: ['/dnsaddr/seed-1.mainnet.hashgram.example/p2p/12D3KooWExampleSeedOne', '/dnsaddr/seed-2.mainnet.hashgram.example/p2p/12D3KooWExampleSeedTwo'] },
  info: { network_id: 'hashgram-1', magic: 'HGM1', protocol_major: 1, genesis_hash: GENESIS },
  fork_isolation: { enabled: true, magic: 'HGM1', protocol_major: 1, genesis_hash: GENESIS, refused_handshakes_24h: 0 },
  versions: [{ version: '0.38.17', count: 7, layer: 'consensus' }, { version: 'hashgram-node/1.0.0', count: 19, layer: 'p2p' }],
  seen_24h: { consensus_peers: 9, p2p_peers: 24, validators: VALIDATORS.length },
});

const proposals = () => {
  const H = height();
  const p = {
    id: 1,
    title: 'Enable the storage assigner',
    summary: 'Set serviceproof.assigner_enabled = true so storage assignments start being issued to bonded providers.',
    status: Date.now() < Date.parse('2026-09-17T13:05:25Z') ? 'PROPOSAL_STATUS_VOTING_PERIOD' : 'PROPOSAL_STATUS_PASSED',
    proposer: FOUNDER,
    submit_time: '2026-09-10T13:05:25Z',
    deposit_end_time: '2026-09-12T13:05:25Z',
    voting_start_time: '2026-09-10T13:05:25Z',
    voting_end_time: '2026-09-17T13:05:25Z',
    total_deposit_uhash: (10_000n * U).toString(),
    tally: { yes_uhash: (60_000_000n * U).toString(), no_uhash: '0', abstain_uhash: (4_250_000n * U).toString(), no_with_veto_uhash: '0', total_uhash: (64_250_000n * U).toString(), bonded_uhash: totalBonded.toString(), turnout_pct: Number((64_250_000n * U * 10_000n) / totalBonded) / 100, yes_pct: 93.4, no_pct: 0, abstain_pct: 6.6, no_with_veto_pct: 0, quorum_reached: true, passing: true },
    messages: [{ type: 'UpdateParams', type_url: '/hashgram.serviceproof.v1.MsgUpdateParams', value: { authority: 'hash1gov', params: { assigner_enabled: true, epoch_length: 21600 } }, diff: [{ key: 'assigner_enabled', current: false, proposed: true }] }],
    metadata: '',
    expedited: false,
  };
  const params = { quorum: '0.400000000000000000', threshold: '0.500000000000000000', veto_threshold: '0.334000000000000000', voting_period_seconds: 604_800, min_deposit_uhash: (10_000n * U).toString(), max_deposit_period_seconds: 172_800 };
  void H;
  return { items: [p], params };
};

function json(res, body, cache = 'no-store') {
  const s = JSON.stringify(body);
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache, 'Access-Control-Allow-Origin': '*' });
  res.end(s);
}
function notFound(res) {
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found' }));
}

const sseClients = new Set();
setInterval(() => {
  const H = height();
  const b = blockSummary(H);
  const payloads = [`event: block\ndata: ${JSON.stringify(b)}\n\n`];
  for (let i = 0; i < b.tx_count; i++) payloads.push(`event: tx\ndata: ${JSON.stringify(txSummary(H, i))}\n\n`);
  if (H % 3 === 0) payloads.push(`event: stats\ndata: ${JSON.stringify(chain())}\n\n`);
  for (const c of sseClients) for (const p of payloads) c.write(p);
}, BLOCK_MS);
setInterval(() => {
  for (const c of sseClients) c.write(`event: heartbeat\ndata: {}\n\n`);
}, 15_000);

const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname.replace(/^\/v1/, '');
  const limit = Math.min(100, Number(url.searchParams.get('limit') ?? 20));
  const cursor = url.searchParams.get('cursor');
  const H = height();

  if (p === '/live') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'Access-Control-Allow-Origin': '*' });
    res.write(`event: heartbeat\ndata: {}\n\n`);
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }
  if (p === '/health') return json(res, { status: 'ok', chain_height: H, indexed_height: H, lag_blocks: 0, node_catching_up: false, head_time: timeAt(H), head_age_seconds: (Date.now() - Date.parse(timeAt(H))) / 1000, live_clients: sseClients.size, live_source: 'websocket', db_ok: true, version: 'mock' });
  if (p === '/chain') return json(res, chain());
  if (p === '/stats') return json(res, chain());
  if (p === '/stats/history') {
    const items = Array.from({ length: 96 }, (_, i) => {
      const h = H - (95 - i) * 225;
      return { time: timeAt(h), height: h, total_txs: Math.floor(h * 0.6), total_accounts: 1_284 + Math.floor(h / 500), bonded_uhash: totalBonded.toString(), circulating_uhash: chain().circulating_uhash, validators: VALIDATORS.length, consensus_peers: 6 + (i % 3), p2p_peers: 17 + (i % 5), providers: 3, block_time_ms: BLOCK_MS + Math.sin(i / 5) * 200, founder_accrued_uhash: String(BigInt(Math.floor(h * 0.6)) * 25n), epoch: Math.floor(h / 21_600) };
    });
    return json(res, { items });
  }
  if (p === '/search') {
    const q = (url.searchParams.get('q') ?? '').trim();
    if (/^\d+$/.test(q)) return json(res, { type: 'block', id: q });
    if (/^[0-9a-f]{64}$/i.test(q)) return json(res, { type: 'tx', id: q.toUpperCase() });
    if (/^hashvaloper1/.test(q)) return json(res, { type: 'validator', id: q });
    if (/^hash1/.test(q)) return json(res, { type: 'account', id: q });
    if (q.startsWith('@')) return json(res, { type: 'username', id: FOUNDER, label: q });
    if (q.startsWith('12D3Koo')) return json(res, { type: 'peer', id: q });
    return json(res, { type: 'none', id: q });
  }
  if (p === '/blocks') {
    const start = cursor ? Number(cursor) : H;
    const items = Array.from({ length: Math.min(limit, start) }, (_, i) => blockSummary(start - i));
    return json(res, { items, next_cursor: start - limit > 0 ? String(start - limit) : null });
  }
  if (p === '/blocks/latest') return json(res, blockDetail(H));
  let m;
  if ((m = /^\/blocks\/(\d+)$/.exec(p))) {
    const h = Number(m[1]);
    return h >= 1 && h <= H ? json(res, blockDetail(h)) : notFound(res);
  }
  if (p === '/txs/types') return json(res, { items: TYPES.map((t, i) => ({ type: t, type_url: `/x.${t}`, count: 1000 - i * 90 })) });
  if (p === '/txs') {
    const type = url.searchParams.get('type');
    const items = [];
    let h = cursor ? Number(cursor) : H;
    while (items.length < limit && h > 0) {
      for (let i = 0; i < txCountAt(h) && items.length < limit; i++) {
        const t = txSummary(h, i);
        if (!type || t.type === type) items.push(t);
      }
      h--;
    }
    return json(res, { items, next_cursor: h > 0 ? String(h) : null });
  }
  if ((m = /^\/txs\/([0-9A-Fa-f]{64})$/.exec(p))) {
    const d = txDetail(m[1].toUpperCase());
    return d ? json(res, d) : notFound(res);
  }
  if (p === '/accounts/top') return json(res, { items: TOP().slice(0, limit), total_supply_uhash: SUPPLY.toString(), height: H, next_cursor: null });
  if (p === '/accounts/count') return json(res, { count: chain().total_accounts, height: H });
  if ((m = /^\/accounts\/(hash1[0-9a-z]+)\/transactions$/.exec(p))) return json(res, { items: Array.from({ length: 8 }, (_, i) => txSummary(H - i * 3, 0)), next_cursor: null });
  if ((m = /^\/accounts\/(hash1[0-9a-z]+)\/transfers$/.exec(p))) return json(res, { items: Array.from({ length: 6 }, (_, i) => ({ height: H - i * 5, time: timeAt(H - i * 5), tx_hash: txHash(H - i * 5, 0), from: i % 2 ? m[1] : addrAt(i), to: i % 2 ? addrAt(i) : m[1], amount_uhash: String((i + 1) * 1_250_000), kind: 'tx' })), next_cursor: null });
  if ((m = /^\/accounts\/(hash1[0-9a-z]+)$/.exec(p))) {
    const a = m[1];
    const top = TOP().find((t) => t.address === a);
    const isFounder = a === FOUNDER;
    return json(res, {
      address: a,
      label: top?.label,
      kind: top?.kind ?? 'user',
      account_type: isFounder ? '/cosmos.vesting.v1beta1.PeriodicVestingAccount' : '/cosmos.auth.v1beta1.BaseAccount',
      account_number: 7,
      sequence: 42,
      balance_uhash: top?.balance_uhash ?? (1234n * U).toString(),
      spendable_uhash: top?.spendable_uhash ?? (1234n * U).toString(),
      vesting: isFounder ? vesting() : null,
      delegations: isFounder ? [{ validator: vref(VALIDATORS[0]), balance_uhash: (60_000_000n * U).toString(), shares: '60000000000000', reward_uhash: '12345678' }] : [],
      total_delegated_uhash: isFounder ? (60_000_000n * U).toString() : '0',
      total_rewards_uhash: isFounder ? '12345678' : '0',
      username: isFounder ? 'founder' : null,
      provider: null,
      validator: null,
      tx_count: 12,
      first_seen: { height: 1, time: timeAt(1) },
      last_seen: { height: H - 3, time: timeAt(H - 3) },
      share_ppm: top?.share_ppm ?? 1,
    });
  }
  if (p === '/validators') return json(res, { items: validators(), height: H, signed_blocks_window: 30_000 });
  if ((m = /^\/validators\/(hashvaloper1[0-9a-z]+)$/.exec(p))) {
    const v = validators().find((x) => x.operator === m[1]);
    if (!v) return notFound(res);
    return json(res, { ...v, delegations: [{ delegator: FOUNDER, label: 'Founder (vesting)', balance_uhash: (60_000_000n * U).toString() }, { delegator: addrAt(1), balance_uhash: (250_000n * U).toString() }], proposed_blocks: Array.from({ length: 50 }, (_, i) => blockSummary(H - i * VALIDATORS.length - (H % VALIDATORS.length) + VALIDATORS.indexOf(VALIDATORS.find((x) => x.operator === v.operator)))).filter((b) => b.height > 0), signing_history: Array.from({ length: 200 }, (_, i) => ({ height: H - 199 + i, signed: (H - 199 + i) % 97 !== 0 })), proposed_count: Math.floor(H / VALIDATORS.length) });
  }
  if (p === '/staking') return json(res, { bonded_uhash: totalBonded.toString(), not_bonded_uhash: (SUPPLY - totalBonded).toString(), total_supply_uhash: SUPPLY.toString(), bonded_ratio: Number((totalBonded * 10_000n) / SUPPLY) / 10_000, validators: { active: VALIDATORS.length, total: VALIDATORS.length, jailed: 0 }, params: { unbonding_time_seconds: 1_814_400, max_validators: 100, max_entries: 7, historical_entries: 10_000, bond_denom: 'uhash', min_commission_rate: '0.050000000000000000' }, slashing: { signed_blocks_window: 30_000, min_signed_per_window: '0.050000000000000000', downtime_jail_duration_seconds: 600, slash_fraction_double_sign: '0.050000000000000000', slash_fraction_downtime: '0.000100000000000000' } });
  if (p === '/rewards/params') return json(res, { epoch_length_blocks: 21_600, emission_bps: 5, epoch_cap_uhash: (250_000n * U).toString(), provider_bond_uhash: (1_000n * U).toString(), provider_cap_bps: 500, fraud_slash_bps: 500, jail_duration_blocks: 21_600, credit_rates: { storage_per_gib_epoch: 100, relay_per_gib: 200, retrieval_per_gib: 150, calls_per_hour: 300 }, raw: {} });
  if (p === '/rewards/reserve') {
    const remaining = RESERVE - 137_500n * U;
    const proj = (n) => {
      let r = remaining, sum = 0n;
      for (let i = 0; i < n; i++) { let b = (r * 5n) / 10_000n; if (b > 250_000n * U) b = 250_000n * U; sum += b; r -= b; }
      return sum.toString();
    };
    return json(res, { initial_uhash: RESERVE.toString(), remaining_uhash: remaining.toString(), paid_total_uhash: (137_500n * U).toString(), current_budget_uhash: (250_000n * U).toString(), provider_cap_uhash: (12_500n * U).toString(), projections: { epochs_30_uhash: proj(30), epochs_365_uhash: proj(365), epochs_3650_uhash: proj(3650) }, schedule: [], chain_schedule: {} });
  }
  if (p === '/rewards/epochs') {
    const cur = chain().epoch;
    const items = Array.from({ length: Math.min(limit, cur.number) }, (_, i) => { const n = cur.number - 1 - i; return { number: n, start_height: n * 21_600, end_height: (n + 1) * 21_600, end_time: timeAt((n + 1) * 21_600), budget_uhash: (250_000n * U).toString(), paid_uhash: (137_500n * U / BigInt(Math.max(1, cur.number))).toString(), providers_paid: 3, closed: true }; });
    return json(res, { items, current: cur, next_cursor: null });
  }
  const providers = () => Array.from({ length: 3 }, (_, i) => ({ operator: addrAt(100 + i), moniker: ['store-a', 'relay-b', 'media-c'][i], roles: [['storage'], ['relay'], ['media', 'relay']][i], bond_uhash: (1_000n * U).toString(), declared_storage_bytes: String(2 ** 40 * (i + 1)), reward_address: addrAt(200 + i), jailed: false, fraud_score: i, current_epoch_credit: String(12_000 * (i + 1)), lifetime_paid_uhash: (BigInt(45_000 * (i + 1)) * U).toString(), registered_height: 120 + i, peer_id: '12D3KooW' + hex(`p2p${i}`, 44) }));
  if (p === '/rewards/providers') return json(res, { items: providers(), next_cursor: null });
  if ((m = /^\/rewards\/providers\/(hash1[0-9a-z]+)$/.exec(p))) {
    const pr = providers().find((x) => x.operator === m[1]);
    if (!pr) return notFound(res);
    return json(res, { ...pr, assignments: [{ object: hex('obj1', 32), size_bytes: 1_048_576, since_height: 500 }], challenges: { total: 120, passed: 118, failed: 2, pass_rate: 118 / 120, recent: [] }, fraud: {}, payouts: Array.from({ length: 3 }, (_, i) => ({ height: (i + 1) * 21_600, time: timeAt((i + 1) * 21_600), tx_hash: '', from: 'hash1' + 'serviceproof'.padEnd(38, 'q'), from_label: 'Useful-service reserve', to: pr.reward_address, amount_uhash: (15_000n * U).toString(), kind: 'service_reward' })), rewards_raw: {} });
  }
  if (p === '/rewards/welcome') return json(res, { enabled: false, reason: 'no attestor registered', params: { attestor: '' }, status: { attestor_registered: false }, tiers: [{ tier: 1, requirement: 'verified account', reward_uhash: (10n * U).toString() }, { tier: 2, requirement: '30 days active', reward_uhash: (25n * U).toString() }], claims: [], claims_total: 0 });
  if (p === '/founder') {
    const accrued = BigInt(chain().total_txs) * 25n;
    const paidCount = Math.floor(H / 7200);
    return json(res, { params: { fee_basis_points: 100, ceiling_basis_points: 100, beneficiary: FOUNDER, raw: {} }, revenue: { accrued_uhash: accrued.toString(), paid_uhash: ((accrued * 3n) / 4n).toString(), pending_uhash: (accrued / 4n).toString(), raw: {} }, beneficiary: FOUNDER, module_address: FOUNDER_MODULE, allocation_uhash: (200_000_000n * U).toString(), beneficiary_history: [{ address: FOUNDER, height: 0 }], vesting: vesting(), balance_uhash: (139_000_000n * U).toString(), spendable_uhash: (19_000_000n * U).toString(), delegations: [{ validator: vref(VALIDATORS[0]), balance_uhash: (60_000_000n * U).toString(), shares: '60000000000000', reward_uhash: '12345678' }], total_delegated_uhash: (60_000_000n * U).toString(), voting_power_pct: Number((60_000_000n * U * 10_000n) / totalBonded) / 100, payout_interval_blocks: 7200, next_payout_height: (paidCount + 1) * 7200, payouts: Array.from({ length: paidCount }, (_, i) => ({ height: (i + 1) * 7200, time: timeAt((i + 1) * 7200), tx_hash: '', from: FOUNDER_MODULE, from_label: 'Founder revenue (module)', to: FOUNDER, to_label: 'Founder (vesting)', amount_uhash: '108000', kind: 'founder_payout' })).reverse() });
  }
  if (p === '/fees') { const total = BigInt(chain().total_txs) * 2500n; return json(res, { params: { founder_bps: 100, service_bps: 1000 }, totals: { total_uhash: total.toString() }, service_revenue: { total_uhash: (total / 10n).toString() }, summary: { total_fees_uhash: total.toString(), to_validators_uhash: (total - total / 100n - total / 10n).toString(), to_founder_uhash: (total / 100n).toString(), to_service_uhash: (total / 10n).toString(), founder_bps: 100 } }); }
  if (p === '/treasury') return json(res, { reserves: [{ name: 'treasury', label: 'Treasury', address: 'hash1' + 'treasury'.padEnd(38, 'q'), balance_uhash: (60_000_000n * U).toString() }, { name: 'growth', label: 'Growth', address: 'hash1' + 'growth'.padEnd(38, 'q'), balance_uhash: (30_000_000n * U).toString() }, { name: 'dev_grants', label: 'Developer grants', address: 'hash1' + 'devgrants'.padEnd(38, 'q'), balance_uhash: (20_000_000n * U).toString() }, { name: 'liquidity', label: 'Liquidity', address: 'hash1' + 'liquidity'.padEnd(38, 'q'), balance_uhash: (10_000_000n * U).toString() }], total_uhash: (120_000_000n * U).toString(), disbursements: [] });
  if (p === '/gov/proposals') return json(res, proposals());
  if ((m = /^\/gov\/proposals\/(\d+)$/.exec(p))) {
    const pr = proposals().items.find((x) => x.id === Number(m[1]));
    if (!pr) return notFound(res);
    return json(res, { ...pr, votes: [{ voter: FOUNDER, label: 'Founder (vesting)', options: [{ option: 'VOTE_OPTION_YES', weight: '1.000000000000000000' }], height: 20, tx_hash: txHash(20, 0) }], deposits: [{ depositor: FOUNDER, amount_uhash: (10_000n * U).toString() }], timeline: [{ event: 'Submitted', time: pr.submit_time, done: true }, { event: 'Voting started', time: pr.voting_start_time, done: true }, { event: 'Voting ends', time: pr.voting_end_time, done: Date.now() > Date.parse(pr.voting_end_time) }], params: proposals().params });
  }
  if (p === '/network') return json(res, network());
  if (p === '/network/nodes') return json(res, { consensus_peers: 9, p2p_peers: 24, validators: VALIDATORS.length });
  if (p === '/openapi.yaml') { res.writeHead(200, { 'Content-Type': 'application/yaml' }); return res.end('openapi: 3.1.0\ninfo: {title: mock}\n'); }
  if (p === '/docs') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end('<!doctype html><html style="background:#000;color:#fff"><body><h1>API reference (mock)</h1></body></html>'); }
  return notFound(res);
});

server.listen(PORT, '127.0.0.1', () => console.log(`mock api on http://127.0.0.1:${PORT} (genesis ${GENESIS.slice(0, 8)}…)`));
