import { type JSX, type ParentProps, Show, For, createSignal, splitProps, onCleanup } from 'solid-js';
import { Check, Copy, AlertTriangle, Inbox, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-solid';
import { ApiError } from '../lib/api';

export function Card(props: ParentProps<{ class?: string; title?: string; action?: JSX.Element; id?: string }>) {
  return (
    <section id={props.id} class={`card p-4 sm:p-5 ${props.class ?? ''}`}>
      <Show when={props.title || props.action}>
        <header class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <Show when={props.title}>
            <h2 class="min-w-0 text-sm font-semibold tracking-tight">{props.title}</h2>
          </Show>
          <div class="min-w-0 max-w-full">{props.action}</div>
        </header>
      </Show>
      {props.children}
    </section>
  );
}

export function Section(props: ParentProps<{ title: string; subtitle?: string; action?: JSX.Element; id?: string }>) {
  return (
    <section id={props.id} class="mb-8">
      <div class="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 class="text-lg font-semibold tracking-tight">{props.title}</h2>
          <Show when={props.subtitle}>
            <p class="text-sm text-ink-500">{props.subtitle}</p>
          </Show>
        </div>
        {props.action}
      </div>
      {props.children}
    </section>
  );
}

export function PageHeader(props: ParentProps<{ title: JSX.Element; lead?: JSX.Element; aside?: JSX.Element }>) {
  return (
    <header class="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0 max-w-full">
        <h1 class="break-words text-2xl font-bold tracking-tight sm:text-3xl">{props.title}</h1>
        <Show when={props.lead}>
          <p class="mt-1 max-w-3xl text-sm text-ink-500">{props.lead}</p>
        </Show>
        {props.children}
      </div>
      <div class="min-w-0 max-w-full">{props.aside}</div>
    </header>
  );
}

export function Stat(props: { label: string; value: JSX.Element; hint?: JSX.Element; spark?: JSX.Element; href?: string; live?: boolean }) {
  const inner = (
    <>
      <div class="flex items-center justify-between gap-2">
        <span class="text-xs font-medium uppercase tracking-wide text-ink-500">{props.label}</span>
        <Show when={props.live}>
          <span class="inline-block size-1.5 rounded-full bg-white animate-pulse-dot" aria-hidden="true" />
        </Show>
      </div>
      <div class="mt-1 break-words text-lg font-semibold tabular tracking-tight sm:text-2xl">{props.value}</div>
      <div class="mt-0.5 min-h-4 text-xs text-ink-500">{props.hint}</div>
      <Show when={props.spark}>
        <div class="mt-2 h-8">{props.spark}</div>
      </Show>
    </>
  );
  return (
    <Show when={props.href} fallback={<div class="card p-3 sm:p-4">{inner}</div>}>
      <a href={props.href} class="card card-hover block p-3 no-underline sm:p-4">
        {inner}
      </a>
    </Show>
  );
}

export function Badge(props: ParentProps<{ variant?: 'default' | 'solid' | 'muted'; title?: string; class?: string }>) {
  const v = props.variant ?? 'default';
  return (
    <span class={`badge ${v === 'solid' ? 'badge-solid' : ''} ${v === 'muted' ? 'badge-muted' : ''} ${props.class ?? ''}`} title={props.title}>
      {props.children}
    </span>
  );
}

export function Glyph(props: { ok: boolean | null | undefined; label?: string }) {
  const g = props.ok === null || props.ok === undefined ? '·' : props.ok ? '✓' : '✗';
  const t = props.label ?? (props.ok ? 'yes' : props.ok === false ? 'no' : 'unknown');
  return (
    <span class={`font-mono ${props.ok === false ? 'font-bold' : ''}`} role="img" aria-label={t} title={t}>
      {g}
    </span>
  );
}

export function Empty(props: { title?: string; hint?: JSX.Element; icon?: JSX.Element }) {
  return (
    <div class="flex flex-col items-center justify-center gap-2 py-12 text-center text-ink-500" role="status">
      {props.icon ?? <Inbox class="size-6" aria-hidden="true" />}
      <div class="text-sm font-medium text-white">{props.title ?? 'Nothing here yet'}</div>
      <Show when={props.hint}>
        <div class="max-w-md text-xs">{props.hint}</div>
      </Show>
    </div>
  );
}

export function ErrorState(props: { error: unknown; retry?: () => void; compact?: boolean }) {
  const e = () => props.error;
  const msg = () => {
    const err = e();
    if (err instanceof ApiError) return err.status === 404 ? 'Not found' : `${err.message} (HTTP ${err.status})`;
    if (err instanceof Error) return err.message;
    return String(err ?? 'Unknown error');
  };
  return (
    <div class={`flex flex-col items-center justify-center gap-2 text-center ${props.compact ? 'py-6' : 'py-12'}`} role="alert">
      <AlertTriangle class="size-6 text-ink-500" aria-hidden="true" />
      <div class="text-sm font-medium">{msg()}</div>
      <div class="text-xs text-ink-500">The API is read from this site's own node; if it is catching up, data will appear shortly.</div>
      <Show when={props.retry}>
        <button class="btn mt-2" onClick={() => props.retry?.()}>
          Retry
        </button>
      </Show>
    </div>
  );
}

export function Skeleton(props: { rows?: number; class?: string }) {
  return (
    <div class={`space-y-2 ${props.class ?? ''}`} style={{ 'min-height': (props.rows ?? 5) >= 8 ? '70dvh' : undefined }} aria-busy="true" aria-live="polite">
      <For each={Array.from({ length: props.rows ?? 5 })}>{() => <div class="skeleton h-8 w-full" />}</For>
    </div>
  );
}

export function KV(props: { items: Array<[JSX.Element, JSX.Element] | null | false | undefined>; class?: string }) {
  return (
    <dl class={`kv ${props.class ?? ''}`}>
      <For each={props.items.filter(Boolean) as Array<[JSX.Element, JSX.Element]>}>
        {([k, v]) => (
          <>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </>
        )}
      </For>
    </dl>
  );
}

export function CopyButton(props: { value: string; label?: string; class?: string }) {
  const [done, setDone] = createSignal(false);
  const copy = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(props.value);
      setDone(true);
      setTimeout(() => setDone(false), 1200);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <button
      type="button"
      class={`inline-flex size-6 items-center justify-center rounded text-ink-500 hover:bg-ink-900 hover:text-white ${props.class ?? ''}`}
      onClick={copy}
      aria-label={done() ? 'Copied' : (props.label ?? 'Copy to clipboard')}
      title={done() ? 'Copied' : 'Copy'}
    >
      <Show when={done()} fallback={<Copy class="size-3.5" aria-hidden="true" />}>
        <Check class="size-3.5" aria-hidden="true" />
      </Show>
    </button>
  );
}

