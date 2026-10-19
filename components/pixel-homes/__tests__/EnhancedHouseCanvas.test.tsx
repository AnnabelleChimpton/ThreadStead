/**
 * The scene as the editor uses it (pixel-homes Phase 3 step 2): pointer
 * events in scene coordinates with pointer capture, and memoized layers, so
 * a change redraws only what changed.
 */
import React from 'react'
import { fireEvent, render } from '@testing-library/react'
import type { DecorationItem } from '@/lib/pixel-homes/decoration-data'

const renders = { house: 0, sprites: new Map<string, number>() }
jest.mock('../HouseSVG', () => ({
  __esModule: true,
  default: () => {
    renders.house++
    return null
  },
}))
jest.mock('../DecorationSVG', () => ({
  __esModule: true,
  default: ({ decorationId }: { decorationId: string }) => {
    renders.sprites.set(decorationId, (renders.sprites.get(decorationId) ?? 0) + 1)
    return <span data-art={decorationId} />
  },
}))

import EnhancedHouseCanvas from '../EnhancedHouseCanvas'
import { getDecorationDimensions, DECORATION_DIMENSIONS } from '@/lib/pixel-homes/decoration-dimensions'

beforeAll(() => {
  class NoopObserver {
    observe() {}
    disconnect() {}
  }
  ;(global as any).ResizeObserver = NoopObserver
  // jsdom has no PointerEvent, so fireEvent.pointer* would drop clientX, button and isPrimary
  if (!(global as any).PointerEvent) {
    class PointerEventPolyfill extends MouseEvent {
      pointerId: number
      isPrimary: boolean
      pointerType: string
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init)
        this.pointerId = init.pointerId ?? 1
        this.isPrimary = init.isPrimary ?? true
        this.pointerType = init.pointerType ?? 'mouse'
      }
    }
    ;(global as any).PointerEvent = PointerEventPolyfill
  }
})

const decorations: DecorationItem[] = Array.from({ length: 100 }, (_, i) => ({
  id: `item${i}_row${i}`,
  decorationId: `item${i}`,
  name: 'Thing',
  type: 'plant',
  position: { x: (i % 20) * 24, y: 224 + Math.floor(i / 20) * 24, layer: 300000 + i },
}))
const house = { windowStyle: 'default' as const }
const terrain = { '3,8': 'water' }

function scene(props: Partial<React.ComponentProps<typeof EnhancedHouseCanvas>> = {}) {
  return (
    <EnhancedHouseCanvas
      template="cottage_v1"
      palette="thread_sage"
      decorations={decorations}
      houseCustomizations={house}
      terrain={terrain}
      isDecorationMode
      onScenePointer={onScenePointer}
      {...props}
    />
  )
}
const onScenePointer = jest.fn()
const resetCounts = () => {
  renders.house = 0
  renders.sprites.clear()
}
const spriteRenders = () => [...renders.sprites.values()].reduce((a, b) => a + b, 0)

beforeEach(() => {
  onScenePointer.mockClear()
  resetCounts()
})

describe('memoized layers', () => {
  test('a parent re-render with the same document redraws nothing', () => {
    const { rerender } = render(scene())
    expect(spriteRenders()).toBe(100)
    expect(renders.house).toBe(1)
    resetCounts()
    rerender(scene({ overlay: <div /> }))
    expect(spriteRenders()).toBe(0)
    expect(renders.house).toBe(0)
  })

  test('moving one decoration redraws only that one', () => {
    const { rerender } = render(scene())
    resetCounts()
    const moved = decorations.map((d, i) => (i === 7 ? { ...d, position: { x: 400, y: 300 } } : d))
    rerender(scene({ decorations: moved }))
    expect([...renders.sprites.keys()]).toEqual(['item7'])
    expect(renders.house).toBe(0)
  })

  test('selecting redraws only the sprites whose selection changed', () => {
    const { rerender, container } = render(scene())
    resetCounts()
    rerender(scene({ selectedDecorations: new Set(['item3_row3']) }))
    expect([...renders.sprites.keys()]).toEqual(['item3'])
    const selected = container.querySelector('[data-decoration-id="item3_row3"]') as HTMLElement
    expect(selected.style.outline).toBe('1px dotted #4a403d')
  })

  test('painting terrain or changing the house redraws no sprite', () => {
    const { rerender } = render(scene())
    resetCounts()
    rerender(scene({ terrain: { ...terrain, '4,8': 'sand' } }))
    rerender(scene({ terrain: { ...terrain, '4,8': 'sand' }, houseCustomizations: { ...house, doorStyle: 'arched' } }))
    expect(spriteRenders()).toBe(0)
    expect(renders.house).toBe(1)
  })
})

describe('pointer events', () => {
  function setupScene() {
    const utils = render(scene())
    const sceneEl = utils.container.querySelector('[data-scene]') as HTMLElement
    sceneEl.getBoundingClientRect = () => ({ left: 100, top: 50, right: 612, bottom: 402, width: 512, height: 352, x: 100, y: 50, toJSON() {} }) as DOMRect
    sceneEl.setPointerCapture = jest.fn()
    return { ...utils, sceneEl }
  }

  test('a press reports scene coordinates and the decoration under it, and captures the pointer', () => {
    const { container, sceneEl } = setupScene()
    const sprite = container.querySelector('[data-art="item5"]')!
    fireEvent.pointerDown(sprite, { clientX: 230, clientY: 290, button: 0, isPrimary: true, pointerId: 7 })
    expect(onScenePointer).toHaveBeenCalledWith(
      'down',
      { x: 130, y: 240, inside: true, decorationId: 'item5_row5', screenScale: 1 },
      expect.anything()
    )
    expect(sceneEl.setPointerCapture).toHaveBeenCalledWith(7)
  })

  test('moves off the scene arrive marked outside; right-clicks and second fingers are ignored', () => {
    const { sceneEl } = setupScene()
    fireEvent.pointerMove(sceneEl, { clientX: 700, clientY: 100, isPrimary: true })
    expect(onScenePointer).toHaveBeenLastCalledWith('move', expect.objectContaining({ inside: false, decorationId: null }), expect.anything())
    onScenePointer.mockClear()
    fireEvent.pointerDown(sceneEl, { clientX: 200, clientY: 200, button: 2, isPrimary: true })
    fireEvent.pointerDown(sceneEl, { clientX: 200, clientY: 200, button: 0, isPrimary: false })
    expect(onScenePointer).not.toHaveBeenCalled()
  })

  test('the editing surface does not scroll on touch; the visitor view does', () => {
    const { sceneEl } = setupScene()
    expect(sceneEl).toHaveClass('touch-none', 'select-none')
    const visitor = render(scene({ onScenePointer: undefined, isDecorationMode: false }))
    const visitorScene = visitor.container.querySelector('[data-scene]') as HTMLElement
    expect(visitorScene).not.toHaveClass('touch-none')
    expect(visitor.container.querySelector('[data-decoration-id]')).toBeNull()
  })
})

test('a catalog id that ends in digits keeps its own size', () => {
  DECORATION_DIMENSIONS.fence_2 = { width: 48, height: 20 }
  try {
    expect(getDecorationDimensions('fence_2', 'structure')).toEqual({ width: 48, height: 20 })
    // older instance ids still find their item
    expect(getDecorationDimensions('fence_2_1729300000000_abc123', 'structure')).toEqual({ width: 48, height: 20 })
  } finally {
    delete DECORATION_DIMENSIONS.fence_2
  }
})
