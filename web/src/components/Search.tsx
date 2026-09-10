import { createSignal, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Search as SearchIcon, Loader2 } from 'lucide-solid';
import { getJson, type SearchResult } from '../lib/api';
import { classifyQuery } from '../lib/format';

export function routeFor(r: SearchResult): string | null {
  switch (r.type) {
    case 'block':
      return `/blocks/${r.id}`;
    case 'tx':
      return `/txs/${r.id}`;
    case 'account':
      return `/accounts/${r.id}`;
    case 'validator':
      return `/validators/${r.id}`;
    case 'username':
      return `/accounts/${r.id}`;
    case 'peer':
      return `/network?peer=${encodeURIComponent(r.id)}`;
    case 'proposal':
      return `/governance/${r.id}`;
    default:
      return null;
  }
}

/** Resolve a query: fast local classification, then the API for the rest. */
export async function resolveQuery(q: string): Promise<string | null> {
  const s = q.trim();
  if (!s) return null;
  const kind = classifyQuery(s);
  if (kind === 'height') return `/blocks/${s}`;
  if (kind === 'validator') return `/validators/${s}`;
  if (kind === 'address') return `/accounts/${s}`;
  if (kind === 'hash') {
    // could be a tx or a block hash; the API disambiguates
  }
  const r = await getJson<SearchResult>(`/search?q=${encodeURIComponent(s)}`);
  return routeFor(r);
}

export function SearchBox(props: { large?: boolean; autofocus?: boolean; class?: string }) {
  const nav = useNavigate();
  const [q, setQ] = createSignal('');
  const [busy, setBusy] = createSignal(false);
  const [miss, setMiss] = createSignal<string | null>(null);

  const submit = async (e: Event) => {
    e.preventDefault();
    const s = q().trim();
    if (!s) return;
    setBusy(true);
    setMiss(null);
    try {
      const to = await resolveQuery(s);
      if (to) {
        nav(to);
        setQ('');
      } else setMiss(`No block, transaction, account, validator, username or peer matches “${s}”.`);
    } catch {
      setMiss(`No result for “${s}”.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form role="search" onSubmit={submit} class={`relative ${props.class ?? ''}`}>
      <label for={props.large ? 'search-large' : 'search'} class="sr-only">
        Search by height, transaction hash, address, @username, validator or peer id
      </label>
      <SearchIcon class={`pointer-events-none absolute left-3 text-ink-500 ${props.large ? 'top-4 size-5' : 'top-2.5 size-4'}`} aria-hidden="true" />
      <input
        id={props.large ? 'search-large' : 'search'}
        class={`input pl-10 font-mono ${props.large ? 'h-14 text-base' : 'h-9 text-sm'}`}
        placeholder={props.large ? 'height · tx hash · hash1… · @username · hashvaloper1… · 12D3Koo…' : 'Search…'}
        value={q()}
        onInput={(e) => setQ(e.currentTarget.value)}
        autocomplete="off"
        spellcheck={false}
        autofocus={props.autofocus}
        aria-describedby={miss() ? 'search-miss' : undefined}
      />
      <Show when={busy()}>
        <Loader2 class={`absolute right-3 animate-spin text-ink-500 ${props.large ? 'top-4 size-5' : 'top-2.5 size-4'}`} aria-hidden="true" />
      </Show>
      <Show when={miss()}>
        <p id="search-miss" role="alert" class="mt-2 text-xs text-ink-500">
          {miss()}
        </p>
      </Show>
    </form>
  );
}
