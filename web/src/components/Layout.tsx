import { type ParentProps, Show, For, createSignal, createMemo } from 'solid-js';
import { A, useLocation } from '@solidjs/router';
import { Menu, X, Radio, Boxes, ArrowLeftRight, Wallet, ShieldCheck, Coins, UserRound, Vote, Network as NetworkIcon, BookOpen, Activity, Palette, Inbox, ChevronDown, type LucideProps } from 'lucide-solid';
import type { Component } from 'solid-js';
import { useLive } from '../lib/live';
import { MAINNET_GENESIS_SHA256 } from '../lib/genesis';
import { Wordmark } from './Logo';
import { SearchBox } from './Search';
import { TimeAgo } from './values';

export const GITHUB_URL = 'https://github.com/deepdrogo/hashgram';

/** GitHub mark (Lucide dropped brand icons); monochrome, currentColor. */
export function Github(props: { class?: string; 'aria-hidden'?: boolean | 'true' | 'false' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" class={props.class} aria-hidden={props['aria-hidden']}>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.17c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.24 2.76.12 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.26 5.67.41.36.78 1.06.78 2.13v3.16c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

type NavItem = { href: string; label: string; icon: Component<LucideProps> };

const NAV: NavItem[] = [
  { href: '/one', label: 'Hashgram One', icon: Inbox },
  { href: '/blocks', label: 'Blocks', icon: Boxes },
  { href: '/txs', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/accounts', label: 'Accounts', icon: Wallet },
  { href: '/validators', label: 'Validators', icon: ShieldCheck },
  { href: '/rewards', label: 'Rewards', icon: Coins },
  { href: '/founder', label: 'Founder', icon: UserRound },
  { href: '/governance', label: 'Governance', icon: Vote },
  { href: '/network', label: 'Network', icon: NetworkIcon },
  { href: '/docs', label: 'Docs', icon: BookOpen },
];

const DESKTOP_PRIMARY = NAV.filter((item) => ['/one', '/validators', '/rewards', '/governance', '/network', '/docs'].includes(item.href));
const DESKTOP_EXPLORER = NAV.filter((item) => ['/blocks', '/txs', '/accounts'].includes(item.href));
const DESKTOP_MORE: NavItem[] = [
  NAV.find((item) => item.href === '/founder')!,
  { href: '/status', label: 'Status', icon: Activity },
  { href: '/brand', label: 'Brand', icon: Palette },
];

function DesktopNavGroup(props: { label: string; items: NavItem[]; active: (href: string) => boolean }) {
  let menu: HTMLDetailsElement | undefined;
  const groupActive = () => props.items.some((item) => props.active(item.href));
  const close = () => menu?.removeAttribute('open');

  return (
    <details
      ref={menu}
      class="group relative"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          close();
          menu?.querySelector('summary')?.focus();
        }
      }}
      onFocusOut={(event) => {
        if (!menu?.contains(event.relatedTarget as Node | null)) close();
      }}
    >
      <summary
        class={`inline-flex cursor-pointer list-none items-center gap-1 rounded-md px-2.5 py-1.5 text-sm [&::-webkit-details-marker]:hidden ${groupActive() ? 'bg-ink-900 font-medium' : 'text-ink-500 hover:text-white'}`}
        aria-label={`${props.label} menu`}
      >
        {props.label}
        <ChevronDown class="size-3 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div class="absolute left-0 top-full z-50 mt-2 min-w-48 rounded-lg border border-ink-800 bg-black p-1 shadow-xl">
        <For each={props.items}>
          {(item) => (
            <A
              href={item.href}
              class={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${props.active(item.href) ? 'bg-ink-900 font-medium' : 'text-ink-500 hover:bg-ink-950 hover:text-white'}`}
              aria-current={props.active(item.href) ? 'page' : undefined}
              onClick={close}
            >
              <item.icon class="size-4 shrink-0" aria-hidden="true" />
              {item.label}
            </A>
          )}
        </For>
      </div>
    </details>
  );
}

export function LiveDot(props: { withLabel?: boolean }) {
  const { store } = useLive();
  const label = () => (store.state === 'live' ? 'Live' : store.state === 'polling' ? 'Polling' : store.state === 'connecting' ? 'Connecting' : 'Offline');
  const title = () =>
    store.state === 'live' ? 'Receiving events over Server-Sent Events from this site\u2019s own node' : store.state === 'polling' ? 'Event stream unavailable — refreshing every 6 s' : store.state === 'connecting' ? 'Connecting to the event stream' : 'The API is unreachable';
  return (
    <A href="/status" class="inline-flex items-center gap-1.5 text-xs text-ink-500 hover:text-white" title={title()} aria-live="polite">
      <span class={`inline-block size-1.5 rounded-full ${store.state === 'live' ? 'bg-white animate-pulse-dot' : store.state === 'polling' ? 'border border-white' : 'bg-ink-700'}`} aria-hidden="true" />
      <Show when={props.withLabel !== false}>
        <span>{label()}</span>
      </Show>
    </A>
  );
}

export function Banner() {
  const { store } = useLive();
  const lag = createMemo(() => (store.head ? store.head.height - store.head.indexed_height : 0));
  return (
    <>
      <Show when={store.genesisOk === false}>
        <div role="alert" class="border-b border-white bg-white px-4 py-3 text-center text-sm font-semibold text-black">
          This API is not serving Hashgram Mainnet — genesis hash does not match <span class="font-mono font-normal">{MAINNET_GENESIS_SHA256.slice(0, 8)}…{MAINNET_GENESIS_SHA256.slice(-4)}</span>. The explorer is disabled.
        </div>
      </Show>
      <Show when={store.state === 'down'}>
        <div role="alert" class="border-b border-ink-800 bg-ink-950 px-4 py-2 text-center text-xs text-ink-500">
          The API is unreachable. Showing the last known data{store.error ? ` — ${store.error}` : ''}.
        </div>
      </Show>
      <Show when={store.genesisOk !== false && store.state !== 'down' && lag() > 10}>
        <div role="status" class="border-b border-ink-800 bg-ink-950 px-4 py-2 text-center text-xs text-ink-500">
          Indexer is {lag().toLocaleString('en-US')} blocks behind the node; lists may lag the live head.
        </div>
      </Show>
    </>
  );
}

export function Layout(props: ParentProps) {
  const loc = useLocation();
  const { store } = useLive();
  const [open, setOpen] = createSignal(false);
  const active = (href: string) => loc.pathname === href || loc.pathname.startsWith(href + '/');
  const isHome = () => loc.pathname === '/';

  return (
    <div class="flex min-h-dvh flex-col">
      <a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-black">
        Skip to content
      </a>
      <Banner />
      <header class="sticky top-0 z-40 border-b border-ink-900 bg-black/90 backdrop-blur">
        <div class="mx-auto flex h-14 max-w-[96rem] items-center gap-3 px-4">
          <A href="/" class="shrink-0" aria-label="Hashgram home">
            <Wordmark height={20} />
          </A>
          <nav class="hidden min-w-0 flex-1 items-center gap-0.5 xl:flex" aria-label="Primary">
            <For each={DESKTOP_PRIMARY.slice(0, 1)}>
              {(n) => (
                <A href={n.href} class={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm ${active(n.href) ? 'bg-ink-900 font-medium' : 'text-ink-500 hover:text-white'}`} aria-current={active(n.href) ? 'page' : undefined}>
                  <n.icon class="size-3.5 shrink-0" aria-hidden="true" />
                  {n.label}
                </A>
              )}
            </For>
            <DesktopNavGroup label="Explorer" items={DESKTOP_EXPLORER} active={active} />
            <For each={DESKTOP_PRIMARY.slice(1)}>
              {(n) => (
                <A href={n.href} class={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm ${active(n.href) ? 'bg-ink-900 font-medium' : 'text-ink-500 hover:text-white'}`} aria-current={active(n.href) ? 'page' : undefined}>
                  <n.icon class="size-3.5 shrink-0" aria-hidden="true" />
                  {n.label}
                </A>
              )}
            </For>
            <DesktopNavGroup label="More" items={DESKTOP_MORE} active={active} />
          </nav>
          <div class="ml-auto flex items-center gap-3">
            <Show when={!isHome()}>
              <SearchBox class="hidden w-56 2xl:block" />
            </Show>
            <div class="flex items-center gap-2 sm:hidden">
              <Show when={store.head}>
                <A href={`/blocks/${store.head!.height}`} class="font-mono text-xs tabular text-ink-500" title="Latest height">
                  #{store.head!.height.toLocaleString('en-US')}
                </A>
              </Show>
              <LiveDot withLabel={false} />
            </div>
            <div class="hidden items-center gap-3 sm:flex">
              <span class="inline-block min-w-[5.5rem] text-right font-mono text-xs tabular text-ink-500">
                <Show when={store.head}>
                  <A href={`/blocks/${store.head!.height}`} class="hover:text-white" title="Latest height">
                    #{store.head!.height.toLocaleString('en-US')}
                  </A>
                </Show>
              </span>
              <span class="inline-block min-w-[4.5rem]">
                <LiveDot />
              </span>
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" class="inline-flex size-8 items-center justify-center rounded-md text-ink-500 hover:bg-ink-900 hover:text-white" aria-label="Hashgram on GitHub" title="Source code on GitHub">
                <Github class="size-4" aria-hidden="true" />
              </a>
            </div>
            <button class="btn size-9 justify-center px-0 xl:hidden" aria-label={open() ? 'Close menu' : 'Open menu'} aria-expanded={open()} onClick={() => setOpen(!open())}>
              <Show when={open()} fallback={<Menu class="size-4" aria-hidden="true" />}>
                <X class="size-4" aria-hidden="true" />
              </Show>
            </button>
          </div>
        </div>
        <Show when={open()}>
          <nav class="border-t border-ink-900 px-4 py-3 xl:hidden" aria-label="Primary mobile">
            <SearchBox class="mb-3" />
            <ul class="grid grid-cols-2 gap-1">
              <For each={NAV}>
                {(n) => (
                  <li>
                    <A href={n.href} class={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${active(n.href) ? 'bg-ink-900 font-medium' : 'text-ink-500'}`} onClick={() => setOpen(false)}>
                      <n.icon class="size-4 shrink-0" aria-hidden="true" />
                      {n.label}
                    </A>
                  </li>
                )}
              </For>
              <li>
                <A href="/status" class="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-ink-500" onClick={() => setOpen(false)}>
                  <Activity class="size-4 shrink-0" aria-hidden="true" /> Status
                </A>
              </li>
              <li>
                <A href="/brand" class="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-ink-500" onClick={() => setOpen(false)}>
                  <Palette class="size-4 shrink-0" aria-hidden="true" /> Brand
                </A>
              </li>
              <li>
                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-ink-500">
                  <Github class="size-4 shrink-0" aria-hidden="true" /> GitHub
                </a>
              </li>
            </ul>
          </nav>
        </Show>
      </header>

      <main id="main" class={`mx-auto w-full max-w-7xl flex-1 overflow-x-clip px-4 py-6 sm:py-8 min-h-[calc(100dvh-3.5rem)] ${store.genesisOk === false ? 'pointer-events-none select-none opacity-30' : ''}`} aria-disabled={store.genesisOk === false}>
        {props.children}
      </main>

      <footer class="border-t border-ink-900">
        <div class="mx-auto grid max-w-7xl gap-6 px-4 py-8 text-sm text-ink-500 md:grid-cols-3">
          <div>
            <Wordmark height={16} class="text-white" />
            <p class="mt-2 max-w-xs text-xs">Hashgram One is private mail, storage and shared spaces on Hashgram Mainnet. This site is its live explorer, network dashboard and documentation.</p>
            <p class="mt-2 max-w-xs text-xs">The protocol, chain, node, SDK and indexer are open source at <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" class="text-white hover:underline">github.com/deepdrogo/hashgram</a>.</p>
          </div>
          <div class="text-xs">
            <p class="font-medium text-white">Read-only</p>
            <p class="mt-1">This site holds no keys, signs nothing, broadcasts nothing and shows no prices. No accounts, no analytics, no third-party scripts. Peer and visitor IPs are truncated to /24 in every log.</p>
          </div>
          <div class="flex flex-col gap-0.5 text-xs">
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 py-1 font-medium text-white hover:underline">
              <Github class="size-3.5" aria-hidden="true" /> Source code on GitHub
            </a>
            <a href={`${GITHUB_URL}/tree/main/docs`} target="_blank" rel="noopener noreferrer" class="inline-block py-1 hover:text-white">
              Protocol documentation (repository)
            </a>
            <A href="/one" class="inline-block py-1 hover:text-white">
              Hashgram One
            </A>
            <A href="/status" class="inline-block py-1 hover:text-white">
              Status
            </A>
            <A href="/docs/api" class="inline-block py-1 hover:text-white">
              API reference
            </A>
            <A href="/docs/run-a-node" class="inline-block py-1 hover:text-white">
              Run a node
            </A>
            <A href="/brand" class="inline-block py-1 hover:text-white">
              Brand assets
            </A>
            <Show when={store.head}>
              <span class="mt-2 font-mono">
                head #{store.head!.height.toLocaleString('en-US')} · <TimeAgo iso={store.head!.latest_block_time} />
              </span>
            </Show>
          </div>
        </div>
        <div class="flex items-center justify-center gap-2 pb-6 text-[11px] text-ink-500">
          <Radio class="size-3" aria-hidden="true" /> genesis {MAINNET_GENESIS_SHA256.slice(0, 8)}…{MAINNET_GENESIS_SHA256.slice(-4)}
        </div>
      </footer>
    </div>
  );
}
