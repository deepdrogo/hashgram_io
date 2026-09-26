import { onMount, For, Show } from 'solid-js';
import { A } from '@solidjs/router';
import {
  Activity,
  Archive,
  AtSign,
  BadgeCheck,
  Check,
  CircleDollarSign,
  Clapperboard,
  ContactRound,
  Database,
  Download,
  ExternalLink,
  HardDrive,
  Hash,
  History,
  Inbox,
  KeyRound,
  LayoutGrid,
  MapPin,
  MessageSquare,
  Network,
  ShieldCheck,
  TriangleAlert,
  UserRound,
  Wallet,
} from 'lucide-solid';
import type { Component } from 'solid-js';
import type { LucideProps } from 'lucide-solid';
import { Badge, Card, Note, Section } from '../components/ui';
import { setTitle } from '../lib/query';
import { GITHUB_URL } from '../components/Layout';

/**
 * Hashgram One product overview.
 *
 * This site is read-only and fetches nothing from third parties, so no
 * version number is hard-coded here: the download links always resolve to the
 * latest GitHub Release (hashgram.org reads that record live; GitHub's
 * `/releases/latest` redirects to it).
 */
export const HASHGRAM_ORG_DOWNLOAD = 'https://hashgram.org/download';
export const WINDOWS_REPO_URL = 'https://github.com/deepdrogo/hashgram_windows';
export const LATEST_RELEASE_URL = `${WINDOWS_REPO_URL}/releases/latest`;

type Module = {
  id: string;
  name: string;
  icon: Component<LucideProps>;
  summary: string;
  detail: string;
  facts: string[];
  doc?: { label: string; href: string; external?: boolean };
};

type ModuleGroup = { id: string; label: string; lead: string; modules: Module[] };

