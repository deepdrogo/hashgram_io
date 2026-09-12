# Run a node

Four commands take a fresh Ubuntu 24.04 server to a synced Hashgram Mainnet
node. Nothing has to be copied from anyone: the genesis file, its hash and the
seed peers are compiled into the binaries.

## 1. Install

On a fresh Ubuntu Server 24.04 (2+ vCPU, 4+ GB RAM, 100+ GB SSD, public
IPv4), clone the repository and run the installer as root:

```bash
git clone https://github.com/deepdrogo/hashgram.git && cd hashgram
sudo scripts/install/bootstrap-ubuntu.sh
```

The installer needs `make`, a Go toolchain (1.26+) and, for the P2P node, a
Rust toolchain new enough for the locked dependencies (rustup `stable`); it
installs the rest. PostgreSQL must be installed for the indexer role
(`apt install postgresql`).

It creates the `hashgram` user, the directories, the firewall rules (22,
26656 for consensus, 26670 for the P2P layer), builds and installs
`hashgramd`, `hashgram-node`, `hashgramctl` and the systemd units.

## 2. Initialise and join

```bash
hashgramctl init --moniker my-node
hashgramctl join-mainnet
hashgramctl network-info
```

`join-mainnet` takes **no arguments**. It writes the built-in genesis, checks
that its SHA-256 is

```
e322bc2319f6e0173286fa526dab5a8ff8ad0797c7b80dd03e7c9d98621d5e4d
```

and configures the built-in seed list. `network-info` prints the pin; if it is
not `e322bc23…5e4d`, stop.

## 3. Choose what your node does

```bash
hashgramctl configure-role relay,store,media \
  --declared-storage 500000000000 \
  --reward-address hash1<your-cold-address>
hashgramctl configure-role indexer     # public read model; no rewards
```

Roles can be combined. A plain full node with no role just follows the chain.
Store and relay nodes carry HashMail envelopes, encrypted Drive objects and
other Hashgram One traffic without decrypting private application payloads.

## 4. Start and watch

```bash
hashgramctl start
hashgramctl chain-status          # wait for catching_up = false, peers > 0
journalctl -u hashgram-node -f    # "using the Mainnet list built into this binary"
hashgramctl mainnet-preflight     # must pass before you rely on the node
```

## Earning

To be paid, fund the operator address printed by `configure-role` with at
least 1,000 HASH for the bond plus fees, then set
`auto_register_provider = true` in `/etc/hashgram/node.toml`. Credit is
earned per epoch for storage (100 / GiB·epoch), relay (200 / GiB), retrieval
(150 / GiB) and calls (300 / hour); the epoch budget is split by credit and
capped at 5 % per provider.

Be honest with yourself about this: **earnings need real traffic.** A provider
that stores nothing and serves nobody earns nothing, however long it runs. The
reserve's schedule sets the ceiling; usage sets the actual number. Watch
[/rewards](/rewards) to see what providers are actually being paid today.

Fraud (failing challenges for data you claimed to store) costs 5 % of your
bond and a jail period.

## Keep it safe

- The RPC (26657), REST (1317), gRPC (9091) and node API (26672) listen on
  `127.0.0.1` only. `mainnet-preflight` fails if 26657 or 1317 is reachable
  from the internet. Do not change `laddr`/`address` values.
- Never copy `priv_validator_key.json` or `node_key.json` from another
  machine.
- Read [Operations](/docs/operations), [Security](/docs/security) and
  [Disaster recovery](/docs/disaster-recovery).

## Becoming a validator

A validator additionally needs a bonded stake, a consensus key that stays on
one machine only, and careful key custody. See [Mainnet](/docs/mainnet) and
[Node roles](/docs/node-roles). Validators are limited to 100 and ordered by
bonded stake.

## Running your own explorer

This website is itself just a node with an indexer and a static site in
front. The full recipe (node → indexer → web → Caddy) is in the repository's
`web/README.md`.
