import { Show, createMemo } from 'solid-js';
import { A } from '@solidjs/router';
import { formatHash, formatUhash, relativeTime, formatUtc, truncateMiddle, ADDR_RE, VALOPER_RE } from '../lib/format';
import { useLive } from '../lib/live';
import { CopyButton } from './ui';

/**
 * A hash / address / id: middle-truncated, monospace, full value on hover and
 * focus, copy on click, optionally a link.
 */
export function Hash(props: { value: string | null | undefined; href?: string; head?: number; tail?: number; full?: boolean; copy?: boolean; label?: string; class?: string }) {
  const v = () => props.value ?? '';
  const text = () => (props.full ? v() : truncateMiddle(v(), props.head ?? 8, props.tail ?? 5));
  const inner = (
    <span class={`font-mono text-[0.8125rem] ${props.full ? 'break-hash' : ''}`} title={v()}>
      {props.label ? <span class="mr-1 font-sans font-medium">{props.label}</span> : null}
      {text()}
    </span>
  );
  return (
    <span class={`inline-flex min-w-0 items-center gap-1 ${props.class ?? ''}`}>
      <Show when={props.href} fallback={inner}>
        <A href={props.href!} class="hover:underline" title={v()}>
          {inner}
        </A>
      </Show>
      <Show when={props.copy !== false && v()}>
        <CopyButton value={v()} />
      </Show>
    </span>
  );
}

/** Address with automatic link target (account / validator). */
export function Address(props: { value: string | null | undefined; label?: string; head?: number; tail?: number; copy?: boolean; full?: boolean }) {
  const href = () => {
    const v = props.value ?? '';
    if (VALOPER_RE.test(v)) return `/validators/${v}`;
    if (ADDR_RE.test(v)) return `/accounts/${v}`;
    return undefined;
  };
  return (
    <span class="inline-flex min-w-0 items-center gap-1.5">
      <Show when={props.label}>
        <A href={href() ?? '#'} class="font-medium hover:underline">
          {props.label}
        </A>
      </Show>
      <Hash value={props.value} href={href()} head={props.label ? 6 : props.head} tail={props.tail} copy={props.copy} full={props.full} class={props.label ? 'text-ink-500' : ''} />
    </span>
  );
}

export function Amount(props: { uhash: string | bigint | number | null | undefined; unit?: boolean; compact?: boolean; maxFraction?: number; class?: string; bold?: boolean }) {
  return (
    <span class={`tabular ${props.bold ? 'font-semibold' : ''} ${props.class ?? ''}`} title={formatUhash(props.uhash)}>
      {formatHash(props.uhash, { unit: props.unit ?? true, compact: props.compact, maxFraction: props.maxFraction })}
    </span>
  );
}

/** Relative time in the UI, absolute UTC on hover / as <time> datetime. */
export function TimeAgo(props: { iso: string | null | undefined; class?: string }) {
  const { now } = useLive();
  const rel = createMemo(() => relativeTime(props.iso, now()));
  return (
    <time dateTime={props.iso ?? undefined} title={formatUtc(props.iso)} class={`tabular ${props.class ?? ''}`}>
      {rel()}
    </time>
  );
}

export function Utc(props: { iso: string | null | undefined; class?: string }) {
  return (
    <time dateTime={props.iso ?? undefined} class={`font-mono text-[0.8125rem] ${props.class ?? ''}`}>
      {formatUtc(props.iso)}
    </time>
  );
}

export function HeightLink(props: { height: number | null | undefined; class?: string }) {
  return (
    <Show when={props.height !== null && props.height !== undefined} fallback={<span>—</span>}>
      <A href={`/blocks/${props.height}`} class={`font-mono tabular hover:underline ${props.class ?? ''}`}>
        {props.height!.toLocaleString('en-US')}
      </A>
    </Show>
  );
}

export function TxLink(props: { hash: string; head?: number; tail?: number }) {
  return <Hash value={props.hash} href={`/txs/${props.hash}`} head={props.head ?? 10} tail={props.tail ?? 6} />;
}

export function Success(props: { ok: boolean }) {
  return (
    <span class={`inline-flex items-center gap-1 font-mono text-xs ${props.ok ? '' : 'font-bold'}`} title={props.ok ? 'Success' : 'Failed'}>
      {props.ok ? '✓' : '✗'}
      <span class="sr-only">{props.ok ? 'success' : 'failed'}</span>
    </span>
  );
}
