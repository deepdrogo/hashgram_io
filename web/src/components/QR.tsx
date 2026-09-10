import { createResource, Show } from 'solid-js';
import QRCode from 'qrcode';

/** Monochrome QR code rendered as inline SVG (white modules on black). */
export function QR(props: { value: string; size?: number; label?: string }) {
  const [svg] = createResource(
    () => props.value,
    async (v) => {
      const s = await QRCode.toString(v, { type: 'svg', margin: 1, color: { dark: '#ffffff', light: '#000000' }, errorCorrectionLevel: 'M' });
      return s.replace('<svg ', `<svg role="img" aria-label="${props.label ?? 'QR code'}" width="${props.size ?? 128}" height="${props.size ?? 128}" `);
    },
  );
  return (
    <Show when={svg()} fallback={<div class="skeleton" style={{ width: `${props.size ?? 128}px`, height: `${props.size ?? 128}px` }} />}>
      <div class="inline-block rounded-md border border-ink-800 bg-black p-1" innerHTML={svg()!} />
    </Show>
  );
}
