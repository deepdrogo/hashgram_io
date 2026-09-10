import { For, Show, createEffect, createMemo, createResource, createSignal, onCleanup, onMount } from 'solid-js';
import { A, useParams, useNavigate } from '@solidjs/router';
import { Search as SearchIcon, Copy, Check, FileText, List } from 'lucide-solid';
import MiniSearch from 'minisearch';
import docsIndex from '../generated/docs-index.json';
import { setTitle } from '../lib/query';
import { Skeleton, Empty, ErrorState } from '../components/ui';
import { TimeAgo, Utc } from '../components/values';

interface PageMeta {
  slug: string;
  title: string;
  group: string;
  source: string;
  commit: string | null;
  modified: string | null;
  words: number;
  description: string;
}
interface Section {
  id: string;
  page: string;
  heading: string;
  anchor: string;
  text: string;
}
interface PageContent {
  slug: string;
  title: string;
  html: string;
  toc: Array<{ depth: number; id: string; text: string }>;
  source: string;
  commit: string | null;
  modified: string | null;
}

const INDEX = docsIndex as unknown as { generated: string; pages: PageMeta[]; sections: Section[] };
const GROUP_ORDER = ['Start here', 'Using the site', 'Protocol', 'Economics', 'Network', 'Operations', 'Social layer', 'Security', 'Reference'];

let mini: MiniSearch<Section> | null = null;
function search(): MiniSearch<Section> {
  if (!mini) {
    mini = new MiniSearch<Section>({ fields: ['heading', 'text'], storeFields: ['page', 'heading', 'anchor', 'text'], searchOptions: { boost: { heading: 3 }, prefix: true, fuzzy: 0.15 } });
    mini.addAll(INDEX.sections);
  }
  return mini;
}

function DocSearch() {
  const nav = useNavigate();
  const [q, setQ] = createSignal('');
  const [open, setOpen] = createSignal(false);
  const results = createMemo(() => {
    const s = q().trim();
    if (s.length < 2) return [];
    return search()
      .search(s)
      .slice(0, 12)
      .map((r) => ({ page: r.page as string, heading: r.heading as string, anchor: r.anchor as string, text: r.text as string, score: r.score }));
  });
  const titleOf = (slug: string) => INDEX.pages.find((p) => p.slug === slug)?.title ?? slug;
  const go = (r: { page: string; anchor: string }) => {
    nav(`/docs/${r.page}${r.anchor ? '#' + r.anchor : ''}`);
    setQ('');
    setOpen(false);
  };
  const snippet = (text: string) => {
    const s = q().trim().toLowerCase();
    const i = text.toLowerCase().indexOf(s.split(/\s+/)[0] ?? '');
    const start = Math.max(0, i - 60);
    return (start > 0 ? '…' : '') + text.slice(start, start + 160) + (text.length > start + 160 ? '…' : '');
  };
  return (
    <div class="relative">
      <label for="docs-search" class="sr-only">Search documentation</label>
      <SearchIcon class="pointer-events-none absolute left-3 top-2.5 size-4 text-ink-500" aria-hidden="true" />
      <input
        id="docs-search"
        class="input h-9 pl-9 text-sm"
        placeholder="Search docs…"
        value={q()}
        onInput={(e) => {
          setQ(e.currentTarget.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && results()[0]) go(results()[0]!);
          if (e.key === 'Escape') setOpen(false);
        }}
        autocomplete="off"
        role="combobox"
        aria-expanded={open() && results().length > 0}
        aria-controls="docs-search-results"
      />
      <Show when={open() && q().trim().length >= 2}>
        <ul id="docs-search-results" role="listbox" class="absolute z-30 mt-1 max-h-96 w-full overflow-auto rounded-md border border-ink-800 bg-ink-950 p-1 shadow-none">
          <Show when={results().length} fallback={<li class="px-3 py-2 text-sm text-ink-500">No matches.</li>}>
            <For each={results()}>
              {(r) => (
                <li role="option" aria-selected={false}>
                  <button class="block w-full rounded px-3 py-2 text-left hover:bg-ink-900" onMouseDown={(e) => e.preventDefault()} onClick={() => go(r)}>
                    <div class="text-xs text-ink-500">{titleOf(r.page)}</div>
                    <div class="text-sm font-medium">{r.heading}</div>
                    <div class="line-clamp-2 text-xs text-ink-500">{snippet(r.text)}</div>
                  </button>
                </li>
              )}
            </For>
          </Show>
        </ul>
      </Show>
    </div>
  );
}

