import { createMemo, createSignal, onCleanup, For, Show, type JSX } from 'solid-js';
import { line, area, curveMonotoneX, curveStepAfter } from 'd3-shape';
import { scaleLinear, scaleTime } from 'd3-scale';
import { extent, max } from 'd3-array';

/*
 * All charts are monochrome: white / greys only, meaning carried by weight,
 * dash pattern, hatching and opacity. Colours come from CSS variables so they
 * stay inside the seven-value palette.
 */

const W = 'var(--color-white)';
const G7 = 'var(--color-ink-700)';
const G5 = 'var(--color-ink-500)';
const G9 = 'var(--color-ink-900)';

export function Sparkline(props: { values: Array<number | null | undefined>; width?: number; height?: number; label?: string }) {
  const w = () => props.width ?? 120;
  const h = () => props.height ?? 32;
  const path = createMemo(() => {
    const vals = props.values.map((v) => (v === null || v === undefined || Number.isNaN(v) ? null : v));
    const pts = vals.map((v, i) => [i, v] as [number, number | null]).filter((p) => p[1] !== null) as Array<[number, number]>;
    if (pts.length < 2) return null;
    const x = scaleLinear().domain([0, vals.length - 1]).range([1, w() - 1]);
    const [lo, hi] = extent(pts, (p) => p[1]) as [number, number];
    const y = scaleLinear()
      .domain(lo === hi ? [lo - 1, hi + 1] : [lo, hi])
      .range([h() - 2, 2]);
    const l = line<[number, number]>()
      .x((p) => x(p[0]))
      .y((p) => y(p[1]))
      .curve(curveMonotoneX);
    return l(pts);
  });
  return (
    <svg viewBox={`0 0 ${w()} ${h()}`} width="100%" height={h()} preserveAspectRatio="none" role="img" aria-label={props.label ?? 'trend'} class="block">
      <Show when={path()} fallback={<line x1="0" y1={h() / 2} x2={w()} y2={h() / 2} stroke={G7} stroke-dasharray="2 3" />}>
        <path d={path()!} fill="none" stroke={W} stroke-width="1.5" stroke-linecap="round" />
      </Show>
    </svg>
  );
}

export interface Series {
  name: string;
  points: Array<{ x: number; y: number }>;
  dash?: string;
  width?: number;
  step?: boolean;
  area?: boolean;
}

