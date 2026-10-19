/**
 * What the pixel-home editor's pointer is doing, as one explicit state
 * (pixel-homes PLAN.md, Phase 3 step 2). Pure: `interact` takes the state
 * and an input and returns the next state plus the edits to make, so mouse,
 * pen and touch all go through the same rules and tests can drive it.
 *
 *   idle      nothing armed; pressing a decoration starts `pressed`
 *   armed     a palette item is picked; a press and release plants it
 *   pressed   a decoration is held but hasn't moved past the threshold;
 *             releasing here only selects it
 *   dragging  the held decoration follows the pointer; release drops it
 *   painting  a terrain brush (or the terrain eraser, brush null)
 *   erasing   delete mode: pressing a decoration removes it
 *
 * The same state object comes back when nothing changed, so a pointer move
 * that changes nothing re-renders nothing.
 */
import type { DecorationItem } from './decoration-data'

/** Screen pixels a held decoration must travel before it becomes a drag. */
export const DRAG_THRESHOLD_PX = 4

export interface Point {
  x: number
  y: number
}

export type Interaction =
  | { kind: 'idle' }
  | { kind: 'armed'; item: DecorationItem; down: Point | null }
  | { kind: 'pressed'; id: string; start: Point; offset: Point }
  | { kind: 'dragging'; id: string; offset: Point }
  | { kind: 'painting'; brush: string | null; stroking: boolean }
  | { kind: 'erasing' }

/** A pointer over the scene, in scene (art pixel) coordinates. */
export interface ScenePointer {
  x: number
  y: number
  /** Inside the scene's 512 × 352 box. */
  inside: boolean
  /** The placed decoration under a press, if any. */
  decorationId: string | null
  /** Screen pixels per scene pixel. */
  screenScale: number
}

export type InteractionInput =
  | { type: 'down'; pointer: ScenePointer; decorationPosition?: Point }
  | { type: 'move'; pointer: ScenePointer }
  | { type: 'up'; pointer: ScenePointer }
  /** The browser took the pointer away (a touch turned into a scroll, lost capture). */
  | { type: 'cancel' }
  | { type: 'leave' }
  | { type: 'escape' }
  /** Pick a palette item to place; picking the armed item again puts it down. */
  | { type: 'arm'; item: DecorationItem }
  /** Pick a terrain brush; null is the terrain eraser. */
  | { type: 'brush'; brush: string | null }
  | { type: 'toggleErase' }
  | { type: 'reset' }

export type InteractionEffect =
  | { type: 'place'; item: DecorationItem; at: Point }
  | { type: 'select'; id: string }
  | { type: 'deselect' }
  | { type: 'move'; id: string; topLeft: Point }
  | { type: 'remove'; id: string }
  | { type: 'beginStroke' }
  | { type: 'paint'; brush: string | null; at: Point }
  | { type: 'endStroke' }
  /** Show the armed item under the pointer. */
  | { type: 'ghostItem'; item: DecorationItem; at: Point }
  /** Show the dragged decoration with its top-left here. */
  | { type: 'ghostDrag'; id: string; topLeft: Point }
  | { type: 'hideGhost' }

export const IDLE: Interaction = { kind: 'idle' }

type Result = [Interaction, InteractionEffect[]]

const same = (state: Interaction): Result => [state, []]
const at = (p: ScenePointer): Point => ({ x: p.x, y: p.y })

function farEnough(from: Point, to: ScenePointer): boolean {
  return Math.hypot(to.x - from.x, to.y - from.y) * to.screenScale >= DRAG_THRESHOLD_PX
}

/** Leave whatever is happening, closing an open stroke. */
function exit(state: Interaction): InteractionEffect[] {
  const effects: InteractionEffect[] = [{ type: 'hideGhost' }]
  if (state.kind === 'painting' && state.stroking) effects.push({ type: 'endStroke' })
  return effects
}

