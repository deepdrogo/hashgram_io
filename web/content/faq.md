# Frequently asked questions

## Is there mining?

No. Hashgram has no proof-of-work and no block subsidy. Validators finalise
blocks with bonded stake; providers earn from a fixed reserve for real
storage, relay, retrieval and call service. See [How nodes earn](/rewards).

## Will more HASH ever be created?

No. The supply was fixed at 1,000,000,000 HASH at genesis and there is no
mint module. Every reward and every fee share moves existing HASH.

## How much can a node earn?

Only what the network actually uses. Each epoch (≈ one day) releases at most
min(remaining × 5⁄10,000, 250,000) HASH, divided among providers by the
credit they earned, with a cap of 5 % per provider. A provider that stores
nothing and serves nobody earns nothing. The [rewards page](/rewards) shows
what is actually being paid.

## What does the founder get?

Two things: a genesis allocation (20,000,000 HASH unlocked, 180,000,000 HASH
vesting over 96 months) and 1 % of protocol fee revenue, capped in the
binary. No transfer tax, no minting. Live figures on [/founder](/founder).

## Where do transaction fees go?

Most to validators and their delegators, 1 % to the founder, the rest to
treasury / service revenue. Each transaction page shows its own split.

## Why does this site show three "node" numbers?

Because they are three different things: CometBFT consensus peers, libp2p
P2P peers and the validator set. Adding them would count machines twice and
mean nothing. See [/network](/network).

## Does this site have a wallet?

No. It is read-only: no keys, no signing, no broadcasting, no prices. Use a
client application for that; link back here with a
[short link](/docs/short-links).

## Can I trust the numbers?

You do not have to. The site reads from its own node and every figure is a
chain query you can repeat on any node. The [status page](/status) shows
the node's sync state, the indexer lag and whether the genesis hash matches
the pinned value.

## How do I run a node?

Four commands on a fresh Ubuntu server — see [Run a node](/docs/run-a-node).
Joining Mainnet needs no arguments; genesis, its hash and the seed peers are
compiled into the binaries.

## How do I search for something?

Type a block height, a transaction hash, a `hash1…` address, a
`hashvaloper1…` validator, an `@username` or a `12D3Koo…` peer id into the
search box on any page, or append it to the site root as a short link.

## Where is the source code?

[github.com/deepdrogo/hashgram](https://github.com/deepdrogo/hashgram) holds
the chain, the node, this site and the API. The website alone is mirrored at
[github.com/deepdrogo/hashgram_io](https://github.com/deepdrogo/hashgram_io).
