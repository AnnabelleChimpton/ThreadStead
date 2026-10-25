/**
 * What an <input type="color"> can show for a CSS colour: #rrggbb only.
 * Short and alpha hex are spelled out; rgb(), hsl() and names are worked out
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
      if (/^#[0-9a-f]{6}$/i.test(String(ctx.fillStyle))) return String(ctx.fillStyle);
    }
  } catch {
    // no canvas: fall through
  }
  return '#000000';
}