export function Pager(props: { next: string | null | undefined; onNext: (c: string) => void; onReset: () => void; hasPrev: boolean; loading?: boolean }) {
  return (
    <nav class="mt-3 flex items-center justify-between gap-2 text-sm" aria-label="Pagination">
      <button class="btn" onClick={() => props.onReset()} disabled={!props.hasPrev}>
        <ChevronLeft class="size-4" aria-hidden="true" /> Latest
      </button>
      <button class="btn" onClick={() => props.next && props.onNext(props.next)} disabled={!props.next || props.loading}>
        Older <ChevronRight class="size-4" aria-hidden="true" />
      </button>
    </nav>
  );
}

export function Tabs<T extends string>(props: { tabs: Array<{ id: T; label: string; count?: number }>; value: T; onChange: (t: T) => void }) {
  return (
    <div role="tablist" class="mb-3 flex gap-1 border-b border-ink-900">
      <For each={props.tabs}>
        {(t) => (
          <button
            role="tab"
            aria-selected={props.value === t.id}
            class={`-mb-px border-b-2 px-3 py-2 text-sm ${props.value === t.id ? 'border-white font-semibold' : 'border-transparent text-ink-500 hover:text-white'}`}
            onClick={() => props.onChange(t.id)}
          >
            {t.label}
            <Show when={t.count !== undefined}>
              <span class="ml-1.5 text-xs text-ink-500 tabular">{t.count}</span>
            </Show>
          </button>
        )}
      </For>
    </div>
  );
}

export function ExtLink(props: ParentProps<{ href: string; class?: string }>) {
  return (
    <a href={props.href} target="_blank" rel="noopener noreferrer" class={`inline-flex items-center gap-1 underline decoration-ink-500 hover:decoration-white ${props.class ?? ''}`}>
      {props.children}
      <ExternalLink class="size-3" aria-hidden="true" />
    </a>
  );
}

export function Note(props: ParentProps<{ class?: string; title?: string }>) {
  return (
    <aside class={`rounded-md border border-ink-800 bg-ink-950 p-3 text-sm text-ink-500 ${props.class ?? ''}`}>
      <Show when={props.title}>
        <strong class="mr-1 text-white">{props.title}</strong>
      </Show>
      {props.children}
    </aside>
  );
}

export function RawToggle(props: { data: unknown; label?: string }) {
  const [open, setOpen] = createSignal(false);
  return (
    <div>
      <button class="btn" aria-expanded={open()} onClick={() => setOpen(!open())}>
        {open() ? 'Hide' : 'Show'} {props.label ?? 'raw JSON'}
      </button>
      <Show when={open()}>
        <pre class="mt-3 max-h-[32rem] overflow-auto rounded-md border border-ink-900 bg-ink-950 p-3 text-xs">{JSON.stringify(props.data, null, 2)}</pre>
      </Show>
    </div>
  );
}

export function Th(props: ParentProps<{ num?: boolean; class?: string }>) {
  const [, rest] = splitProps(props, ['children']);
  return (
    <th class={`${rest.num ? 'num' : ''} ${rest.class ?? ''}`} scope="col">
      {props.children}
    </th>
  );
}

/**
 * A table that turns into stacked cards under 768 px. Header texts are copied
 * into `data-label` on every cell (kept in sync for live-prepending rows via a
 * MutationObserver) and rendered by CSS as row labels.
 */
export function Table(props: ParentProps<{ class?: string }>) {
  const enhance = (table: HTMLTableElement) => {
    const label = () => {
      const heads = Array.from(table.querySelectorAll<HTMLTableCellElement>('thead th')).map((th) => th.textContent?.trim() ?? '');
      table.querySelectorAll<HTMLTableRowElement>('tbody tr').forEach((tr) => {
        Array.from(tr.children).forEach((td, i) => {
          if (heads[i] !== undefined && (td as HTMLElement).dataset.label !== heads[i]) (td as HTMLElement).dataset.label = heads[i];
        });
      });
    };
    queueMicrotask(label);
    const mo = new MutationObserver(() => label());
    const body = table.querySelector('tbody');
    if (body) mo.observe(body, { childList: true });
    onCleanup(() => mo.disconnect());
  };
  return (
    <table class={`table ${props.class ?? ''}`} ref={enhance}>
      {props.children}
    </table>
  );
}
