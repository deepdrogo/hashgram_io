# API

Everything on this site comes from one read-only JSON API served by this
server's own indexer, behind Caddy at `https://hashgram.io/api/v1/…`.

- Interactive reference: <a href="/api/v1/docs" target="_blank" rel="noopener">/api/v1/docs</a>
- OpenAPI 3.1 document: <a href="/api/v1/openapi.yaml" target="_blank" rel="noopener">/api/v1/openapi.yaml</a>
- Live stream (Server-Sent Events): `/api/v1/live`

<div class="api-embed" data-src="/api/v1/docs"></div>

## Conventions

- **Amounts** are `uhash` integers as decimal **strings** (`"1000000"` =
  1 HASH). Parse with `BigInt`, never with floating point.
- **Lists** take `?limit=` (max 100) and an opaque `?cursor=`; responses carry
  `next_cursor` (`null` at the end).
- **Times** are RFC 3339 UTC.
- **Rate limit**: 300 requests / minute / IP, 30 SSE connections per minute and 10 concurrent SSE connections /
  IP, request bodies over 1 KB are rejected. Responses carry `Cache-Control`
  according to how fast the data changes.
- No authentication, no write endpoints, no wallet operations.

## Short links

Any client — including the Windows app — can deep-link into the explorer by
appending an identifier to the site root; the site resolves it and redirects:

| URL                                   | Opens                    |
| ------------------------------------- | ------------------------ |
| `hashgram.io/<64-hex transaction hash>` | the transaction        |
| `hashgram.io/<height>`                | the block                |
| `hashgram.io/hash1…`                  | the account              |
| `hashgram.io/hashvaloper1…`           | the validator            |
| `hashgram.io/@username`               | the username's account   |
| `hashgram.io/12D3Koo…`                | the peer on /network     |

Canonical routes are `/txs/<hash>`, `/blocks/<height>`, `/accounts/<addr>`,
`/validators/<operator>`, `/governance/<id>`. The same resolution is available
as JSON at `/api/v1/search?q=…`.

## Live events

```js
const es = new EventSource('https://hashgram.io/api/v1/live');
es.addEventListener('block', (e) => console.log(JSON.parse(e.data)));
es.addEventListener('tx', (e) => console.log(JSON.parse(e.data)));
es.addEventListener('stats', (e) => console.log(JSON.parse(e.data))); // every 10 s
// also: epoch, founder_payout, proposal, heartbeat (every 15 s)
```

When more than 2,000 clients are connected the endpoint answers `503` with
`Retry-After`; poll `/api/v1/chain` every few seconds instead.

## Source

The indexer that serves this API is `indexer/` in the
[official repository](https://github.com/deepdrogo/hashgram); the contract is
`indexer/openapi.yaml` and the site is `web/`.

## Independence

The API reads only from the node on `127.0.0.1`. It never contacts the genesis
server or any remote RPC, and nothing about any specific machine (IP, node id,
peer id) is hardcoded. The genesis hash it reports comes from the pin file in
`/etc/hashgram`, not from RPC `/genesis` (which CometBFT re-serialises).
