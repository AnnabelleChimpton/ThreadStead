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

/** Scene columns the house picker's close-up shows at least: the 200 px house and a little yard. */
export const CLOSE_UP_MIN_WIDTH = 272
const CLOSE_UP_TOP = 24
const CLOSE_UP_MIN_ROWS = 196

export interface CloseUpView {
  /** CSS pixels per art pixel; scale × devicePixelRatio is a whole number */
  scale: number
  /** The scene window shown, in art pixels (even width, centred on the house) */
  left: number
  top: number
  width: number
  height: number
}

/**
 * The house picker's view: the house at the largest whole-device-pixel scale
 * that still shows `minWidth` scene columns in `frameWidth` CSS pixels,
 * cropped to the house and the yard around it.
 */
export function pickCloseUpView(frameWidth: number, devicePixelRatio: number, minWidth = CLOSE_UP_MIN_WIDTH): CloseUpView {
  const dpr = devicePixelRatio > 0 ? devicePixelRatio : 1
  let scale = 1 / Math.ceil(dpr)
  for (let n = Math.floor(3 * dpr); n >= 1; n--) {
    if (frameWidth / (n / dpr) >= minWidth) {
      scale = n / dpr
      break
    }
  }
  const width = Math.min(CANVAS_WIDTH, 2 * Math.floor(frameWidth / scale / 2))
  const height = Math.min(CANVAS_HEIGHT, Math.max(CLOSE_UP_MIN_ROWS, Math.round(width * 0.62)))
  const top = Math.min(CLOSE_UP_TOP, CANVAS_HEIGHT - height)
  return { scale, left: (CANVAS_WIDTH - width) / 2, top, width, height }
}