const GROUPS: ModuleGroup[] = [
  {
    id: 'social',
    label: 'Social',
    lead: 'Public life is signed, chronological and verifiable. A test fails the frontend build if ranking code appears.',
    modules: [
      {
        id: 'pulse', name: 'Pulse', icon: Activity,
        summary: 'The home feed: Latest, Following and Topics, in order.',
        detail: 'Public posts with photos, video, polls, comments, reactions and reposts, each signed by its author. A Stories row sits on top and a discovery column beside it.',
        facts: ['Following replays signed events already on your device, so it works offline.', 'Media is uploaded to three providers before the post is signed.', 'No ranking, no score, no recommendation.'],
        doc: { label: 'Social protocol', href: '/docs/social-protocol' },
      },
      {
        id: 'chats', name: 'Chats', icon: MessageSquare,
        summary: 'One-to-one and group chats over MLS.',
        detail: 'Pictures, video and files travel through the same encrypted channel. Store nodes hold envelopes they cannot read; a message is stored on your device before it is sent.',
        facts: ['MLS (RFC 9420): forward secrecy and post-compromise security.', '"Sent" means a store node accepted it — nothing claims the other person read it.', 'Who may message you is enforced on your side: everyone or nobody; blocking overrides both.'],
        doc: { label: 'Messaging spec', href: '/docs/messaging' },
      },
      {
        id: 'stories', name: 'Stories', icon: History,
        summary: 'A picture or video shown for 24 hours, at most 48.',
        detail: 'The author signs the expiry together with the content. Expiry is a display rule, not deletion — the composer says so before you post.',
        facts: ['Shown at the top of Pulse and on the profile until expiry.', 'No viewer count: counting viewers means reporting to a server.'],
        doc: { label: 'Stories spec', href: '/docs/stories' },
      },
      {
        id: 'reels', name: 'Reels', icon: Clapperboard,
        summary: 'Every public video on the network, newest first.',
        detail: 'One video at a time, autoplaying silently with its first frame shown immediately. No engagement score decides what plays next.',
        facts: ['No transcoding: what a browser can play, Hashgram plays.'],
      },
      {
        id: 'topics', name: 'Topics', icon: Hash,
        summary: 'Open channels anyone can post on.',
        detail: 'Pinned and recently active Topics form an index inside Pulse. Each Topic is its own page with invites and share links; posts are ordinary signed events.',
        facts: ['Per-author rate limits on nodes keep open channels usable.'],
      },
      {
        id: 'local', name: 'Local', icon: MapPin,
        summary: 'Posts, people and Spaces from one country.',
        detail: 'A country is an attribute the author signed into their own profile — never inferred from an IP address, node or language.',
        facts: ['If you did not declare a country, you are not listed.', 'The page says how many accounts it looked at instead of pretending to be complete.'],
      },
      {
        id: 'profiles', name: 'Profiles & verified badge', icon: UserRound,
        summary: 'Cover, avatar, @username, bio, website, country.',
        detail: 'Posts, Replies, Media and Likes tabs. The verified badge is a public 100,000 HASH payment to the governance pool that every reader re-checks on chain.',
        facts: ['Nobody grants the badge and nobody can revoke it; it is not an identity check.', 'Follower counts read "unknown" when no indexer answers.'],
      },
    ],
  },
  {
    id: 'work',
    label: 'Mail, files and groups',
    lead: 'The private workspace that started Hashgram One. Everything here travels inside MLS ciphertext or client-encrypted blobs.',
    modules: [
      {
        id: 'mail', name: 'HashMail', icon: Inbox,
        summary: 'Private mail, without a mailbox provider.',
        detail: 'End-to-end encrypted mail between hash1… identities, @usernames and name@hashgram.io. Inbox, Requests, Starred, Sent, Drafts, Archive, Spam, Trash and labels.',
        facts: ['Threads, CC/BCC, delivery and read receipts.', 'Attachments from disk or as snapshot / live HashDrive links.', 'HTML mail is isolated in a sandboxed frame under a strict CSP.'],
        doc: { label: 'HashMail spec', href: '/docs/hashmail' },
      },
      {
        id: 'drive', name: 'HashDrive', icon: HardDrive,
        summary: 'Files encrypted before they leave your device.',
        detail: 'Authenticated 1 MiB segments stored as unreadable content-addressed blobs. Folders, versions, trash, search and sharing you can revoke.',
        facts: ['Snapshot and live capability-based sharing.', 'Availability is reported as what answered against a target of three providers.'],
        doc: { label: 'HashDrive spec', href: '/docs/hashdrive' },
      },
      {
        id: 'spaces', name: 'Spaces', icon: LayoutGrid,
        summary: 'A shared place for a family, team or project.',
        detail: 'Owner, Admin, Member and Guest roles from a signed, hash-chained role log; chat, posts, announcements, shared Drive and group mail. Discover lists Spaces that chose to be found.',
        facts: ['Public listing with categories and join requests — the content stays encrypted.', 'Nothing about a private Space is stored on chain.'],
        doc: { label: 'Spaces spec', href: '/docs/spaces' },
      },
      {
        id: 'contacts', name: 'Contacts & Circles', icon: ContactRound,
        summary: 'One identity, discovered by name or address.',
        detail: 'On-chain identity resolution with local contact, block, mute and trust state. Circle posts are private MLS messages merged only on member devices.',
        facts: ['Contact requests travel over MLS; a wallet card is shared only if you choose.'],
      },
    ],
  },
  {
    id: 'assets',
    label: 'Assets and network',
    lead: 'One fixed-supply asset, a node you can run from the desktop, and a Network page that shows what it can prove.',
    modules: [
      {
        id: 'wallet', name: 'Wallet', icon: Wallet,
        summary: 'One fixed-supply asset: HASH.',
        detail: 'Balance, send and receive with a preview before signing, history, staking, @username registration, authorised devices and a built-in transaction explorer.',
        facts: ['Amounts stay integer strings end to end.', 'Device registration needs at least 0.01 HASH; a username costs 1 HASH more.'],
        doc: { label: 'Tokenomics', href: '/docs/tokenomics' },
      },
      {
        id: 'earn', name: 'Earn · Run a node', icon: CircleDollarSign,
        summary: 'Useful service instead of mining.',
        detail: 'Run a store, relay or media node from the PC. The supervisor derives its state from evidence — Starting, Connecting, Syncing, Running, Degraded, Crashed.',
        facts: ['Pre-flight checks program, configuration, disk space and port 26670.', 'Provider lifecycle, assignments and earnings in plain sentences.'],
        doc: { label: 'How nodes earn', href: '/rewards' },
      },
      {
        id: 'network', name: 'Network', icon: Network,
        summary: 'Choose the infrastructure you trust.',
        detail: 'Height, connected and rejected peers, pinned genesis, supply, top holders and providers, plus a dashboard for your own node.',
        facts: ['Several indexers can be configured; one hostname is never load-bearing.', 'Diagnostics export excludes private content and peer IPs.'],
        doc: { label: 'Live network', href: '/network' },
      },
    ],
  },
];

const LIMITS: Array<[string, string]> = [
  ['One bonded validator', 'If it stops, the chain halts. Feeds, chats, mail, Drive and Spaces keep working between peers, but transactions do not.'],
  ['Followers need an indexer', 'Following works offline from signed events; follower counts read "unknown" without an indexer.'],
  ['Replication is best-effort', 'Media targets three providers and nodes repair towards three. The interface reports what answered.'],
  ['Stories are minimal', 'No viewer count, reactions or replies yet.'],
  ['Calls are not in the desktop app', 'TURN credentials and WebRTC signalling inside MLS are specified and implemented at node and SDK level. There is no calling screen yet.'],
  ['Unsigned installer', 'Updates are minisign-verified, but the installer has no Authenticode certificate, so Windows SmartScreen warns on first run.'],
];

