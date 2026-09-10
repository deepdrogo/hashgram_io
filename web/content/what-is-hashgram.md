# What is Hashgram

Hashgram is a public blockchain — a shared ledger run by many independent
computers — built for one job: paying people who store, relay and serve data
for a peer-to-peer social and messaging network.

This page explains it in plain language. The technical documents in the left
menu go deeper.

## The token

The currency of the network is **HASH**. Exactly **1,000,000,000 HASH** were
created at launch (10 September 2026) and **no more will ever be created**:
there is no mining, no block subsidy, no inflation. Every HASH you see on this
site was accounted for on day one.

Amounts on chain are counted in `uhash`; 1 HASH = 1,000,000 uhash.

Where the supply went at genesis:

| Share           | Amount            | Purpose                                                   |
| --------------- | ----------------- | --------------------------------------------------------- |
| Useful-service reserve | 500,000,000 | Pays nodes for storage, relay and media work, over many years |
| Founder         | 200,000,000       | 20,000,000 unlocked at genesis (1,000,000 of it funded the first validator), 180,000,000 vesting over 96 months |
| Treasury reserves | see [/accounts](/accounts) | Treasury, Growth, Developer grants, Liquidity — moved only by governance |
| Everyone else   | the remainder     | Validators, early participants, welcome rewards           |

The live split is always on [/accounts](/accounts).

## How the chain stays alive

A set of **validators** takes turns proposing blocks and signs each one.
A block is final only when validators holding more than two thirds of the
bonded HASH have signed it. That is the whole liveness rule: as long as more
than ⅔ of the voting power is online and honest, the chain moves — no matter
what happens to any single computer, including the one that produced the
first block.

Anyone can delegate HASH to a validator and share in its fees. Misbehaving
validators are slashed and jailed. See [/validators](/validators).

## How nodes earn

Hashgram does not pay for hashing puzzles. It pays for **useful work**:

- **Storage** — keeping other people's encrypted data available.
- **Relay** — forwarding messages and media between peers.
- **Retrieval** — serving stored bytes when asked.
- **Calls** — relaying audio/video for calls.

Providers post a bond of 1,000 HASH, prove their work with signed receipts
and random challenges, and are paid at the end of every **epoch** (21,600
blocks, about a day) from the useful-service reserve. Each epoch releases at
most `min(remaining × 5⁄10,000, 250,000)` HASH, and any single provider can
take at most 5 % of that. Work that is not done is not paid: the budget is a
ceiling, not a promise. Fraud costs 5 % of the bond and a jail sentence.

Everything about this — the reserve, the schedule, who has been paid — is on
[/rewards](/rewards).

## Where fees go

Every transaction pays a small fee. Fees are split three ways by the protocol:
most goes to validators and their delegators, a slice funds service revenue,
and **1 %** goes to the founder. That 1 % is a share of fees the network
already collects — it is not a tax on anyone's balance, it does not mint
anything, and its ceiling is hardcoded in the software. The live numbers are
on [/founder](/founder).

## Usernames and identity

You can register a human-readable `@username` on chain and attach an identity
record to it. Usernames resolve to addresses, so people can find each other
without copying 40-character strings. Search for any `@name` in the box at the
top of this site.

## The social layer

On top of the chain runs a peer-to-peer network (libp2p) where posts,
messages, media and calls travel directly between nodes. The chain does not
store your messages; it stores who is allowed to be paid for carrying them.
Nodes that take on the `indexer` role follow social events to build feeds.

## Governance

Bonded HASH votes. A proposal passes with 40 % turnout, more than 50 % Yes,
and fewer than 33.4 % No-with-veto over a 7-day vote. Parameters, treasury
spending and upgrades all go through this process — see
[/governance](/governance).

## What this website is

hashgram.io is a **read-only** window onto the chain, served by a full node
that runs on the same server. It holds no keys and cannot send, sign or
receive anything. It shows no prices and links to no exchanges. It runs no
analytics and loads nothing from third parties.

The site compares the genesis hash of the node it reads from against a
hardcoded value; if they ever differ, every page shows a warning and the
explorer disables itself.

## Source code

Hashgram is open source. The chain (`hashgramd`), the P2P node
(`hashgram-node`), the tools, this website and its API live in one
repository: **[github.com/deepdrogo/hashgram](https://github.com/deepdrogo/hashgram)**.
Every document in this section is rendered from that repository's `docs/`
folder, with the commit it came from shown at the bottom of each page.

Next: [Run a node](/docs/run-a-node) · [API](/docs/api) · [Tokenomics](/docs/tokenomics)