function enhanceCode(root: HTMLElement) {
  root.querySelectorAll('pre').forEach((pre) => {
    if (pre.querySelector('button[data-copy]')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.copy = '1';
    btn.className = 'absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded border border-ink-800 bg-ink-950 text-ink-500 hover:text-white';
    btn.setAttribute('aria-label', 'Copy code');
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
    btn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(pre.querySelector('code')?.textContent ?? pre.textContent ?? '');
        btn.setAttribute('aria-label', 'Copied');
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
        setTimeout(() => {
          btn.setAttribute('aria-label', 'Copy code');
          btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
        }, 1200);
      } catch {
        /* ignore */
      }
    };
    pre.appendChild(btn);
  });
  // API embed placeholder → iframe of the indexer's rendered docs
  root.querySelectorAll<HTMLElement>('.api-embed').forEach((el) => {
    if (el.querySelector('iframe')) return;
    const f = document.createElement('iframe');
    f.src = el.dataset.src ?? '/api/v1/docs';
    f.title = 'API reference';
    f.loading = 'lazy';
    f.className = 'w-full rounded-md border border-ink-900 bg-black';
    f.style.height = '70vh';
    el.appendChild(f);
  });
}

export default function Docs() {
  const params = useParams<{ slug?: string }>();
  const slug = createMemo(() => (params.slug || 'what-is-hashgram').replace(/\/+$/, ''));
  const meta = createMemo(() => INDEX.pages.find((p) => p.slug === slug()));
  const [content] = createResource(slug, async (s): Promise<PageContent | null> => {
    const r = await fetch(`/docs-content/${s}.json`);
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return (await r.json()) as PageContent;
  });
  createEffect(() => setTitle(content()?.title ? `${content()!.title} — Docs` : 'Docs'));

  let article: HTMLElement | undefined;
  createEffect(() => {
    if (content() && article) {
      queueMicrotask(() => {
        enhanceCode(article!);
        const hash = window.location.hash.slice(1);
        if (hash) document.getElementById(hash)?.scrollIntoView({ block: 'start' });
        else window.scrollTo({ top: 0 });
      });
    }
  });

  // Active TOC item tracking
  const [active, setActive] = createSignal<string>('');
  onMount(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive((e.target as HTMLElement).id);
      },
      { rootMargin: '-80px 0px -70% 0px' },
    );
    createEffect(() => {
      if (content() && article) queueMicrotask(() => article!.querySelectorAll('h2, h3').forEach((h) => io.observe(h)));
    });
    onCleanup(() => io.disconnect());
  });

  const groups = createMemo(() => {
    const m = new Map<string, PageMeta[]>();
    for (const p of INDEX.pages) m.set(p.group, [...(m.get(p.group) ?? []), p]);
    return GROUP_ORDER.filter((g) => m.has(g)).map((g) => ({ group: g, pages: m.get(g)! })).concat([...m.keys()].filter((g) => !GROUP_ORDER.includes(g)).map((g) => ({ group: g, pages: m.get(g)! })));
  });

  const [copied, setCopied] = createSignal(false);
  const [navOpen, setNavOpen] = createSignal(false);
  const currentTitle = () => meta()?.title ?? 'Documentation';

  return (
    <div class="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)_12rem] lg:gap-8">
      <nav class="lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto" aria-label="Documentation">
        <DocSearch />
        <button class="btn mt-3 w-full justify-between lg:hidden" aria-expanded={navOpen()} aria-controls="docs-nav-list" onClick={() => setNavOpen(!navOpen())}>
          <span class="inline-flex items-center gap-2 truncate"><List class="size-4 shrink-0" aria-hidden="true" /> {navOpen() ? 'All pages' : currentTitle()}</span>
          <span class="font-mono text-ink-500">{navOpen() ? '▲' : '▼'}</span>
        </button>
        <div id="docs-nav-list" class={`${navOpen() ? 'block' : 'hidden'} lg:block`}>
        <For each={groups()}>
          {(g) => (
            <div class="mt-5">
              <div class="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-ink-500">{g.group}</div>
              <ul>
                <For each={g.pages}>
                  {(p) => (
                    <li>
                      <A href={`/docs/${p.slug}`} class={`block rounded px-2 py-1.5 text-sm lg:py-1 ${slug() === p.slug ? 'bg-ink-900 font-medium' : 'text-ink-500 hover:text-white'}`} aria-current={slug() === p.slug ? 'page' : undefined} onClick={() => setNavOpen(false)}>
                        {p.title}
                      </A>
                    </li>
                  )}
                </For>
              </ul>
            </div>
          )}
        </For>
        <Show when={INDEX.pages.length <= 7}>
          <p class="mt-6 px-2 text-xs text-ink-500">The repository's <span class="font-mono">docs/</span> directory was not present at build time; only the web-native pages are shown.</p>
        </Show>
        </div>
      </nav>

      <div class="min-w-0">
        <Show when={!content.error} fallback={<ErrorState error={content.error} />}>
          <Show when={!content.loading} fallback={<Skeleton rows={14} />}>
            <Show when={content()} fallback={<Empty title="No such page" hint={<span>There is no document at <span class="font-mono">/docs/{slug()}</span>.</span>} icon={<FileText class="size-6" aria-hidden="true" />} />}>
              {(c) => (
                <article class="prose" ref={(el) => (article = el)}>
                  <div innerHTML={c().html} />
                  <footer class="mt-12 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-ink-900 pt-4 text-xs text-ink-500">
                    <span>
                      Source <span class="font-mono">{c().source}</span>
                    </span>
                    <Show when={c().commit}>
                      <span class="inline-flex items-center gap-1">
                        commit <span class="font-mono">{c().commit!.slice(0, 10)}</span>
                        <button
                          class="inline-flex size-5 items-center justify-center rounded hover:bg-ink-900"
                          aria-label="Copy commit hash"
                          onClick={async () => {
                            await navigator.clipboard.writeText(c().commit!);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 1200);
                          }}
                        >
                          <Show when={copied()} fallback={<Copy class="size-3" aria-hidden="true" />}>
                            <Check class="size-3" aria-hidden="true" />
                          </Show>
                        </button>
                      </span>
                    </Show>
                    <Show when={c().modified}>
                      <span>
                        last modified <Utc iso={c().modified} class="text-xs" /> (<TimeAgo iso={c().modified} />)
                      </span>
                    </Show>
                    <Show when={meta()}>
                      <span>{meta()!.words.toLocaleString('en-US')} words</span>
                    </Show>
                  </footer>
                </article>
              )}
            </Show>
          </Show>
        </Show>
      </div>

      <aside class="hidden lg:block lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto" aria-label="On this page">
        <Show when={content()?.toc.length}>
          <div class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-500">On this page</div>
          <ul class="space-y-1 border-l border-ink-900 text-xs">
            <For each={content()!.toc}>
              {(t) => (
                <li>
                  <a href={`#${t.id}`} class={`-ml-px block border-l py-1 ${t.depth === 3 ? 'pl-6' : 'pl-3'} ${active() === t.id ? 'border-white text-white' : 'border-transparent text-ink-500 hover:text-white'}`}>
                    {t.text}
                  </a>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </aside>
    </div>
  );
}