export default function One() {
  onMount(() => setTitle('Hashgram One'));

  return (
    <div>
      <section class="mb-12 border-b border-ink-900 pb-10 pt-3 sm:pt-8">
        <div class="mb-5 flex flex-wrap items-center gap-2">
          <Badge variant="solid">Hashgram One</Badge>
          <Badge variant="muted">Windows · public demo</Badge>
          <Badge variant="muted">Mainnet live</Badge>
        </div>
        <h1 class="max-w-5xl text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
          One identity. One feed.<br />One inbox. One network.
        </h1>
        <p class="mt-6 max-w-3xl text-base leading-relaxed text-ink-500 sm:text-lg">
          Hashgram One is the desktop application on Hashgram Mainnet: a chronological social network, end-to-end encrypted chats and mail, stories, encrypted storage, private Spaces, a wallet and a node — fourteen surfaces behind one 24-word identity.
        </p>
        <div class="mt-7 flex flex-wrap gap-3">
          <a href={HASHGRAM_ORG_DOWNLOAD} target="_blank" rel="noopener noreferrer" class="btn btn-primary">
            <Download class="size-3.5" aria-hidden="true" /> Download for Windows
          </a>
          <a href={LATEST_RELEASE_URL} target="_blank" rel="noopener noreferrer" class="btn">
            Latest release on GitHub <ExternalLink class="size-3.5" aria-hidden="true" />
          </a>
          <A href="/docs/hashgram-one-architecture" class="btn">Read the architecture</A>
        </div>
        <p class="mt-4 max-w-3xl text-xs leading-relaxed text-ink-500">
          Both links always resolve to the newest tagged release of <a href={WINDOWS_REPO_URL} target="_blank" rel="noopener noreferrer" class="underline decoration-ink-700 hover:decoration-white">deepdrogo/hashgram_windows</a>; this site stores no version number and fetches nothing from third parties. The build is a public demo preview under active development, and the installer is not Authenticode-signed yet.
        </p>
      </section>

      <Section title="What is inside" subtitle="The left rail of the application, grouped the way it ships. Pulse opens first.">
        <div class="flex flex-wrap gap-2">
          <For each={GROUPS}>
            {(group) => (
              <For each={group.modules}>
                {(m) => (
                  <a href={`#${m.id}`} class="badge badge-muted inline-flex items-center gap-1.5 no-underline hover:text-white">
                    <m.icon class="size-3" aria-hidden="true" /> {m.name}
                  </a>
                )}
              </For>
            )}
          </For>
        </div>
      </Section>

      <For each={GROUPS}>
        {(group) => (
          <Section id={group.id} title={group.label} subtitle={group.lead}>
            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <For each={group.modules}>
                {(m) => (
                  <Card id={m.id} class="h-full scroll-mt-20">
                    <m.icon class="mb-5 size-5 text-ink-500" aria-hidden="true" />
                    <h3 class="text-lg font-semibold">{m.name}</h3>
                    <p class="mt-1 text-sm font-medium">{m.summary}</p>
                    <p class="mt-3 text-xs leading-relaxed text-ink-500">{m.detail}</p>
                    <ul class="mt-4 space-y-2 text-xs">
                      <For each={m.facts}>
                        {(fact) => (
                          <li class="flex gap-2"><Check class="mt-0.5 size-3.5 shrink-0 text-ink-500" aria-hidden="true" /><span>{fact}</span></li>
                        )}
                      </For>
                    </ul>
                    <Show when={m.doc}>
                      <A href={m.doc!.href} class="mt-4 inline-block text-xs text-ink-500 underline decoration-ink-700 hover:text-white hover:decoration-white">{m.doc!.label} →</A>
                    </Show>
                  </Card>
                )}
              </For>
            </div>
          </Section>
        )}
      </For>

      <Section title="Private by architecture" subtitle="Global facts reach consensus. Private content never does.">
        <div class="grid gap-4 lg:grid-cols-3">
          <Card title="On your devices">
            <KeyRound class="mb-3 size-5 text-ink-500" aria-hidden="true" />
            <p class="text-sm">Mnemonic, device secrets, Drive keys, decrypted chats and mail, folders, contacts and trust state.</p>
            <p class="mt-3 text-xs text-ink-500">The local store is encrypted. Cryptography stays in Rust; the UI receives views, not secret keys.</p>
          </Card>
          <Card title="On store, relay and media nodes">
            <Archive class="mb-3 size-5 text-ink-500" aria-hidden="true" />
            <p class="text-sm">MLS envelopes, content-addressed encrypted blobs and signed public social events.</p>
            <p class="mt-3 text-xs text-ink-500">A node can observe limited delivery metadata such as mailbox id, size and time, but cannot read a chat, subject, body, filename or Space event. Public posts are public by design and signed by their author.</p>
          </Card>
          <Card title="On chain">
            <Database class="mb-3 size-5 text-ink-500" aria-hidden="true" />
            <p class="text-sm">Identity keys, usernames, balances, validators, providers, governance — and the verified-badge payments.</p>
            <p class="mt-3 text-xs text-ink-500">Only facts needing global agreement are public. Nothing private is indexed by hashgram.io.</p>
          </Card>
        </div>
      </Section>

      <Section title="Verified badge, verifiable here" subtitle="The one social feature that touches the chain.">
        <Card>
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
            <BadgeCheck class="size-6 shrink-0 text-ink-500" aria-hidden="true" />
            <div class="text-sm">
              <p>A profile shows a verified badge when its address has paid <strong>100,000 HASH</strong> to the governance module account with the memo <code class="font-mono text-xs">verify:&lt;address&gt;</code>. Every reader re-checks that transaction; nobody grants the badge and nobody can take it away.</p>
              <p class="mt-2 text-xs text-ink-500">It proves willingness to pay in public — not identity. The payment funds the network's governance pool, which you can audit like any other account on this explorer.</p>
              <A href="/txs" class="mt-3 inline-block text-xs underline decoration-ink-700 hover:decoration-white">Browse transactions →</A>
            </div>
          </div>
        </Card>
      </Section>

      <Section title="What it does not do yet" subtitle="A public demo preview: the application's own report lists these limits, and so does this page.">
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <For each={LIMITS}>
            {([title, text]) => (
              <Card class="h-full">
                <TriangleAlert class="mb-3 size-4 text-ink-500" aria-hidden="true" />
                <h3 class="text-sm font-semibold">{title}</h3>
                <p class="mt-2 text-xs leading-relaxed text-ink-500">{text}</p>
              </Card>
            )}
          </For>
        </div>
        <Note class="mt-4" title="Why this matters.">
          Hashgram One did not change Mainnet consensus or tokenomics. It adds a private application protocol, a public social event family and an SDK over the existing chain and P2P network, so older Mainnet nodes remain interoperable.
        </Note>
      </Section>

      <Section title="Open and inspectable" subtitle="Everything the application does can be read before it is run.">
        <ul class="grid gap-3 sm:grid-cols-3">
          <li class="card p-5">
            <ShieldCheck class="mb-3 size-4 text-ink-500" aria-hidden="true" />
            <h3 class="text-sm font-semibold">Desktop application</h3>
            <p class="mt-2 text-xs leading-relaxed text-ink-500">Tauri shell, SolidJS frontend, Rust SDK bridge, node supervisor and every specification, including the social report and stories spec.</p>
            <a href={WINDOWS_REPO_URL} target="_blank" rel="noopener noreferrer" class="mt-3 inline-flex items-center gap-1 text-xs underline decoration-ink-700 hover:decoration-white">deepdrogo/hashgram_windows <ExternalLink class="size-3" aria-hidden="true" /></a>
          </li>
          <li class="card p-5">
            <ShieldCheck class="mb-3 size-4 text-ink-500" aria-hidden="true" />
            <h3 class="text-sm font-semibold">Chain, node, SDK, indexer</h3>
            <p class="mt-2 text-xs leading-relaxed text-ink-500">Mainnet chain, store/relay/media node, application protocol, Rust SDK, reference CLI and the indexer this site runs.</p>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" class="mt-3 inline-flex items-center gap-1 text-xs underline decoration-ink-700 hover:decoration-white">deepdrogo/hashgram <ExternalLink class="size-3" aria-hidden="true" /></a>
          </li>
          <li class="card p-5">
            <ShieldCheck class="mb-3 size-4 text-ink-500" aria-hidden="true" />
            <h3 class="text-sm font-semibold">Verify the download</h3>
            <p class="mt-2 text-xs leading-relaxed text-ink-500">Each release ships SHA256SUMS.txt and a minisign-signed update manifest. Compare the hash before running an unsigned installer.</p>
            <a href={LATEST_RELEASE_URL} target="_blank" rel="noopener noreferrer" class="mt-3 inline-flex items-center gap-1 text-xs underline decoration-ink-700 hover:decoration-white">Latest release assets <ExternalLink class="size-3" aria-hidden="true" /></a>
          </li>
        </ul>
      </Section>

      <section class="card mb-4 flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <AtSign class="mb-4 size-5 text-ink-500" aria-hidden="true" />
          <h2 class="text-xl font-semibold">See the infrastructure underneath.</h2>
          <p class="mt-1 max-w-2xl text-sm text-ink-500">hashgram.io remains the official read-only explorer: live blocks, validators, supply, providers, rewards and governance from this server's own full node.</p>
        </div>
        <A href="/blocks" class="btn shrink-0">Open explorer</A>
      </section>
    </div>
  );
}
