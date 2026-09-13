import { onMount, For } from 'solid-js';
import { A } from '@solidjs/router';
import {
  Archive,
  AtSign,
  CircleDollarSign,
  ContactRound,
  Database,
  ExternalLink,
  HardDrive,
  Inbox,
  KeyRound,
  Network,
  Newspaper,
  ShieldCheck,
  UsersRound,
  Wallet,
} from 'lucide-solid';
import type { Component } from 'solid-js';
import type { LucideProps } from 'lucide-solid';
import { Badge, Card, Note, Section } from '../components/ui';
import { setTitle } from '../lib/query';
import { GITHUB_URL } from '../components/Layout';

type Pillar = {
  name: string;
  icon: Component<LucideProps>;
  summary: string;
  detail: string;
};

const PILLARS: Pillar[] = [
  { name: 'Mail', icon: Inbox, summary: 'Private mail, without a mailbox provider.', detail: 'End-to-end encrypted HashMail, threads, attachments, receipts and a Requests folder. Ordinary e-mail can cross an explicitly labelled gateway.' },
  { name: 'Drive', icon: HardDrive, summary: 'Files encrypted before they leave your device.', detail: 'Folders, versions, trash and snapshot or live sharing. Nodes store authenticated ciphertext; capabilities grant access without making a file public.' },
  { name: 'People', icon: ContactRound, summary: 'One identity, discovered by name or address.', detail: 'On-chain device keys and usernames; private contact, friend, block, mute and trust state stays on your devices.' },
  { name: 'Feed', icon: Newspaper, summary: 'Signed posts, in chronological order.', detail: 'Public posts, comments and reactions have no ranking algorithm. Circle posts are private MLS messages merged into the feed by the client.' },
  { name: 'Spaces', icon: UsersRound, summary: 'A shared place for a family, team or project.', detail: 'Role-enforced group mail, announcements, posts and a shared Drive. Membership and content remain off chain.' },
  { name: 'Earn', icon: CircleDollarSign, summary: 'Useful service instead of mining.', detail: 'Store and relay for others, then earn from a finite reserve using chain challenges and client-signed receipts—not claimed capacity.' },
  { name: 'Wallet', icon: Wallet, summary: 'One fixed-supply asset: HASH.', detail: 'Read balances through interchangeable P2P relays, send, stake and register a username. No mint module and no transfer tax.' },
  { name: 'Network', icon: Network, summary: 'Choose the infrastructure you trust.', detail: 'Peers, validators, providers and statistics come from your node or an indexer you choose, never a required central service.' },
];

