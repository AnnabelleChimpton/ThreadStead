/**
 * Where a decoration lands for a requested top-left corner (pixel-homes
 * PLAN.md, Phase 3 step 4). Placements snap to the 16 px grid and stay
 * inside the scene by the item's own size. Free placement (Alt held) keeps
 * the exact pixel, still inside the scene.
 *
 * Replaces the old magnetic snap, which only snapped within 8 px and left
 * everything else at a raw float position.
 */
import { getDecorationDimensions } from './decoration-dimensions'

export const CELL = 16
const SCENE_WIDTH = 512
const SCENE_HEIGHT = 352

export interface Placement {
  position: { x: number; y: number }
  /** Grid cell of the top-left; null for a free placement. */
  gridX: number | null
  gridY: number | null
}

interface Placeable {
  id: string
  decorationId?: string
  type: string
  size?: string
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export function place(item: Placeable, x: number, y: number, { free = false }: { free?: boolean } = {}): Placement {
  const size = (item.size || 'medium') as 'small' | 'medium' | 'large'
  const { width, height } = getDecorationDimensions(item.decorationId || item.id, item.type, size)
  const maxX = Math.max(0, SCENE_WIDTH - width)
  const maxY = Math.max(0, SCENE_HEIGHT - height)
  if (free) {
    return { position: { x: clamp(Math.round(x), 0, maxX), y: clamp(Math.round(y), 0, maxY) }, gridX: null, gridY: null }
  }
  const gridX = clamp(Math.round(x / CELL), 0, Math.floor(maxX / CELL))
  const gridY = clamp(Math.round(y / CELL), 0, Math.floor(maxY / CELL))
  return { position: { x: gridX * CELL, y: gridY * CELL }, gridX, gridY }
}

/** The top-left that centres an item on a point, before snapping. */
export function centredOn(item: Placeable, at: { x: number; y: number }): { x: number; y: number } {
  const size = (item.size || 'medium') as 'small' | 'medium' | 'large'
  const { width, height } = getDecorationDimensions(item.decorationId || item.id, item.type, size)
  return { x: at.x - width / 2, y: at.y - height / 2 }
}
