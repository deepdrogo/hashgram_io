# hashgram.io — the website

Hashgram One product guide, live explorer, network dashboard and documentation
for Hashgram Mainnet (`hashgram-1`). The `/one` route explains the implemented
Mail/Drive/People/Feed/Spaces platform and its honest release status. Explorer
functions remain read-only: every number comes from `hashgram-indexer` on the
same host, reading only from this host's own full node.

- Stack: **SolidJS 1.9 + TypeScript + Vite 8 + @solidjs/router**, Tailwind v4
  with a seven-value monochrome palette, Lucide icons, d3 primitives for
  charts, MiniSearch for docs search. Static SPA — no server runtime; Caddy
  serves `dist/` and proxies `/api/*` to the indexer.
- Design: dark only, exactly `#000000 #0D0D0D #1A1A1A #262626 #404040 #808080
  #FFFFFF`. Enforced three ways: Stylelint (`color-no-hex` outside the theme
  block), `scripts/check-palette.mjs` (static allow-list over every source and
  brand file) and `tests/e2e/colour.spec.ts` (samples every rendered pixel of
  every route).
- Live: `EventSource('/api/v1/live')` with reconnect + stale detection; falls
  back to polling `/api/v1/chain` every 6 s and *says so* (header dot, /status).
- Genesis pin: `src/lib/genesis.ts` hardcodes the Mainnet genesis SHA-256; a
  mismatch with `/api/v1/chain.genesis_hash` shows a banner and disables the
  explorer. Nothing else about the network is hardcoded — no IPs, node ids or
  peer ids.

## Layout

```
web/
  index.html                 shell (meta, preload, noscript)
  src/index.tsx              router — every route, incl. short links
  src/app.css                theme tokens + component classes
  src/lib/                   api client (typed from openapi.yaml), format (BigInt),
                             live store (SSE), genesis pin, query helpers
  src/components/            Layout, Search, values (Hash/Amount/TimeAgo), charts, ui
  src/routes/                one file per page
  src/generated/             api.d.ts (openapi-typescript), docs-index.json
  content/                   web-native product, node, explorer, API, FAQ and glossary docs
  scripts/                   build-docs, build-brand, build-og, check-palette
  brand/README.md            brand rules (shipped inside the kit)
  public/brand/              generated logo kit (do not edit by hand)
  public/og/                 generated Open Graph images
  public/docs-content/       generated per-page docs JSON
  tests/unit/                Vitest
  tests/e2e/                 Playwright (colour, a11y, live, short links)
  tests/mock-api.mjs         deterministic API mock for tests / offline dev
  lighthouserc.cjs           Lighthouse CI budgets
```

## Environment variables

| Variable               | Where        | Default   | Meaning                                                              |
| ---------------------- | ------------ | --------- | -------------------------------------------------------------------- |
| `VITE_API_BASE`        | build        | `/api`    | Base URL the browser calls; `/v1` is appended. Keep same-origin.     |
| `INDEXER_URL`          | dev/preview  | `http://127.0.0.1:1318` | Where Vite's dev proxy forwards `/api/*` (prefix stripped). |
| `DOCS_DIR`             | build        | `../docs` | Repository docs directory rendered under `/docs`.                    |
| `E2E_BASE_URL`         | test         | —         | Run Playwright against a real deployment instead of preview + mock.  |
| `MOCK_PORT`            | test         | `1319`    | Port for the mock API during Playwright runs.                        |
| `LHCI_URL`             | test         | —         | Lighthouse CI against a real deployment.                             |

There are no runtime environment variables: the output is static files.

## Local development against the local indexer

```bash
cd web
pnpm install
pnpm gen:api            # regenerate src/generated/api.d.ts from ../indexer/openapi.yaml
pnpm build:docs         # render ../docs + content/ (needs the repo checkout)
pnpm build:brand        # regenerate public/brand/*
pnpm dev                # http://127.0.0.1:5173 — /api/* → 127.0.0.1:1318
```

