# What is Hashgram

Hashgram One is a desktop application for a private digital life. **Pulse,
Reels, Local, Chats, Mail, Drive, Spaces, Contacts, Wallet, Earn and
Network** are the product; a public blockchain and a peer-to-peer swarm are
the infrastructure underneath it.

This page explains it in plain language. The technical documents in the left
menu go deeper.

## What people use

- **HashMail** is end-to-end encrypted mail between Hashgram identities,
  `@usernames` and `name@hashgram.io` addresses. Threads, attachments,
  receipts and Requests for unknown senders are implemented. Mail crossing
  the optional Internet e-mail gateway is labelled as not end-to-end.
- **HashDrive** encrypts files on your device in authenticated segments.
  It supports folders, versions, trash and capability-based snapshot or live
  sharing without making a file public.
- **Pulse** is the social home: Latest, Following and Topics in strict
  chronological order, with photos, video, polls, comments, reactions and
  reposts, each signed by its author. There is no ranking algorithm anywhere
  in the application — a test fails the build if one appears.
- **Chats** are one-to-one and group conversations over MLS, with pictures,
  video and files. "Sent" means a store node accepted the envelope; nothing
  claims the other person read it.
- **Stories** show a picture or video for 24 hours (at most 48). The author
  signs the expiry; expiry is a display rule, not deletion, and the composer
  says so before you post.
- **Reels, Local and Topics** show the network's public video newest-first,
  posts from one self-declared country, and open channels anyone can post on.
- **Profiles** carry a cover, avatar, `@username`, bio, website and country.
  A verified badge is a public 100,000 HASH payment to the governance pool
  that every reader re-checks on chain; nobody grants it and nobody can
  revoke it.
- **Spaces** are private environments for families, teams and projects, with
  roles, chat, group mail, posts, announcements and a shared Drive. Spaces
  that choose to be found appear in a public Discover listing; their content
  stays encrypted.
- **Contacts and Circles** combine on-chain identity discovery with private
  local relationship state and private Circle posts.
- **Wallet, Earn and Network** expose the one HASH asset, a transaction
  explorer, staking, a node you can run from the desktop, and the network
  through interchangeable nodes.

Hashgram One ships for Windows as a public demo preview; the download on
[hashgram.org](https://hashgram.org/download) always resolves to the newest
release of [`deepdrogo/hashgram_windows`](https://github.com/deepdrogo/hashgram_windows).
Voice and video calls exist at the protocol level but have no desktop
interface yet. See the [product overview](/one) and
[architecture](/docs/hashgram-one-architecture).

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
| Founder         | 199,000,000       | 19,000,000 spendable, 180,000,000 vesting over 96 months |
| Genesis validator operator | 1,000,000 | Initial operator allocation |
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

## The private application layer

Native mail, Drive capabilities, contact requests, Circle posts and Space
events travel as versioned application messages inside MLS ciphertext. Store
and relay nodes cannot decode them. Public posts remain signed public events
and can be indexed into chronological feeds; private Circle and Space content
is merged by the client after local decryption.

The chain stores only facts that need global agreement: identity and device
public keys, usernames, balances, validators, provider records and governance.
Subjects, bodies, recipients, filenames, folder trees and Space membership do
not go on chain.

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

Hashgram is open source. The chain (`hashgramd`), P2P node
(`hashgram-node`), application protocol, Rust SDK, CLI, gateway and indexer
live at **[github.com/deepdrogo/hashgram](https://github.com/deepdrogo/hashgram)**.
This companion website is mirrored at
**[github.com/deepdrogo/hashgram_io](https://github.com/deepdrogo/hashgram_io)**.

Next: [Run a node](/docs/run-a-node) · [API](/docs/api) · [Tokenomics](/docs/tokenomics)
