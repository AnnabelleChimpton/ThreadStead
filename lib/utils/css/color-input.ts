/**
 * What an <input type="color"> can show for a CSS colour: #rrggbb only.
 * Short and alpha hex are spelled out (alpha left off); rgb(), hsl() and names are worked out
 * by the browser (a canvas reads any CSS colour). Browser-only; black when
 * it can't tell.
 */
export function colorInputValue(value: string): string {
  const v = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  if (/^#[0-9a-f]{8}$/.test(v)) return v.slice(0, 7);
  if (/^#[0-9a-f]{3,4}$/.test(v)) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  try {
    const ctx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
    if (ctx) {
      ctx.fillStyle = '#000000';
      ctx.fillStyle = v;
      const read = String(ctx.fillStyle);
      if (/^#[0-9a-f]{6}$/i.test(read)) return read;
      // A colour with transparency comes back as rgba(): the picker shows
      // its colour without it (it showed black; bug bash 2026-10-26)
      const rgba = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(read);
      if (rgba) return `#${rgba.slice(1, 4).map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`;
    }
  } catch {
    // no canvas: fall through
  }
  return '#000000';
}