Without a node (laptop, CI):

```bash
node tests/mock-api.mjs &                 # mock indexer on :1318
pnpm dev
```

The mock reproduces every route in `indexer/openapi.yaml`, streams a block over
SSE every 4 s and uses Mainnet's genesis facts (reserve, founder allocation,
first validator, proposal #1).

## Quality gates

```bash
pnpm lint       # tsc -b, stylelint, palette allow-list
pnpm test       # Vitest (format/BigInt, emission projection, genesis pin)
pnpm test:e2e   # Playwright: colour (every pixel, every route, dark + light OS scheme),
                #             axe WCAG 2.2 AA, live prepend ≤ 5 s, genesis mismatch,
                #             SSE-down honesty, short links, key facts on /accounts /founder /rewards
pnpm lhci       # Lighthouse: performance ≥ 95, a11y 100, best practices 100, SEO 100, CLS ≤ 0.02
pnpm build      # prebuild: docs + brand + og → tsc → vite build → dist/
```

Playwright needs Chromium once: `npx playwright install --with-deps chromium`.
Lighthouse needs `CHROME_PATH` pointing at a Chrome/Chromium binary (the
Playwright one works) and the mock on :1319 (`PORT=1319 node tests/mock-api.mjs`).

## Short links (deep links from apps)

`hashgram.io/<64-hex tx hash>` opens the transaction; `/<height>`, `/hash1…`,
`/hashvaloper1…`, `/@username` and `/12D3Koo…` resolve likewise (`src/routes/Resolve.tsx`
→ `/api/v1/search`). Canonical routes are `/txs/<hash>`, `/blocks/<height>`,
`/accounts/<addr>`, `/validators/<operator>`, `/governance/<id>`.

## Deployment (this host)

Caddy serves `dist/` from `/var/www/hashgram-io` and proxies `/api/*` to the
indexer. Everything is done by one idempotent script, run from the repository
root as root after the node and indexer are up:

```bash
sudo scripts/install/install-hashgram-io.sh
```

It builds `web/`, syncs and precompresses `dist/`, installs a Caddy build with
the needed modules, installs `deploy/caddy/Caddyfile` and
`deploy/systemd/caddy.service`, opens **only** 80/443 in ufw, enables the
units and runs `hashgramctl mainnet-preflight` (failing if it fails).
It also writes `/deployment.json` with the exact deployed commit.

### Automatic deployment

`.github/workflows/deploy.yml` runs after a successful `main` CI workflow
(and supports a manual dispatch). It fast-forwards the clean production
checkout to the tested commit, runs the same installer through SSH, then
requires `https://hashgram.io/deployment.json` to report that exact SHA.

Configure the GitHub `production` environment with:

| Name | Kind | Meaning |
| --- | --- | --- |
| `DEPLOY_HOST` | secret | Explorer VPS hostname or IP |
| `DEPLOY_USER` | secret | SSH user with passwordless sudo for the installer |
| `DEPLOY_SSH_KEY` | secret | Dedicated private deployment key |
| `DEPLOY_KNOWN_HOSTS` | secret | Pinned `known_hosts` line for the VPS |
| `DEPLOY_PORT` | variable, optional | SSH port; defaults to `22` |
| `DEPLOY_PATH` | variable, optional | Clean `hashgram_io` checkout; defaults to `/home/hashgram_io` |

Until these are configured, deploy manually on the VPS:

```bash
cd /home/hashgram_io
git pull --ff-only origin main
sudo ./scripts/install/install-hashgram-io.sh
curl -fsS https://hashgram.io/deployment.json
```

The returned `commit` must equal `git rev-parse HEAD`. A repository push by
itself does not publish this static site.

### Cloudflare

`hashgram.io` is proxied through Cloudflare (orange cloud). Required zone
settings:

