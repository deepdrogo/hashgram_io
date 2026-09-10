import { createResource, createEffect, createSignal, onCleanup, type Accessor, type Resource } from 'solid-js';
import { ApiError, getJson } from './api';

export interface Query<T> {
  data: Resource<T>;
  loading: () => boolean;
  error: () => ApiError | Error | null;
  refetch: () => void;
}

/**
 * Small wrapper over `createResource` for GET endpoints. `path` may be an
 * accessor; when it returns `null`/`undefined` the query is idle.
 */
export function useQuery<T>(path: Accessor<string | null | undefined> | string, opts: { refreshMs?: number } = {}): Query<T> {
  const src = typeof path === 'string' ? () => path : path;
  const [data, { refetch }] = createResource<T, string>(
    () => src() ?? undefined,
    (p) => getJson<T>(p),
  );

  if (opts.refreshMs) {
    createEffect(() => {
      const ms = opts.refreshMs!;
      const t = setInterval(() => {
        if (document.visibilityState === 'visible') void refetch();
      }, ms);
      onCleanup(() => clearInterval(t));
    });
  }

  return {
    data,
    loading: () => data.loading,
    error: () => (data.error as ApiError | Error | undefined) ?? null,
    refetch: () => void refetch(),
  };
}

/** Build a query string, skipping undefined/null/empty values. */
export function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    u.set(k, String(v));
  }
  const s = u.toString();
  return s ? `?${s}` : '';
}

export interface Paged<T> {
  items: () => T[];
  next: () => string | null | undefined;
  loading: () => boolean;
  error: () => Error | null;
  goNext: (cursor: string) => void;
  reset: () => void;
  hasPrev: () => boolean;
  refetch: () => void;
  extra: Resource<Record<string, unknown> & { items: T[]; next_cursor?: string | null }>;
}

/** Cursor pagination over a list endpoint returning `{items, next_cursor}`. */
export function usePaged<T>(path: Accessor<string>, params: Accessor<Record<string, string | number | undefined>> = () => ({}), limit = 25): Paged<T> {
  const [cursor, setCursor] = createSignal<string | null>(null);
  const key = () => `${path()}${qs({ ...params(), limit, cursor: cursor() })}`;
  const [data, { refetch }] = createResource(key, (k) => getJson<{ items: T[]; next_cursor?: string | null } & Record<string, unknown>>(k));
  // Reset the cursor whenever the base path or filters change.
  createEffect((prev: string | undefined) => {
    const k = `${path()}|${JSON.stringify(params())}`;
    if (prev !== undefined && prev !== k) setCursor(null);
    return k;
  });
  return {
    items: () => data()?.items ?? [],
    next: () => data()?.next_cursor,
    loading: () => data.loading,
    error: () => (data.error as Error | undefined) ?? null,
    goNext: (c) => setCursor(c),
    reset: () => setCursor(null),
    hasPrev: () => cursor() !== null,
    refetch: () => void refetch(),
    extra: data as Paged<T>['extra'],
  };
}

export function setTitle(title?: string) {
  document.title = title ? `${title} — Hashgram` : 'Hashgram — live explorer, network dashboard and documentation';
}
