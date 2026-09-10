# Glossary

**Account** — a `hash1…` address that can hold HASH. Ordinary accounts belong
to people; *module accounts* belong to the protocol; *vesting accounts*
release their balance on a schedule.

**Bonded** — HASH delegated to a validator. Bonded HASH earns a share of fees,
votes in governance and can be slashed if the validator misbehaves.
Unbonding takes 21 days.

**Block** — a batch of transactions finalised by the validators. Hashgram
produces one roughly every four seconds.

**CometBFT** — the consensus engine. It finalises a block once validators
holding more than two thirds of bonded power have signed it.

**Consensus peer** — another CometBFT node this node exchanges blocks and
votes with. Distinct from P2P peers.

**Credit** — the unit in which useful service is measured inside an epoch:
storage per GiB·epoch, relay and retrieval per GiB, calls per hour. The
epoch budget is split by credit.

**Delegator** — anyone who bonds HASH to a validator.

**Epoch** — 21,600 blocks, about a day. Rewards are settled at epoch close.

**Fee router** — the module that splits every transaction fee between
validators, the founder (1 %) and treasury/service revenue.

**Founder share** — 1 % of protocol fee revenue, hardcoded ceiling, paid to a
beneficiary address every 7,200 blocks. Not a transfer tax; never minted.

**Genesis hash** — the SHA-256 of the genesis file that started Mainnet
(`e322bc23…5e4d`). Pinned on every node and in this site.

**HASH / uhash** — the token and its smallest unit: 1 HASH = 1,000,000 uhash.
Supply is fixed at 1,000,000,000 HASH.

**Indexer** — the service that copies chain data into PostgreSQL and serves
the read API behind this site. A cache; rebuildable at any time.

**libp2p / P2P peer** — the second network layer, where social events, media
and calls travel between nodes. Distinct from consensus peers.

**Module account** — an address owned by a chain module, not by a person:
the useful-service reserve, the treasury sub-accounts, the founder revenue
module, staking pools, the fee collector.

**Provider** — a node operator who bonded 1,000 HASH and registered roles
(storage, relay, media, call) to earn useful-service rewards.

**Proposal** — a governance vote. Needs 40 % turnout, more than 50 % Yes and
less than 33.4 % No-with-veto over seven days.

**Reserve (useful-service)** — 500,000,000 HASH set aside at genesis to pay
providers. Each epoch releases at most min(remaining × 5⁄10,000, 250,000).

**Signature (in a block)** — a validator's vote on the previous block,
included in the next block's commit. Missing signatures count against
uptime.

**Slashing** — burning part of a validator's stake for downtime or
double-signing, with a jail period.

**Username** — a human-readable `@name` registered on chain and resolving to
an address.

**Validator** — a node that proposes and signs blocks with a bonded stake.
At most 100, ordered by stake.

**Vesting** — a schedule that releases locked HASH over time. The founder's
180,000,000 HASH vest in 96 monthly periods.
