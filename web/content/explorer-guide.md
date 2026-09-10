# Reading this site

hashgram.io is a window onto Hashgram Mainnet. This page explains what each
section shows, where the numbers come from and what they do **not** mean.

## Where the numbers come from

Everything is read from a full node that runs on the same server as the
website — the CometBFT RPC for blocks and signatures, the Cosmos REST gateway
for balances, staking, governance and the Hashgram modules, and the
`hashgram-node` API for the peer-to-peer layer. An indexer copies what it
reads into PostgreSQL so lists and searches are fast; that database is a
cache and can be rebuilt from scratch at any time.

Nothing is estimated, and nothing comes from a third party. If the node
falls behind, the header says so ("Indexer is N blocks behind"). If the
event stream is down the live dot turns hollow and pages poll instead.

## Home

- **Height** — the newest block the node has seen; it ticks live.
- **Supply / Circulating** — supply is fixed. Circulating is supply minus
  protocol-owned module accounts and the founder's still-locked balance.
- **Bonded** — HASH delegated to validators, as a share of supply.
- **Consensus peers / P2P peers / Validators** — three different layers.
  They are never added together; there is no single "nodes online" number.
- **Where the 1,000,000,000 HASH are** — the same split as
  [/accounts](/accounts), as one bar.
- **24 h charts** — five-minute snapshots kept for seven days.

## Blocks

Each block lists its proposer, transactions, gas, size and how many
validators signed the previous block's commit. Use the search box on
[/blocks](/blocks) to jump to a height or find a block by hash. Missing
signatures are marked ▼.

## Transactions

Messages are decoded by the node itself, so what you see is what the chain
executed. Filters: message type, result, the amount moved by the transaction's
transfer events, signer and height range. "Where the fee went" splits each
fee into the validator share, the founder's 1 % and treasury/service revenue.

## Accounts

The top holders by balance. Icons tell kinds apart:

| Icon | Kind |
| --- | --- |
| building | module account owned by the protocol |
| lock | vesting account (the founder) |
| shield | validator operator |
| person | ordinary account |

"Share" is the balance divided by total supply; the shares shown never add
up to more than 100 %.

## Validators

Voting power, uptime over the signing window, the last 120 blocks as a
strip, blocks proposed, commission and delegators. Two numbers matter for
liveness: the smallest group holding more than ⅔ of power (needed to
finalise) and the smallest group holding more than ⅓ (enough to halt).

## Rewards

The useful-service reserve, this epoch's budget, the per-provider cap, what
earns credit and every payout so far. The projection charts use the exact
integer rule the chain uses; they are ceilings, not forecasts of earnings.

## Founder

The founder's allocation and vesting schedule, the 1 % fee share, accrued and
paid amounts, delegations and voting power — with the chain queries you can
run to check them.

## Governance

Proposals, live tallies against quorum and threshold, votes and the decoded
message, with parameter changes shown as a diff against current values.

## Network

What this node sees on both layers, its own ids (read at runtime, never
hardcoded), the built-in seed lists and the fork-isolation rules. Peer
addresses are shown as /24 or /48 prefixes only.

## Status

Node sync, indexer lag, event-stream state and the genesis pin check. If the
pin ever mismatches, every page shows a warning and the explorer disables
itself.