export function interact(state: Interaction, input: InteractionInput): Result {
  switch (input.type) {
    case 'down': {
      const p = input.pointer
      if (!p.inside) return same(state)
      switch (state.kind) {
        case 'idle':
          if (!p.decorationId) return [state, [{ type: 'deselect' }]]
          return [
            {
              kind: 'pressed',
              id: p.decorationId,
              start: at(p),
              offset: { x: p.x - (input.decorationPosition?.x ?? p.x), y: p.y - (input.decorationPosition?.y ?? p.y) },
            },
            [],
          ]
        case 'armed':
          return [{ ...state, down: at(p) }, []]
        case 'painting':
          return [{ ...state, stroking: true }, [{ type: 'beginStroke' }, { type: 'paint', brush: state.brush, at: at(p) }]]
        case 'erasing':
          return p.decorationId ? [state, [{ type: 'remove', id: p.decorationId }]] : same(state)
        default:
          return same(state) // a second finger while one is held
      }
    }

    case 'move': {
      const p = input.pointer
      switch (state.kind) {
        case 'pressed':
          if (!farEnough(state.start, p)) return same(state)
          return [
            { kind: 'dragging', id: state.id, offset: state.offset },
            [{ type: 'deselect' }, { type: 'ghostDrag', id: state.id, topLeft: { x: p.x - state.offset.x, y: p.y - state.offset.y } }],
          ]
        case 'dragging':
          if (!p.inside) return [state, [{ type: 'hideGhost' }]]
          return [state, [{ type: 'ghostDrag', id: state.id, topLeft: { x: p.x - state.offset.x, y: p.y - state.offset.y } }]]
        case 'armed':
          if (!p.inside) return [state, [{ type: 'hideGhost' }]]
          return [state, [{ type: 'ghostItem', item: state.item, at: at(p) }]]
        case 'painting':
          if (!state.stroking || !p.inside) return same(state)
          return [state, [{ type: 'paint', brush: state.brush, at: at(p) }]]
        default:
          return same(state)
      }
    }

    case 'up': {
      const p = input.pointer
      switch (state.kind) {
        case 'pressed':
          return [IDLE, [{ type: 'select', id: state.id }]]
        case 'dragging':
          // Dropped outside the scene: it stays where it was
          if (!p.inside) return [IDLE, [{ type: 'hideGhost' }]]
          return [IDLE, [{ type: 'hideGhost' }, { type: 'move', id: state.id, topLeft: { x: p.x - state.offset.x, y: p.y - state.offset.y } }]]
        case 'armed':
          if (!state.down) return same(state)
          // Stays armed, for planting a row of flowers
          return [{ ...state, down: null }, p.inside ? [{ type: 'place', item: state.item, at: at(p) }] : []]
        case 'painting':
          if (!state.stroking) return same(state)
          return [{ ...state, stroking: false }, [{ type: 'endStroke' }]]
        default:
          return same(state)
      }
    }

    case 'cancel':
      switch (state.kind) {
        case 'pressed':
          return [IDLE, []]
        case 'dragging':
          return [IDLE, [{ type: 'hideGhost' }]]
        case 'armed':
          return state.down ? [{ ...state, down: null }, [{ type: 'hideGhost' }]] : same(state)
        case 'painting':
          return state.stroking ? [{ ...state, stroking: false }, [{ type: 'endStroke' }]] : same(state)
        default:
          return same(state)
      }

    case 'leave':
      return state.kind === 'armed' || state.kind === 'dragging' ? [state, [{ type: 'hideGhost' }]] : same(state)

    case 'escape':
      return [IDLE, [...exit(state), { type: 'deselect' }]]

    case 'arm':
      if (state.kind === 'armed' && state.item.id === input.item.id) return [IDLE, exit(state)]
      return [{ kind: 'armed', item: input.item, down: null }, [...exit(state), { type: 'deselect' }]]

    case 'brush':
      return [{ kind: 'painting', brush: input.brush, stroking: false }, [...exit(state), { type: 'deselect' }]]

    case 'toggleErase':
      if (state.kind === 'erasing') return [IDLE, []]
      return [{ kind: 'erasing' }, [...exit(state), { type: 'deselect' }]]

    case 'reset':
      if (state.kind === 'idle') return same(state)
      return [IDLE, exit(state)]
  }
}