/** Generic line chart with axes; x may be a timestamp (ms) or a number. */
export function LineChart(props: {
  series: Series[];
  height?: number;
  xTime?: boolean;
  yFormat?: (v: number) => string;
  xFormat?: (v: number) => string;
  marker?: { x: number; label: string };
  ariaLabel: string;
  yTicks?: number;
}) {
  // Measure the container so tick labels stay 11 px on every screen instead of
  // scaling with a fixed viewBox.
  const [width, setWidth] = createSignal(720);
  const measure = (el: HTMLElement) => {
    const ro = new ResizeObserver((entries) => {
      const w = Math.floor(entries[0]?.contentRect.width ?? 720);
      if (w > 0) setWidth(Math.max(280, w));
    });
    ro.observe(el);
    onCleanup(() => ro.disconnect());
  };
  const height = () => props.height ?? 240;
  const narrow = () => width() < 480;
  const m = () => ({ top: 12, right: 12, bottom: 28, left: narrow() ? 44 : 64 });

  const scales = createMemo(() => {
    const all = props.series.flatMap((s) => s.points);
    const xs = all.map((p) => p.x);
    const ys = all.map((p) => p.y);
    const xd = xs.length ? (extent(xs) as [number, number]) : ([0, 1] as [number, number]);
    const ymax = max(ys) ?? 1;
    const mm = m();
    const x = scaleLinear()
      .domain(xd[0] === xd[1] ? [xd[0] - 1, xd[1] + 1] : xd)
      .range([mm.left, width() - mm.right]);
    const y = scaleLinear()
      .domain([0, ymax * 1.05 || 1])
      .nice()
      .range([height() - mm.bottom, mm.top]);
    // Time axes get nice tick positions from d3's time scale, plotted on the linear scale.
    const n = narrow() ? 3 : 6;
    const xTicks: number[] = props.xTime
      ? scaleTime()
          .domain([new Date(xd[0]), new Date(xd[1])])
          .ticks(n)
          .map((d) => d.getTime())
      : x.ticks(n);
    return { x, y, xTicks };
  });

  const paths = createMemo(() =>
    props.series.map((s) => {
      const { x, y } = scales();
      const l = line<{ x: number; y: number }>()
        .x((p) => x(p.x))
        .y((p) => y(p.y))
        .curve(s.step ? curveStepAfter : curveMonotoneX);
      const a = area<{ x: number; y: number }>()
        .x((p) => x(p.x))
        .y0(y(0))
        .y1((p) => y(p.y))
        .curve(s.step ? curveStepAfter : curveMonotoneX);
      return { s, d: l(s.points) ?? '', a: s.area ? (a(s.points) ?? '') : null };
    }),
  );

  const yTicks = () => scales().y.ticks(props.yTicks ?? 4);
  const xTicks = () => scales().xTicks;
  const xPos = (v: number) => scales().x(v);
  const fmtY = (v: number) => (props.yFormat ? props.yFormat(v) : v.toLocaleString('en-US'));
  const fmtX = (n: number) => {
    if (props.xFormat) return props.xFormat(n);
    return props.xTime ? new Date(n).toISOString().slice(0, 10) : n.toLocaleString('en-US');
  };

  return (
    <figure class="w-full" ref={measure}>
      <svg viewBox={`0 0 ${width()} ${height()}`} width="100%" height={height()} role="img" aria-label={props.ariaLabel} class="block overflow-visible text-[11px]">
        <defs>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke={G7} stroke-width="1" />
          </pattern>
        </defs>
        <For each={yTicks()}>
          {(t) => (
            <g>
              <line x1={m().left} x2={width() - m().right} y1={scales().y(t)} y2={scales().y(t)} stroke={G9} />
              <text x={m().left - 8} y={scales().y(t)} dy="0.32em" text-anchor="end" fill={G5} class="font-mono tabular">
                {fmtY(t)}
              </text>
            </g>
          )}
        </For>
        <For each={xTicks()}>
          {(t) => (
            <text x={xPos(t)} y={height() - 8} text-anchor="middle" fill={G5} class="font-mono tabular">
              {fmtX(t)}
            </text>
          )}
        </For>
        <For each={paths()}>
          {(p) => (
            <g>
              <Show when={p.a}>
                <path d={p.a!} fill="url(#hatch)" opacity="0.6" />
              </Show>
              <path d={p.d} fill="none" stroke={W} stroke-width={p.s.width ?? 1.5} stroke-dasharray={p.s.dash} stroke-linejoin="round" />
            </g>
          )}
        </For>
        <Show when={props.marker}>
          <g>
            <line x1={xPos(props.marker!.x)} x2={xPos(props.marker!.x)} y1={m().top} y2={height() - m().bottom} stroke={W} stroke-dasharray="3 3" />
            <text x={xPos(props.marker!.x) + 4} y={m().top + 10} fill={W} class="font-medium">
              {props.marker!.label}
            </text>
          </g>
        </Show>
      </svg>
      <Show when={props.series.length > 1}>
        <figcaption class="mt-2 flex flex-wrap gap-4 text-xs text-ink-500">
          <For each={props.series}>
            {(s) => (
              <span class="inline-flex items-center gap-2">
                <svg width="24" height="8" aria-hidden="true">
                  <line x1="0" y1="4" x2="24" y2="4" stroke={W} stroke-width={s.width ?? 1.5} stroke-dasharray={s.dash} />
                </svg>
                {s.name}
              </span>
            )}
          </For>
        </figcaption>
      </Show>
    </figure>
  );
}

/** Horizontal share bar (0–100). */
export function ShareBar(props: { pct: number; label?: string; class?: string }) {
  const p = () => Math.max(0, Math.min(100, props.pct));
  return (
    <div class={`h-1.5 w-full overflow-hidden rounded-full bg-ink-900 ${props.class ?? ''}`} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={p()} aria-label={props.label}>
      <div class="h-full bg-white" style={{ width: `${p()}%` }} />
    </div>
  );
}

