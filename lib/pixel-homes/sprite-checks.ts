/**
 * The "New from PNG" checks (art-direction §5.4), from a PNG's inspection
 * and what its filename says. Pure, so the admin page, its API and the batch
 * script all agree.
 *
 *   fail  blocks the upload
 *   warn  off-palette colours block until the admin says "upload anyway";
 *         other warnings are advice
 *   pass  fine
 */
import { MAX_SPRITE_COLOURS, isPaletteColour } from './palette'

/** Largest decoration frame, in art px (the yard is 512×352). */
export const MAX_SPRITE_SIZE = 96
/** The placement grid. */
export const GRID_CELL = 16

export interface SpriteCheck {
  id: 'frames' | 'size' | 'alpha' | 'empty' | 'ground' | 'palette' | 'colours'
  status: 'pass' | 'warn' | 'fail'
  message: string
}

export interface SpriteInspectionLike {
  width: number
  height: number
  colours: Map<string, number>
  partialAlpha: number
  bottomPadding: number
  empty: boolean
}

export interface SpriteCheckResult {
  checks: SpriteCheck[]
  /** One frame, after trimming the empty rows under the art. */
  frameWidth: number
  height: number
  frames: number
  /** Empty rows under the art; the upload trims them. */
  trimBottom: number
  gridWidth: number
  gridHeight: number
  colourCount: number
  offPalette: { hex: string; count: number }[]
  /** Any fail. */
  blocked: boolean
  /** Off-palette colours: the admin has to say "upload anyway". */
  needsOverride: boolean
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export function checkSprite(inspection: SpriteInspectionLike, frames = 1): SpriteCheckResult {
  const checks: SpriteCheck[] = []
  const evenFrames = inspection.width % frames === 0
  const frameWidth = evenFrames ? inspection.width / frames : Math.floor(inspection.width / frames)
  const trimBottom = inspection.empty ? 0 : inspection.bottomPadding
  const height = inspection.height - trimBottom

  checks.push(
    frames === 1
      ? { id: 'frames', status: 'pass', message: 'One frame.' }
      : evenFrames
        ? { id: 'frames', status: 'pass', message: `${frames} frames, ${frameWidth} px each.` }
        : {
            id: 'frames',
            status: 'fail',
            message: `${inspection.width} px doesn't split into ${frames} equal frames.`,
          }
  )

  checks.push(
    frameWidth <= MAX_SPRITE_SIZE && height <= MAX_SPRITE_SIZE
      ? { id: 'size', status: 'pass', message: `${frameWidth}×${height}.` }
      : {
          id: 'size',
          status: 'fail',
          message: `${frameWidth}×${height} is too big. Decorations are ${MAX_SPRITE_SIZE}×${MAX_SPRITE_SIZE} at most.`,
        }
  )

  if (inspection.empty) {
    checks.push({ id: 'empty', status: 'fail', message: 'The picture is empty.' })
  }

  checks.push(
    inspection.partialAlpha === 0
      ? { id: 'alpha', status: 'pass', message: 'Hard edges.' }
      : {
          id: 'alpha',
          status: 'fail',
          message: `${plural(inspection.partialAlpha, 'pixel is', 'pixels are')} partly see-through.`,
        }
  )

  checks.push(
    trimBottom === 0
      ? { id: 'ground', status: 'pass', message: 'Stands on its bottom row.' }
      : {
          id: 'ground',
          status: 'warn',
          message: `${plural(trimBottom, 'empty row')} under the art. They'll be trimmed so it stands where it's planted.`,
        }
  )

  const offPalette = [...inspection.colours]
    .filter(([hex]) => !isPaletteColour(hex))
    .map(([hex, count]) => ({ hex, count }))
    .sort((a, b) => b.count - a.count)
  checks.push(
    offPalette.length === 0
      ? { id: 'palette', status: 'pass', message: 'Every colour is from threadstead-44.' }
      : {
          id: 'palette',
          status: 'warn',
          message: `${plural(offPalette.length, 'colour')} not in threadstead-44 (${plural(
            offPalette.reduce((n, c) => n + c.count, 0),
            'pixel'
          )}).`,
        }
  )

  const colourCount = inspection.colours.size
  checks.push(
    colourCount <= MAX_SPRITE_COLOURS
      ? { id: 'colours', status: 'pass', message: `${plural(colourCount, 'colour')}.` }
      : {
          id: 'colours',
          status: 'warn',
          message: `${colourCount} colours. ${MAX_SPRITE_COLOURS} is the most a sprite should use.`,
        }
  )

  return {
    checks,
    frameWidth,
    height,
    frames,
    trimBottom,
    gridWidth: Math.max(1, Math.ceil(frameWidth / GRID_CELL)),
    gridHeight: Math.max(1, Math.ceil(height / GRID_CELL)),
    colourCount,
    offPalette,
    blocked: checks.some((c) => c.status === 'fail'),
    needsOverride: offPalette.length > 0,
  }
}
