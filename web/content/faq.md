# Frequently asked questions

## What changed?

**Hashgram One** grew from a private communication and storage workspace
into a full desktop application: Pulse (a chronological social feed), Reels,
Local, Topics, Stories, MLS-encrypted Chats, Mail, Drive, Spaces, Contacts,
profiles with an on-chain verified badge, Wallet, Earn and Network — all over
one identity. The existing Mainnet chain and libp2p swarm remain the
infrastructure; none of this required a consensus or tokenomics change.

## Can I download Hashgram One?

Yes, for 64-bit Windows 10/11. Download it from
[hashgram.org/download](https://hashgram.org/download) or the
[latest GitHub release](https://github.com/deepdrogo/hashgram_windows/releases/latest);
both always point at the newest tagged build, and the app updates itself with
minisign-verified packages. It is a public demo preview under active
development, and the installer is not Authenticode-signed yet, so Windows
SmartScreen may warn on first run — compare the SHA-256 with `SHA256SUMS.txt`
from the release. macOS, Linux, iOS and Android are not released.

## Is there a ranking algorithm in the feed?

No. Pulse shows Latest, Following and Topics in the order things happened,
Reels shows public video newest-first, and a test in the desktop repository
fails the build if ranking code appears. What you see is what was signed,
in the order it was signed.

## Can nodes read my chats?

No. Chats are one-to-one or group MLS conversations (RFC 9420) with forward
secrecy and post-compromise security. Pictures, video and files travel in
the same encrypted channel. A store node holds envelopes it cannot open and
learns only mailbox id, size and time.

## Do stories really disappear?

Expiry is a display rule, not deletion. After the signed `expires_at`
(24 hours by default, 48 at most) Pulse, profiles and indexers stop showing
a story, but nodes that accepted the event keep it until their ordinary
retention sweep and the media blob has no expiry at all. The composer says
this before you post. Something that must never be seen again belongs in a
Chat, not in a story. See the [Stories specification](/docs/stories).

## What is the verified badge?

A profile shows a verified badge when its address has paid 100,000 HASH to
the governance module account with the memo `verify:<address>`. Every reader
re-checks that transaction on chain; nobody grants the badge and nobody can
take it away. It proves willingness to pay in public, not identity.

## Can nodes read my mail or files?

No. Native application payloads travel inside MLS ciphertext and Drive files
are encrypted on the device. A store node can see limited metadata such as a
mailbox id, object size and time, but not a mail subject, body, filename,
folder tree or Space event. Internet e-mail crossing a gateway is different:
the gateway necessarily sees that external plaintext, and clients label it.

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

Two things: a genesis allocation (19,000,000 HASH spendable, 180,000,000 HASH
vesting over 96 months) and 1 % of protocol fee revenue, capped in the
binary. No transfer tax, no minting. Live figures on [/founder](/founder).

## Where do transaction fees go?

Most to validators and their delegators, 1 % to the founder, the rest to
treasury / service revenue. Each transaction page shows its own split.

## Why does this site show three "node" numbers?

Because they are three different things: CometBFT consensus peers, libp2p
P2P peers and the validator set. Adding them would count machines twice and
mean nothing. See [/network](/network).

## Does this site have the Hashgram One wallet?

No. Hashgram One includes a wallet surface, but **hashgram.io remains
read-only**: no keys, signing, broadcasting or prices. The client can link
back here with a [short link](/docs/short-links) to verify public chain data.

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
