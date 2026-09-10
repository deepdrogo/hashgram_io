/**
 * Formatting helpers. Amounts arrive as `uhash` decimal strings and are handled
 * with BigInt end-to-end — never as floating point.
 */

export const UHASH_PER_HASH = 1_000_000n;
export const DECIMALS = 6;

const intFmt = new Intl.NumberFormat('en-US');
const compactFmt = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 });

export function toBigInt(v: string | number | bigint | null | undefined): bigint {
  if (v === null || v === undefined || v === '') return 0n;
  if (typeof v === 'bigint') return v;
  if (typeof v === 'number') return BigInt(Math.trunc(v));
  const s = v.trim();
  if (!/^-?\d+$/.test(s)) {
    // tolerate decimal strings like "12.500000" by truncating
    const m = /^(-?\d+)(?:\.\d+)?$/.exec(s);
    return m ? BigInt(m[1]!) : 0n;
  }
  return BigInt(s);
}

/** Split a uhash amount into whole HASH and a zero-padded 6-digit fraction. */
export function splitUhash(v: string | bigint | number | null | undefined): { neg: boolean; whole: bigint; frac: string } {
  let n = toBigInt(v);
  const neg = n < 0n;
  if (neg) n = -n;
  const whole = n / UHASH_PER_HASH;
  const frac = (n % UHASH_PER_HASH).toString().padStart(DECIMALS, '0');
  return { neg, whole, frac };
}

export interface HashFormatOptions {
  /** Maximum fraction digits (default 6, trailing zeros trimmed). */
  maxFraction?: number;
  /** Minimum fraction digits (default 0). */
  minFraction?: number;
  /** Append the unit. */
  unit?: boolean;
  /** Use compact notation for large values (e.g. 1.2M). */
  compact?: boolean;
}

/** Format uhash → HASH with thousands separators and ≤ 6 decimals. */
export function formatHash(v: string | bigint | number | null | undefined, opts: HashFormatOptions = {}): string {
  const { maxFraction = 6, minFraction = 0, unit = false, compact = false } = opts;
  const { neg, whole, frac } = splitUhash(v);
  if (compact && whole >= 1_000_000n) {
    const approx = Number(whole) + Number(frac) / 1e6;
    return `${neg ? '-' : ''}${compactFmt.format(approx)}${unit ? ' HASH' : ''}`;
  }
  let f = frac.slice(0, Math.max(0, Math.min(DECIMALS, maxFraction)));
  f = f.replace(/0+$/, '');
  while (f.length < minFraction) f += '0';
  const w = intFmt.format(whole);
  return `${neg ? '-' : ''}${w}${f ? '.' + f : ''}${unit ? ' HASH' : ''}`;
}

export function formatUhash(v: string | bigint | number | null | undefined): string {
  return `${intFmt.format(toBigInt(v))} uhash`;
}

export function formatInt(v: number | bigint | string | null | undefined): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'string') return intFmt.format(toBigInt(v));
  return intFmt.format(v);
}

export function formatCompact(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return compactFmt.format(v);
}

export function formatPct(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return `${v.toFixed(digits)} %`;
}

/** Parts-per-million → percentage string. */
export function ppmToPct(ppm: number | null | undefined, digits = 2): string {
  if (ppm === null || ppm === undefined) return '—';
  return `${(ppm / 10_000).toFixed(digits)} %`;
}

/** Decimal string like "0.050000000000000000" → "5.00 %". */
export function decToPct(dec: string | null | undefined, digits = 2): string {
  if (!dec) return '—';
  const n = Number(dec);
  if (Number.isNaN(n)) return dec;
  return `${(n * 100).toFixed(digits)} %`;
}

/** Ratio of two uhash strings as a percentage number (0-100). */
export function ratioPct(part: string | bigint | undefined | null, total: string | bigint | undefined | null): number {
  const p = toBigInt(part);
  const t = toBigInt(total);
  if (t === 0n) return 0;
  return Number((p * 1_000_000n) / t) / 10_000;
}

export function formatBytes(v: string | number | bigint | null | undefined): string {
  const n = Number(toBigInt(v));
  if (!n) return '0 B';
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log2(n) / 10));
  return `${(n / 2 ** (10 * i)).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

/** Middle-truncate a hash or address: hash13t8…ynjpy */
export function truncateMiddle(s: string | null | undefined, head = 8, tail = 5): string {
  if (!s) return '';
  if (s.length <= head + tail + 1) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

export function relativeTime(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return '—';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '—';
  let d = Math.round((now - t) / 1000);
  const future = d < 0;
  d = Math.abs(d);
  let out: string;
  if (d < 1) out = 'now';
  else if (d < 60) out = `${d}s`;
  else if (d < 3600) out = `${Math.floor(d / 60)}m ${d % 60}s`;
  else if (d < 86_400) out = `${Math.floor(d / 3600)}h ${Math.floor((d % 3600) / 60)}m`;
  else out = `${Math.floor(d / 86_400)}d ${Math.floor((d % 86_400) / 3600)}h`;
  if (out === 'now') return out;
  return future ? `in ${out}` : `${out} ago`;
}

export function formatUtc(iso: string | null | undefined): string {
  if (!iso) return '—';
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return iso;
  return t.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '—';
  const s = Math.max(0, Math.round(seconds));
  const d = Math.floor(s / 86_400);
  const h = Math.floor((s % 86_400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m && !d) parts.push(`${m}m`);
  if (!parts.length) parts.push(`${s % 60}s`);
  return parts.join(' ');
}

export function formatMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || Number.isNaN(ms)) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

/** Cosmos message type URL → short name (`/cosmos.bank.v1beta1.MsgSend` → `Send`). */
export function shortMsgType(typeUrl: string | null | undefined): string {
  if (!typeUrl) return '—';
  const last = typeUrl.split('.').pop() ?? typeUrl;
  return last.replace(/^Msg/, '');
}

export function statusGlyph(ok: boolean | null | undefined): string {
  if (ok === null || ok === undefined) return '·';
  return ok ? '✓' : '✗';
}

export const HASH_RE = /^[0-9A-Fa-f]{64}$/;
export const ADDR_RE = /^hash1[02-9ac-hj-np-z]{38,58}$/;
export const VALOPER_RE = /^hashvaloper1[02-9ac-hj-np-z]{38}$/;
export const PEER_RE = /^12D3Koo[1-9A-HJ-NP-Za-km-z]{40,60}$/;
export const HEIGHT_RE = /^\d{1,12}$/;

export type QueryKind = 'height' | 'hash' | 'address' | 'validator' | 'username' | 'peer' | 'unknown';

/** Classify a search string locally before asking the API. */
export function classifyQuery(q: string): QueryKind {
  const s = q.trim();
  if (!s) return 'unknown';
  if (HEIGHT_RE.test(s)) return 'height';
  if (HASH_RE.test(s)) return 'hash';
  if (VALOPER_RE.test(s)) return 'validator';
  if (ADDR_RE.test(s)) return 'address';
  if (s.startsWith('@') && s.length > 1) return 'username';
  if (PEER_RE.test(s)) return 'peer';
  return 'unknown';
}
