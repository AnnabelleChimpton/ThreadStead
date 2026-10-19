import {
  DRAG_THRESHOLD_PX,
  IDLE,
  interact,
  type Interaction,
  type InteractionEffect,
  type InteractionInput,
  type ScenePointer,
} from '../editor-interaction'
import type { DecorationItem } from '../decoration-data'

const rose = { id: 'roses_red', name: 'Red Roses', type: 'plant' } as DecorationItem
const p = (x: number, y: number, extra: Partial<ScenePointer> = {}): ScenePointer => ({
  x,
  y,
  inside: x >= 0 && y >= 0 && x <= 512 && y <= 352,
  decorationId: null,
  screenScale: 1,
  ...extra,
})

/** Runs inputs from `state`, collecting every effect. */
function run(state: Interaction, ...inputs: InteractionInput[]): [Interaction, InteractionEffect[]] {
  const all: InteractionEffect[] = []
  for (const input of inputs) {
    const [next, effects] = interact(state, input)
    state = next
    all.push(...effects)
  }
  return [state, all]
}
const types = (effects: InteractionEffect[]) => effects.map((e) => e.type)

describe('idle', () => {
  test('a press and release on a decoration selects it and nothing else', () => {
    const [state, effects] = run(
      IDLE,
      { type: 'down', pointer: p(70, 250, { decorationId: 'r1' }), decorationPosition: { x: 64, y: 240 } },
      { type: 'up', pointer: p(70, 250) },
    )
    expect(state).toBe(IDLE)
    expect(effects).toEqual([{ type: 'select', id: 'r1' }])
  })

  test('a press on the lawn deselects', () => {
    expect(run(IDLE, { type: 'down', pointer: p(10, 300) })[1]).toEqual([{ type: 'deselect' }])
  })

  test('a press off the scene does nothing', () => {
    expect(run(IDLE, { type: 'down', pointer: p(-5, 300, { decorationId: 'r1' }) })).toEqual([IDLE, []])
  })

  test('moves with nothing held return the same state, so nothing re-renders', () => {
    const [state, effects] = interact(IDLE, { type: 'move', pointer: p(100, 100) })
    expect(state).toBe(IDLE)
    expect(effects).toEqual([])
  })
})

describe('pressed → dragging', () => {
  const press: InteractionInput = { type: 'down', pointer: p(70, 250, { decorationId: 'r1' }), decorationPosition: { x: 64, y: 240 } }

  test('under the threshold it stays a press, with the very same state', () => {
    const [pressed] = run(IDLE, press)
    const [state, effects] = interact(pressed, { type: 'move', pointer: p(72, 251) })
    expect(state).toBe(pressed)
    expect(effects).toEqual([])
  })

  test('the threshold is in screen pixels: at 2x, 2 scene pixels is enough', () => {
    const [pressed] = run(IDLE, press)
    expect(interact(pressed, { type: 'move', pointer: p(72, 250, { screenScale: 2 }) })[0].kind).toBe('dragging')
    expect(interact(pressed, { type: 'move', pointer: p(72, 250, { screenScale: 1 }) })[0].kind).toBe('pressed')
    expect(DRAG_THRESHOLD_PX).toBe(4)
  })

  test('a drag keeps the grab point and drops where it was released', () => {
    const [state, effects] = run(IDLE, press, { type: 'move', pointer: p(150, 250) }, { type: 'up', pointer: p(200, 300) })
    expect(state).toBe(IDLE)
    expect(effects).toEqual([
      { type: 'deselect' },
      { type: 'ghostDrag', id: 'r1', topLeft: { x: 144, y: 240 } },
      { type: 'hideGhost' },
      { type: 'move', id: 'r1', topLeft: { x: 194, y: 290 } },
    ])
  })

  test('released off the scene, it stays put', () => {
    const [, effects] = run(IDLE, press, { type: 'move', pointer: p(150, 250) }, { type: 'move', pointer: p(600, 250) }, { type: 'up', pointer: p(600, 250) })
    expect(types(effects)).toEqual(['deselect', 'ghostDrag', 'hideGhost', 'hideGhost'])
  })

  test.each(['cancel', 'escape'] as const)('%s ends a drag without moving anything', (type) => {
    const [state, effects] = run(IDLE, press, { type: 'move', pointer: p(150, 250) }, { type })
    expect(state).toBe(IDLE)
    expect(types(effects)).not.toContain('move')
    expect(types(effects)).toContain('hideGhost')
  })

  test('a second finger while one is held is ignored', () => {
    const [pressed] = run(IDLE, press)
    expect(interact(pressed, { type: 'down', pointer: p(300, 300, { decorationId: 'r2' }) })[0]).toBe(pressed)
  })
})