- **SSL/TLS → Full (strict)**. Caddy holds a real Let's Encrypt certificate.
- If **Always Use HTTPS** is on, HTTP-01 cannot complete at the edge: put a
  Cloudflare API token (Zone:DNS:Edit for this zone only) in
  `/etc/hashgram/caddy.env` as `CF_API_TOKEN=…` and re-run the installer —
  Caddy switches to DNS-01.
- Turn **off** Rocket Loader, Auto Minify, Email Address Obfuscation and
  Mirage: they inject third-party scripts / rewrite HTML and break the CSP and
  SSE.
- Cloudflare closes idle connections after 100 s; the API sends a heartbeat
  every 15 s so `/api/v1/live` stays open.
- HTTP/3 is terminated at Cloudflare; the origin speaks HTTP/2 to Cloudflare.
- Rate limiting and the `/24` access logs use `CF-Connecting-IP` only when the
  request comes from Cloudflare's published ranges (`trusted_proxies cloudflare`).
- Only Vite's content-hashed `/assets/*` files are cached as immutable.
  Stable-name docs, OG and brand outputs revalidate on every request; HTML is
  `no-cache` and `/deployment.json` is `no-store`. There is no service worker.

DNS: `hashgram.io` A → this VPS's IPv4 (and AAAA if you want), `www` CNAME →
`hashgram.io`. The genesis server is not involved anywhere.

### What is backed up

Nothing on this host needs backing up. The chain data and the indexer database
are rebuilt from the network (`hashgramctl join-mainnet`, `hashgram-indexer
rebuild`). The site content and the Caddy configuration live in git. The only
local secrets are the ACME account in `/var/lib/caddy` (re-issued automatically)
and the optional `CF_API_TOKEN` in `/etc/hashgram/caddy.env`.

## Full rebuild of the explorer VPS from scratch

Expected total time: **≈ 45–90 minutes** on a 4 vCPU / 8 GB / NVMe host, most of
it waiting for the node to sync and the indexer to backfill (both scale with
chain height).

1. **Provision** — Ubuntu Server 24.04, ≥ 4 vCPU, 8 GB RAM, ≥ 200 GB NVMe,
   public IPv4. Point DNS `hashgram.io` (A) and `www` (CNAME) at it in
   Cloudflare. *(5 min)*
2. **Clone and bootstrap** — as root, in the repository clone:
   `sudo scripts/install/bootstrap-ubuntu.sh` → users, directories, ufw (22,
   26656, 26670), PostgreSQL on loopback, all binaries, systemd units,
   `/etc/hashgram/indexer.toml`. *(5–10 min)*
3. **Join Mainnet** — `hashgramctl init --moniker hashgram-io`,
   `hashgramctl join-mainnet` (no arguments), `hashgramctl network-info`
   (pin `e322bc23…5e4d`), `hashgramctl configure-role indexer`,
   `hashgramctl start`. Wait for `hashgramctl chain-status` to report
   `catching_up = false` and peers > 0. *(10–40 min depending on height)*
4. **Indexer** — `systemctl enable --now hashgram-indexer`; watch
   `curl -s 127.0.0.1:1318/v1/health` until `lag_blocks` is small.
   *(runs in the background; backfill ≈ 300–500 blocks/s)*
5. **Publish** — `sudo scripts/install/install-hashgram-io.sh`. Installs
   Node 22 + pnpm, builds the site, installs Caddy, opens 80/443, enables
   units, runs `hashgramctl mainnet-preflight`. *(5 min)*
6. **Verify** — `https://hashgram.io/status` shows *synced*, *Live*, lag 0;
   `ss -ltn` shows only 22, 80, 443, 26656, 26670 on non-loopback addresses;
   grepping `web/` and `indexer/` for the genesis server's IP address returns nothing.

Never copy `priv_validator_key.json` or `node_key.json` from another machine;
this node is not a validator and its keys are disposable.
