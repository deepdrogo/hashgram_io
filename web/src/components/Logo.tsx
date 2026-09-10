/**
 * The Hashgram mark: a heavy `#` whose four intersections are knocked out —
 * negative-space squares that read as blocks in a chain. Single colour, no
 * gradients, works at 16 px. Source of truth is public/brand/logo.svg; this
 * inline copy avoids a request on every page.
 */
export function LogoMark(props: { size?: number; class?: string; title?: string }) {
  const s = props.size ?? 24;
  return (
    <svg width={s} height={s} viewBox="0 0 64 64" class={props.class} role="img" aria-label={props.title ?? 'Hashgram'} fill="currentColor">
      <path
        fill-rule="evenodd"
        d="M16 4h12v56H16zM36 4h12v56H36zM4 16h12v12H4zM28 16h8v12h-8zM48 16h12v12H48zM4 36h12v12H4zM28 36h8v12h-8zM48 36h12v12H48zM18 18h8v8h-8zM38 18h8v8h-8zM18 38h8v8h-8zM38 38h8v8h-8z"
        clip-rule="evenodd"
      />
    </svg>
  );
}

export function Wordmark(props: { height?: number; class?: string }) {
  const h = props.height ?? 20;
  return (
    <span class={`inline-flex items-center gap-2 ${props.class ?? ''}`}>
      <LogoMark size={h} />
      <span class="font-semibold tracking-tight" style={{ 'font-size': `${h * 0.9}px`, 'line-height': 1 }}>
        hashgram
      </span>
    </span>
  );
}