describe('armed', () => {
  const arm: InteractionInput = { type: 'arm', item: rose }

  test('the ghost follows, a tap plants at the release point, and it stays armed', () => {
    const [state, effects] = run(
      IDLE,
      arm,
      { type: 'move', pointer: p(100, 200) },
      { type: 'down', pointer: p(100, 200) },
      { type: 'up', pointer: p(101, 201) },
    )
    expect(state.kind).toBe('armed')
    expect(effects).toEqual([
      { type: 'hideGhost' },
      { type: 'deselect' },
      { type: 'ghostItem', item: rose, at: { x: 100, y: 200 } },
      { type: 'place', item: rose, at: { x: 101, y: 201 } },
    ])
  })

  test('a release without a press on the scene plants nothing', () => {
    const [, effects] = run(IDLE, arm, { type: 'up', pointer: p(100, 200) })
    expect(types(effects)).not.toContain('place')
  })

  test('a press that ends off the scene plants nothing', () => {
    const [, effects] = run(IDLE, arm, { type: 'down', pointer: p(100, 200) }, { type: 'up', pointer: p(-10, 200) })
    expect(types(effects)).not.toContain('place')
  })

  test('picking the same item again puts it down; another item swaps', () => {
    const [armed] = run(IDLE, arm)
    expect(interact(armed, arm)[0]).toBe(IDLE)
    const other = { ...rose, id: 'tree_pine' }
    expect(interact(armed, { type: 'arm', item: other })[0]).toMatchObject({ kind: 'armed', item: other })
  })

  test('leaving the scene hides the ghost but keeps the item', () => {
    const [armed] = run(IDLE, arm)
    const [state, effects] = interact(armed, { type: 'leave' })
    expect(state).toBe(armed)
    expect(effects).toEqual([{ type: 'hideGhost' }])
  })
})

describe('painting', () => {
  test('a stroke paints every cell it crosses, between one begin and one end', () => {
    const [state, effects] = run(
      IDLE,
      { type: 'brush', brush: 'water' },
      { type: 'move', pointer: p(10, 200) }, // hovering paints nothing
      { type: 'down', pointer: p(100, 200) },
      { type: 'move', pointer: p(120, 200) },
      { type: 'move', pointer: p(140, 200) },
      { type: 'up', pointer: p(140, 200) },
    )
    expect(types(effects)).toEqual(['hideGhost', 'deselect', 'beginStroke', 'paint', 'paint', 'paint', 'endStroke'])
    expect(state).toEqual({ kind: 'painting', brush: 'water', stroking: false })
  })

  test('the terrain eraser is a brush of null', () => {
    const [, effects] = run(IDLE, { type: 'brush', brush: null }, { type: 'down', pointer: p(100, 200) })
    expect(effects).toContainEqual({ type: 'paint', brush: null, at: { x: 100, y: 200 } })
  })

  test.each(['cancel', 'escape'] as const)('%s closes an open stroke', (type) => {
    const [, effects] = run(IDLE, { type: 'brush', brush: 'sand' }, { type: 'down', pointer: p(100, 200) }, { type })
    expect(types(effects)).toContain('endStroke')
  })

  test('switching to another mode mid-stroke closes the stroke', () => {
    const [, effects] = run(IDLE, { type: 'brush', brush: 'sand' }, { type: 'down', pointer: p(100, 200) }, { type: 'arm', item: rose })
    expect(types(effects)).toContain('endStroke')
  })
})

describe('erasing', () => {
  test('pressing a decoration removes it; the lawn does nothing; toggling leaves', () => {
    const [erasing] = run(IDLE, { type: 'toggleErase' })
    expect(interact(erasing, { type: 'down', pointer: p(70, 250, { decorationId: 'r1' }) })[1]).toEqual([{ type: 'remove', id: 'r1' }])
    expect(interact(erasing, { type: 'down', pointer: p(300, 300) })[1]).toEqual([])
    expect(interact(erasing, { type: 'toggleErase' })[0]).toBe(IDLE)
  })
})

test('Escape from every state returns to idle', () => {
  const states: Interaction[] = [
    IDLE,
    { kind: 'armed', item: rose, down: null },
    { kind: 'pressed', id: 'r1', start: { x: 0, y: 0 }, offset: { x: 0, y: 0 } },
    { kind: 'dragging', id: 'r1', offset: { x: 0, y: 0 } },
    { kind: 'painting', brush: 'water', stroking: true },
    { kind: 'erasing' },
  ]
  for (const state of states) {
    const [next, effects] = interact(state, { type: 'escape' })
    expect(next).toBe(IDLE)
    expect(types(effects)).toContain('deselect')
  }
})