/** Stacked governance tally bar: yes solid, no hatched, veto dark, abstain dotted. */
export function TallyBar(props: { yes: number; no: number; veto: number; abstain: number; quorumPct?: number }) {
  const total = () => props.yes + props.no + props.veto + props.abstain || 1;
  const seg = (v: number) => (v / total()) * 100;
  return (
    <div class="space-y-2">
      <svg viewBox="0 0 100 8" width="100%" height="10" preserveAspectRatio="none" role="img" aria-label={`Yes ${props.yes.toFixed(1)} %, No ${props.no.toFixed(1)} %, No with veto ${props.veto.toFixed(1)} %, Abstain ${props.abstain.toFixed(1)} %`} class="block overflow-visible rounded">
        <defs>
          <pattern id="tally-hatch" width="2" height="2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="2" stroke={W} stroke-width="0.7" />
          </pattern>
          <pattern id="tally-dots" width="2" height="2" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.4" fill={G5} />
          </pattern>
        </defs>
        <rect x="0" y="0" width="100" height="8" fill={G9} />
        <rect x="0" y="0" width={seg(props.yes)} height="8" fill={W} />
        <rect x={seg(props.yes)} y="0" width={seg(props.no)} height="8" fill="url(#tally-hatch)" />
        <rect x={seg(props.yes) + seg(props.no)} y="0" width={seg(props.veto)} height="8" fill={G7} />
        <rect x={seg(props.yes) + seg(props.no) + seg(props.veto)} y="0" width={seg(props.abstain)} height="8" fill="url(#tally-dots)" />
        <Show when={props.quorumPct !== undefined}>
          <line x1={props.quorumPct} x2={props.quorumPct} y1="-1" y2="9" stroke={W} stroke-width="0.5" stroke-dasharray="1 1" />
        </Show>
      </svg>
      <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-500">
        <span>
          <span class="mr-1 inline-block size-2 bg-white" /> Yes {props.yes.toFixed(1)} %
        </span>
        <span>
          <span class="mr-1 inline-block size-2 border border-white" /> No {props.no.toFixed(1)} %
        </span>
        <span>
          <span class="mr-1 inline-block size-2 bg-ink-700" /> Veto {props.veto.toFixed(1)} %
        </span>
        <span>
          <span class="mr-1 inline-block size-2 border border-dotted border-ink-500" /> Abstain {props.abstain.toFixed(1)} %
        </span>
      </div>
    </div>
  );
}

/** Uptime strip: one cell per height, filled = signed. */
export function SignStrip(props: { items: Array<{ height: number; signed: boolean }>; label?: string }) {
  const n = () => props.items.length || 1;
  return (
    <svg viewBox={`0 0 ${n()} 6`} width="100%" height="14" preserveAspectRatio="none" role="img" aria-label={props.label ?? 'signing history'} class="block rounded-sm">
      <rect x="0" y="0" width={n()} height="6" fill={G9} />
      <For each={props.items}>{(it, i) => <rect x={i()} y="0" width="1" height="6" fill={it.signed ? W : 'transparent'} shape-rendering="crispEdges" />}</For>
      <For each={props.items.filter((it) => !it.signed)}>{() => null}</For>
    </svg>
  );
}

export function Legend(props: { items: Array<{ label: string; swatch: JSX.Element }> }) {
  return (
    <div class="flex flex-wrap gap-4 text-xs text-ink-500">
      <For each={props.items}>
        {(i) => (
          <span class="inline-flex items-center gap-2">
            {i.swatch}
            {i.label}
          </span>
        )}
      </For>
    </div>
  );
}

/** Voting-power distribution: horizontal bars, monochrome. */
export function BarList(props: { items: Array<{ label: string; value: number; href?: string; sub?: string }>; format?: (v: number) => string; max?: number }) {
  const mx = () => props.max ?? Math.max(1, ...props.items.map((i) => i.value));
  return (
    <ol class="space-y-1.5">
      <For each={props.items}>
        {(it) => (
          <li class="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm">
            <Show when={it.href} fallback={<span class="truncate">{it.label}</span>}>
              <a href={it.href} class="truncate hover:underline">
                {it.label}
              </a>
            </Show>
            <div class="h-2 overflow-hidden rounded-sm bg-ink-900" aria-hidden="true">
              <div class="h-full bg-white" style={{ width: `${(it.value / mx()) * 100}%` }} />
            </div>
            <span class="font-mono text-xs tabular text-ink-500">{props.format ? props.format(it.value) : it.value.toLocaleString('en-US')}</span>
          </li>
        )}
      </For>
    </ol>
  );
}
