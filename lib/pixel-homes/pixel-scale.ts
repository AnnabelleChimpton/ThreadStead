/**
 * The display scale for the 512 × 352 scene: always a whole number of
 * device pixels per art pixel, so hand-drawn sprites stay crisp
 * (pixel-homes art-direction.md §3.1).
 */
const CANVAS_WIDTH = 512
const CANVAS_HEIGHT = 352

// CSS scales tried for pixelPerfect, largest first. A scale only counts when
// scale x devicePixelRatio is a whole number, so art pixels map to device pixels.
const PIXEL_SCALES = [3, 2, 1.5, 1]

/**
 * The largest scale from PIXEL_SCALES that fits and maps each art pixel to
 * whole device pixels. `allowBelowOne` (the editor on a phone) also allows
 * scales under 1x that still do, such as 2/3 on a 3x screen (each art pixel
 * is 2 device pixels), down to one device pixel per art pixel. When nothing
 * fits, the smallest allowed scale is used and the scene crops.
 */
export function pickPixelScale(
  availableWidth: number,
  devicePixelRatio: number,
  availableHeight: number = Infinity,
  { allowBelowOne = false }: { allowBelowOne?: boolean } = {}
): number {
  const fits = (k: number) => CANVAS_WIDTH * k <= availableWidth && CANVAS_HEIGHT * k <= availableHeight
  for (const k of PIXEL_SCALES) {
    if (fits(k) && Number.isInteger(k * devicePixelRatio)) return k
  }
  if (!allowBelowOne) return 1
  // n device pixels per art pixel, for n = ceil(dpr) - 1 … 1
  let smallest = 1
  for (let n = Math.ceil(devicePixelRatio) - 1; n >= 1; n--) {
    const k = n / devicePixelRatio
    if (k >= 1) continue
    if (fits(k)) return k
    smallest = k
  }
  return smallest
}