export default function One() {
  onMount(() => setTitle('Hashgram One'));

  return (
    <div>
      <section class="mb-12 border-b border-ink-900 pb-10 pt-3 sm:pt-8">
        <div class="mb-5 flex flex-wrap items-center gap-2">
          <Badge variant="solid">Hashgram One</Badge>
          <Badge variant="muted">Application platform</Badge>
          <Badge variant="muted">Mainnet live</Badge>
        </div>
        <h1 class="max-w-5xl text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
          One identity. One inbox.<br />One vault. One network.
        </h1>
        <p class="mt-6 max-w-3xl text-base leading-relaxed text-ink-500 sm:text-lg">
          Hashgram One is a private communication and storage platform built on Hashgram Mainnet. The chain and peer-to-peer swarm are infrastructure; people use Mail, Drive, People, Feed, Spaces, Earn, Wallet and Network.
        </p>
        <div class="mt-7 flex flex-wrap gap-3">
          <a href="https://github.com/deepdrogo/hashgram_windows/releases/latest" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
            Download for Windows <ExternalLink class="size-3.5" aria-hidden="true" />
          </a>
          <A href="/docs/what-is-hashgram" class="btn">Understand Hashgram</A>
          <A href="/docs/hashgram-one-architecture" class="btn">Read the architecture</A>
          <a href={`${GITHUB_URL}#quick-start`} target="_blank" rel="noopener noreferrer" class="btn">
            Use the CLI <ExternalLink class="size-3.5" aria-hidden="true" />
          </a>
        </div>
        <p class="mt-4 max-w-3xl text-xs leading-relaxed text-ink-500">
          Hashgram One for Windows v0.2.1 is released with the complete workspace, automatic P2P recovery after an outage and guided on-chain device setup over the same Rust SDK. Native mobile clients remain planned.
        </p>
      </section>

      <Section title="The product, not the plumbing" subtitle="Eight surfaces over one identity and one encrypted local state.">
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <For each={PILLARS}>
            {(pillar) => (
              <Card class="h-full">
                <pillar.icon class="mb-5 size-5 text-ink-500" aria-hidden="true" />
                <h3 class="text-lg font-semibold">{pillar.name}</h3>
                <p class="mt-1 text-sm font-medium">{pillar.summary}</p>
                <p class="mt-3 text-xs leading-relaxed text-ink-500">{pillar.detail}</p>
              </Card>
            )}
          </For>
        </div>
      </Section>

      <Section title="Private by architecture" subtitle="Global facts reach consensus. Private content never does.">
        <div class="grid gap-4 lg:grid-cols-3">
          <Card title="On your devices">
            <KeyRound class="mb-3 size-5 text-ink-500" aria-hidden="true" />
            <p class="text-sm">Mnemonic, device secrets, Drive keys, decrypted mail, folders, contacts and trust state.</p>
            <p class="mt-3 text-xs text-ink-500">The local store is encrypted. Cryptography stays in Rust; a client UI receives views, not secret keys.</p>
          </Card>
          <Card title="On store and relay nodes">
            <Archive class="mb-3 size-5 text-ink-500" aria-hidden="true" />
            <p class="text-sm">MLS envelopes and content-addressed encrypted blobs.</p>
            <p class="mt-3 text-xs text-ink-500">A node can observe limited delivery metadata such as mailbox id, size and time, but cannot read a subject, body, filename or Space event.</p>
          </Card>
          <Card title="On chain">
            <Database class="mb-3 size-5 text-ink-500" aria-hidden="true" />
            <p class="text-sm">Identity keys, usernames, balances, validators, providers and governance.</p>
            <p class="mt-3 text-xs text-ink-500">Only facts needing global agreement are public. Nothing private is indexed by hashgram.io.</p>
          </Card>
        </div>
      </Section>

      <Section title="How one action travels" subtitle="Example: sending native HashMail to @bob.">
        <ol class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['01', 'Resolve', 'The client resolves @bob and active device keys from the chain.'],
            ['02', 'Encrypt', 'Mail becomes a versioned application message inside an MLS group.'],
            ['03', 'Relay', 'Interchangeable store nodes carry ciphertext to each device mailbox.'],
            ['04', 'Verify', 'Bob’s client authenticates the sender, decrypts locally and files Inbox or Requests.'],
          ].map(([number, title, text]) => (
            <li class="card p-5">
              <span class="font-mono text-xs text-ink-500">{number}</span>
              <h3 class="mt-8 font-semibold">{title}</h3>
              <p class="mt-2 text-xs leading-relaxed text-ink-500">{text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="What is available today" subtitle="The repository distinguishes implemented code from planned upgrades.">
        <div class="grid gap-4 lg:grid-cols-2">
          <Card title="Implemented and verified">
            <ul class="space-y-3 text-sm">
              <li class="flex gap-2"><ShieldCheck class="mt-0.5 size-4 shrink-0" aria-hidden="true" /> HashMail, HashDrive, People, Feed, Circles and Spaces through the SDK and CLI.</li>
              <li class="flex gap-2"><ShieldCheck class="mt-0.5 size-4 shrink-0" aria-hidden="true" /> Encrypted local store, device sync, backup, wallet and provider facades.</li>
              <li class="flex gap-2"><ShieldCheck class="mt-0.5 size-4 shrink-0" aria-hidden="true" /> Mainnet chain, store/relay/media node, indexer and optional e-mail gateway.</li>
              <li class="flex gap-2"><ShieldCheck class="mt-0.5 size-4 shrink-0" aria-hidden="true" /> End-to-end acceptance coverage over the same HashgramOne facade clients use.</li>
              <li class="flex gap-2"><ShieldCheck class="mt-0.5 size-4 shrink-0" aria-hidden="true" /> Hashgram One for Windows v0.2.1: complete UI, automatic P2P recovery, guided device registration and safe local-vault sign out.</li>
            </ul>
          </Card>
          <Card title="Still planned or incomplete">
            <ul class="space-y-3 text-sm text-ink-500">
              <li>• Native mobile clients; Windows is the first complete desktop release.</li>
              <li>• Push notifications, group-call E2EE and a Merkle light client.</li>
              <li>• Provider-side long-term storage lease wire flow and escrow market.</li>
              <li>• Automatic gas funding for new identities; welcome rewards are disabled until an attestor exists.</li>
            </ul>
          </Card>
        </div>
        <Note class="mt-4" title="Why this matters.">
          Hashgram One did not change Mainnet consensus or tokenomics. It adds a private application protocol and SDK over the existing chain and P2P network, so older Mainnet nodes remain interoperable.
        </Note>
      </Section>

      <section class="card mb-4 flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <AtSign class="mb-4 size-5 text-ink-500" aria-hidden="true" />
          <h2 class="text-xl font-semibold">See the infrastructure underneath.</h2>
          <p class="mt-1 max-w-2xl text-sm text-ink-500">hashgram.io remains the official read-only explorer: live blocks, validators, supply, providers, rewards and governance from this server’s own full node.</p>
        </div>
        <div class="flex shrink-0 flex-wrap gap-2">
          <a href="https://github.com/deepdrogo/hashgram_windows/releases/latest" class="btn btn-primary">Download for Windows</a>
          <A href="/blocks" class="btn">Open explorer</A>
        </div>
      </section>
    </div>
  );
}
