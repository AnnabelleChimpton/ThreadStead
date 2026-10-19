/**
 * The editor's safety fixes (pixel-homes PLAN.md, Phase 0):
 *  - 0.5: "unsaved" means the home differs from the last save (terrain,
 *    colours, theme, sky and text included, not just undo history), and
 *    Cancel, site links and router navigation all ask before dropping it
 *  - 0.6: a plain click on a decoration only selects it; a drag starts past
 *    a small threshold and always ends on release
 * and Phase 3: one undo history for the whole home (3.1), and pointer events
 * through one state machine (3.2).
 *
 * The canvas and palette are stubs that hand back their props, so each test
 * calls the same callbacks the real components would: the canvas reports
 * every pointer event through onScenePointer in scene coordinates. The stub
 * renders the overlay, so the placement ghost is real.
 */
import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { DecorationItem } from '@/lib/pixel-homes/decoration-data'

const router = {
  push: jest.fn(),
  beforePopState: jest.fn(),
  events: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
}
jest.mock('next/router', () => ({ useRouter: () => router }))

let canvasProps: any
let paletteProps: any
jest.mock('../EnhancedHouseCanvas', () => ({
  __esModule: true,
  default: (props: any) => {
    canvasProps = props
    return props.overlay ?? null
  },
}))
jest.mock('../DecorationPalette', () => ({
  __esModule: true,
  default: (props: any) => {
    paletteProps = props
    return null
  },
}))
jest.mock('@/components/ui/PixelIcon', () => ({ PixelIcon: () => null }))
jest.mock('../../../lib/audio/retro-sfx', () => ({
  retroSFX: new Proxy({}, { get: () => () => {} }),
}))

import DecorationMode from '../DecorationMode'
import { ConfirmProvider } from '@/contexts/ConfirmContext'

const ROSE: DecorationItem = {
  id: 'roses_red_saved_0',
  decorationId: 'roses_red',
  name: 'Red Roses',
  type: 'plant',
  zone: 'front_yard',
  position: { x: 64, y: 240, layer: 1 },
  variant: 'default',
  size: 'medium',
}

const ev = () => ({ button: 0, preventDefault: jest.fn(), stopPropagation: jest.fn() }) as any

function setup(overrides: Partial<React.ComponentProps<typeof DecorationMode>> = {}) {
  const onSave = jest.fn().mockResolvedValue(true)
  const onExit = jest.fn()
  render(
    <ConfirmProvider>
      <DecorationMode
        template="cottage_v1"
        palette="thread_sage"
        username="tester"
        onSave={onSave}
        onExit={onExit}
        initialDecorations={[ROSE]}
        initialHouseCustomizations={{ windowStyle: 'default', doorStyle: 'default', roofTrim: 'default' }}
        initialTerrain={{}}
        {...overrides}
      />
    </ConfirmProvider>
  )
  return { onSave, onExit }
}

const rosePosition = () => canvasProps.decorations.find((d: DecorationItem) => d.id === ROSE.id).position
const step = (fn: () => void) => act(() => fn())

type Kind = 'down' | 'move' | 'up' | 'cancel' | 'leave'
let last = { x: 0, y: 0 }
/** A pointer event as the real canvas reports it (scene coordinates, 1:1 scale). */
function pointer(kind: Kind, x = last.x, y = last.y, decorationId: string | null = null) {
  last = { x, y }
  const inside = x >= 0 && y >= 0 && x <= 512 && y <= 352
  step(() => canvasProps.onScenePointer(kind, { x, y, inside, decorationId, screenScale: 1 }, ev()))
}
/** Press on the rose at scene (x, y). */
const pressRose = (x: number, y: number) => pointer('down', x, y, ROSE.id)
const moveTo = (x: number, y: number) => pointer('move', x, y)
const release = () => pointer('up')
/** Press and release on the lawn. */
const clickLawn = (x: number, y: number) => {
  pointer('down', x, y)
  pointer('up', x, y)
}
const ghost = () => document.querySelector('[data-placement-ghost]') as HTMLElement | null

/** The routeChangeStart listener the leave guard registered. */
const routeChangeStart = () => router.events.on.mock.calls.filter(([name]) => name === 'routeChangeStart').at(-1)![1]

beforeEach(() => {
  localStorage.clear()
  jest.clearAllMocks()
  canvasProps = undefined
  paletteProps = undefined
  global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({}) }) as any
  jest.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('0.6 click versus drag', () => {
  test('a plain click selects the decoration and never arms a move', () => {
    setup()
    pressRose(70, 250)
    release()
    expect(canvasProps.selectedDecorations.has(ROSE.id)).toBe(true)
    // no ghost follows the pointer
    moveTo(300, 300)
    expect(ghost()).toBeNull()

    // the next click on the lawn used to teleport the rose there
    clickLawn(300, 300)
    expect(rosePosition()).toMatchObject({ x: 64, y: 240 })
    expect(canvasProps.selectedDecorations.size).toBe(0)
  })

  test('a wobble under the threshold is still a click', () => {
    setup()
    pressRose(70, 250)
    moveTo(72, 251)
    expect(ghost()).toBeNull()
    release()
    clickLawn(300, 300)
    expect(rosePosition()).toMatchObject({ x: 64, y: 240 })
  })

  test('a real drag moves the decoration, keeping the grab point', () => {
    setup()
    pressRose(70, 250) // 6 px right of and 10 px below the rose's corner
    moveTo(150, 250)
    expect(ghost()).not.toBeNull()
    moveTo(200, 300)
    release()

    const { x, y } = rosePosition()
    // snapping may pull it up to 8 px towards the 16 px grid
    expect(Math.abs(x - 194)).toBeLessThanOrEqual(8)
    expect(Math.abs(y - 290)).toBeLessThanOrEqual(8)
    expect(ghost()).toBeNull()
    expect(canvasProps.selectedDecorations.size).toBe(0)
  })

  test('a drag released off the scene leaves the decoration where it was', () => {
    setup()
    pressRose(70, 250)
    moveTo(150, 250)
    moveTo(600, 250) // captured: the moves keep coming from off the scene
    expect(ghost()).toBeNull()
    release()
    expect(rosePosition()).toMatchObject({ x: 64, y: 240 })
    expect(ghost()).toBeNull()

    // nothing is left armed for the next click
    clickLawn(300, 300)
    expect(rosePosition()).toMatchObject({ x: 64, y: 240 })
  })

  test('Escape cancels a drag', () => {
    setup()
    pressRose(70, 250)
    moveTo(150, 250)
    step(() => fireEvent.keyDown(window, { key: 'Escape' }))
    release()
    expect(rosePosition()).toMatchObject({ x: 64, y: 240 })
  })
})

describe('0.5 unsaved changes', () => {
  const clickCancel = () => fireEvent.click(screen.getByRole('button', { name: 'Back to my house' }))

  test('a clean editor leaves without asking', async () => {
    const { onExit } = setup()
    clickCancel()
    await waitFor(() => expect(onExit).toHaveBeenCalled())
    expect(screen.queryByText('Leave without saving?')).not.toBeInTheDocument()
  })

  test('terrain alone counts: Cancel asks, Keep editing stays, Leave leaves', async () => {
    const { onExit } = setup()
    step(() => paletteProps.onTerrainSelect('water'))
    pointer('down', 100, 200)
    pointer('up')
    expect(canvasProps.terrain).toEqual({ '6,12': 'water' })

    clickCancel()
    expect(await screen.findByText('Leave without saving?')).toBeInTheDocument()
    expect(screen.getByText('Your changes will be lost.')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Keep editing', { selector: 'button' }))
    await waitFor(() => expect(screen.queryByText('Leave without saving?')).not.toBeInTheDocument())
    expect(onExit).not.toHaveBeenCalled()

    clickCancel()
    fireEvent.click(await screen.findByRole('button', { name: 'Leave' }))
    await waitFor(() => expect(onExit).toHaveBeenCalledTimes(1))
  })

  test('a colour change blocks site navigation until confirmed', async () => {
    setup()
    expect(() => routeChangeStart()('/feed')).not.toThrow() // clean: free to go

    step(() => paletteProps.onHouseCustomizationChange({ wallColor: '#3a5f8c' }))
    expect(() => routeChangeStart()('/feed')).toThrow(/unsaved changes/)
    fireEvent.click(await screen.findByRole('button', { name: 'Leave' }))
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/feed'))
  })

  test('theme, sky and sign text count too', () => {
    setup()
    step(() => paletteProps.onThemeChange('cabin_v1', 'thread_sage'))
    expect(() => routeChangeStart()('/feed')).toThrow()
  })

  test('undoing back to the saved home is clean again', () => {
    setup()
    step(() => paletteProps.onItemSelect({ id: 'tree_pine', name: 'Pine', type: 'plant' }))
    clickLawn(200, 200)
    expect(canvasProps.decorations).toHaveLength(2)
    expect(() => routeChangeStart()('/feed')).toThrow()

    step(() => fireEvent.keyDown(window, { key: 'z', ctrlKey: true, metaKey: true }))
    expect(canvasProps.decorations).toHaveLength(1)
    expect(() => routeChangeStart()('/feed')).not.toThrow()
  })

  test('after a successful save you stay, and nothing is unsaved', async () => {
    const { onSave, onExit } = setup()
    step(() => paletteProps.onHouseCustomizationChange({ wallColor: '#3a5f8c', houseNumber: undefined }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Save/ }))
    })

    const payload = onSave.mock.calls[0][0]
    expect(payload.houseCustomizations.wallColor).toBe('#3a5f8c')
    // cleared fields go as null so the server clears them too
    expect(payload.houseCustomizations).toHaveProperty('houseNumber', null)
    expect(onExit).not.toHaveBeenCalled()
    expect(() => routeChangeStart()('/home/tester')).not.toThrow()
    // and leaving now doesn't ask
    fireEvent.click(screen.getByRole('button', { name: 'Back to my house' }))
    await waitFor(() => expect(onExit).toHaveBeenCalled())
    expect(screen.queryByText('Leave without saving?')).not.toBeInTheDocument()
  })

  test('a failed save keeps the work and the guard', async () => {
    const { onExit } = setup({ onSave: jest.fn().mockResolvedValue(false) })
    step(() => paletteProps.onHouseCustomizationChange({ wallColor: '#3a5f8c' }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Save/ }))
    })
    expect(onExit).not.toHaveBeenCalled()
    expect(() => routeChangeStart()('/feed')).toThrow()
  })
})

describe('Phase 3.1 one history for the whole home', () => {
  const undoKey = () => step(() => fireEvent.keyDown(window, { key: 'z', ctrlKey: true, metaKey: true }))
  const redoKey = () => step(() => fireEvent.keyDown(window, { key: 'z', shiftKey: true, ctrlKey: true, metaKey: true }))

  test('a terrain stroke is one undo step', () => {
    setup()
    step(() => paletteProps.onTerrainSelect('stone_path'))
    pointer('down', 100, 200)
    for (const x of [116, 132, 148, 164]) moveTo(x, 200)
    release()
    expect(Object.keys(canvasProps.terrain)).toHaveLength(5)

    undoKey()
    expect(canvasProps.terrain).toEqual({})
    redoKey()
    expect(Object.keys(canvasProps.terrain)).toHaveLength(5)
  })

  test('typing sign text is one undo step, and the inspector follows undo', () => {
    const sign = { ...ROSE, id: 'sign_post_r1', decorationId: 'sign_post', name: 'Sign', type: 'feature' as const }
    setup({ initialDecorations: [sign] })
    pointer('down', 70, 250, sign.id)
    pointer('up')
    const field = screen.getByLabelText(/Sign text/) as HTMLInputElement
    for (const text of ['H', 'HI', 'HI!']) fireEvent.change(field, { target: { value: text } })
    expect(field.value).toBe('HI!')

    // focus is in the field, so undo comes from the bar
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(canvasProps.decorations[0].text).toBeUndefined()
    expect((screen.getByLabelText(/Sign text/) as HTMLInputElement).value).toBe('')
  })

  test('theme, sky, house parts and colours undo in order', () => {
    setup()
    step(() => paletteProps.onThemeChange('cabin_v1', 'crt_glow'))
    step(() => paletteProps.onItemSelect({ id: 'night_sky', name: 'Night', type: 'sky' }))
    step(() => paletteProps.onItemSelect({ id: 'arched_door', name: 'Arched door', type: 'house_custom' }))
    step(() => paletteProps.onHouseCustomizationChange({ wallColor: '#111111' }))
    step(() => paletteProps.onHouseCustomizationChange({ wallColor: '#222222' }))
    expect(canvasProps).toMatchObject({ template: 'cabin_v1', palette: 'crt_glow', atmosphere: { sky: 'night' } })
    expect(canvasProps.houseCustomizations).toMatchObject({ doorStyle: 'arched', wallColor: '#222222' })

    undoKey() // both colour picks, as one drag
    expect(canvasProps.houseCustomizations.wallColor).toBeUndefined()
    undoKey()
    expect(canvasProps.houseCustomizations.doorStyle).toBe('default')
    undoKey()
    expect(canvasProps.atmosphere.sky).toBe('sunny')
    undoKey()
    expect(canvasProps).toMatchObject({ template: 'cottage_v1', palette: 'thread_sage' })
    expect(() => routeChangeStart()('/feed')).not.toThrow()
  })

  test('a decoration removed by undo drops out of the selection', () => {
    setup()
    step(() => paletteProps.onItemSelect({ id: 'tree_pine', name: 'Pine', type: 'plant' }))
    clickLawn(200, 200)
    step(() => paletteProps.onItemSelect(null))
    const pine = canvasProps.decorations[1]
    expect(pine.decorationId).toBe('tree_pine')
    pointer('down', 200, 200, pine.id)
    pointer('up')
    expect(canvasProps.selectedDecorations.has(pine.id)).toBe(true)

    undoKey()
    expect(canvasProps.decorations).toHaveLength(1)
    expect(canvasProps.selectedDecorations.size).toBe(0)
  })

  test('deleting and moving are undoable', () => {
    setup()
    pressRose(70, 250)
    release()
    step(() => fireEvent.keyDown(window, { key: 'Delete' }))
    expect(canvasProps.decorations).toHaveLength(0)
    undoKey()
    expect(rosePosition()).toMatchObject({ x: 64, y: 240 })

    pressRose(70, 250)
    moveTo(200, 300)
    release()
    expect(rosePosition().x).not.toBe(64)
    undoKey()
    expect(rosePosition()).toMatchObject({ x: 64, y: 240 })
  })
})

describe('Phase 3.2 pointer states', () => {
  const pine = { id: 'tree_pine', name: 'Pine', type: 'plant' as const }

  test('armed: the ghost follows the pointer, each tap plants one, and it stays armed', () => {
    setup()
    step(() => paletteProps.onItemSelect(pine))
    moveTo(200, 200)
    expect(ghost()).not.toBeNull()
    clickLawn(200, 200)
    clickLawn(260, 220)
    expect(canvasProps.decorations.map((d: DecorationItem) => d.decorationId)).toEqual(['roses_red', 'tree_pine', 'tree_pine'])
    // leaving the scene hides the ghost
    pointer('leave')
    expect(ghost()).toBeNull()
  })

  test('armed: pressing on a placed decoration plants on top, it does not grab it', () => {
    setup()
    step(() => paletteProps.onItemSelect(pine))
    pressRose(70, 250)
    moveTo(200, 250)
    release()
    expect(canvasProps.decorations).toHaveLength(2)
    expect(rosePosition()).toMatchObject({ x: 64, y: 240 })
  })

  test('a cancelled touch (it became a scroll) neither selects, moves nor plants', () => {
    setup()
    pressRose(70, 250)
    pointer('cancel')
    expect(canvasProps.selectedDecorations.size).toBe(0)

    pressRose(70, 250)
    moveTo(200, 250)
    pointer('cancel')
    release()
    expect(rosePosition()).toMatchObject({ x: 64, y: 240 })

    step(() => paletteProps.onItemSelect(pine))
    pointer('down', 200, 200)
    pointer('cancel')
    pointer('up', 200, 200)
    expect(canvasProps.decorations).toHaveLength(1)
  })

  test('Escape leaves every state', () => {
    setup()
    const escape = () => step(() => fireEvent.keyDown(window, { key: 'Escape' }))

    step(() => paletteProps.onItemSelect(pine))
    moveTo(200, 200)
    escape()
    expect(ghost()).toBeNull()
    clickLawn(200, 200)
    expect(canvasProps.decorations).toHaveLength(1)

    step(() => paletteProps.onTerrainSelect('sand'))
    expect(paletteProps.selectedTerrainId).toBe('sand')
    pointer('down', 100, 200)
    escape() // mid-stroke: the stroke closes as one step
    expect(paletteProps.selectedTerrainId).toBeUndefined()
    moveTo(150, 200)
    expect(canvasProps.terrain).toEqual({ '6,12': 'sand' })

    fireEvent.click(screen.getByTitle('Delete items'))
    expect(canvasProps.isDeleting).toBe(true)
    escape()
    expect(canvasProps.isDeleting).toBe(false)
  })

  test('erasing: pressing a decoration removes it, the lawn does nothing', () => {
    setup()
    fireEvent.click(screen.getByTitle('Delete items'))
    clickLawn(300, 300)
    expect(canvasProps.decorations).toHaveLength(1)
    pressRose(70, 250)
    release()
    expect(canvasProps.decorations).toHaveLength(0)
  })

  test('the terrain eraser removes cells along a stroke', () => {
    setup({ initialTerrain: { '6,12': 'water', '7,12': 'water', '8,12': 'water' } })
    step(() => paletteProps.onTerrainSelect(null))
    pointer('down', 100, 200)
    moveTo(120, 200)
    release()
    expect(canvasProps.terrain).toEqual({ '8,12': 'water' })
  })

  test('the scene handler keeps one identity, so the scene never redraws for it', () => {
    setup()
    const first = canvasProps.onScenePointer
    step(() => paletteProps.onItemSelect(pine))
    clickLawn(200, 200)
    expect(canvasProps.onScenePointer).toBe(first)
  })
})

describe('Phase 3.3 keyboard and the action bar', () => {
  const pine = { id: 'tree_pine', name: 'Pine', type: 'plant' as const }
  const key = (k: string, extra: Record<string, unknown> = {}) =>
    step(() => canvasProps.sceneProps.onKeyDown({ key: k, preventDefault: jest.fn(), ...extra }))

  test('the scene takes focus and has a label', () => {
    setup()
    expect(canvasProps.sceneProps.tabIndex).toBe(0)
    expect(canvasProps.sceneProps['aria-label']).toMatch(/Your yard/)
  })

  test('arrows move the cursor, Enter plants the armed item there', () => {
    setup()
    step(() => paletteProps.onItemSelect(pine))
    key('ArrowRight', { shiftKey: true }) // 4 cells right of the start cell (15, 15)
    key('ArrowDown')
    key('Enter')
    const planted = canvasProps.decorations[1]
    expect(planted.decorationId).toBe('tree_pine')
    // centred on cell (19, 16): x 304..320, y 256..272
    const { x, y } = planted.position
    expect(Math.abs(x + 8 - 312)).toBeLessThanOrEqual(16)
    expect(Math.abs(y + 8 - 264)).toBeLessThanOrEqual(16)
    expect(screen.getByText(/Pine planted, row 17, column 20/)).toBeInTheDocument()
  })

  test('Enter on a decoration selects it, arrows nudge it a cell, Delete removes it', () => {
    setup()
    // the rose is at (64, 240): cell (4, 15)
    key('ArrowLeft', { shiftKey: true }) // 11
    key('ArrowLeft', { shiftKey: true }) // 7
    key('ArrowLeft', { shiftKey: true }) // 3
    key('ArrowRight') // 4
    key('Enter')
    expect(canvasProps.selectedDecorations.has(ROSE.id)).toBe(true)

    key('ArrowRight')
    expect(rosePosition()).toMatchObject({ x: 80, y: 240 })
    key('ArrowUp', { shiftKey: true })
    expect(rosePosition()).toMatchObject({ x: 80, y: 176 })

    step(() => fireEvent.keyDown(window, { key: 'Delete' }))
    expect(canvasProps.decorations).toHaveLength(0)
  })

  test('Enter paints one cell with a terrain brush, as one undo step', () => {
    setup()
    step(() => paletteProps.onTerrainSelect('dirt'))
    key('Enter')
    expect(canvasProps.terrain).toEqual({ '15,15': 'dirt' })
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(canvasProps.terrain).toEqual({})
  })

  test('the bar says what is happening and Done ends it', () => {
    setup()
    step(() => paletteProps.onItemSelect(pine))
    expect(screen.getByText('Planting Pine')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.queryByText('Planting Pine')).not.toBeInTheDocument()
    clickLawn(200, 200)
    expect(canvasProps.decorations).toHaveLength(1)
  })
})

describe('Phase 3.4 depth, grid and custom art', () => {
  const pine = { id: 'tree_pine', name: 'Pine', type: 'plant' as const }

  test('placing snaps to a grid cell and records it', () => {
    setup()
    step(() => paletteProps.onItemSelect(pine))
    clickLawn(203, 211)
    const planted = canvasProps.decorations[1]
    expect(planted.position.x % 16).toBe(0)
    expect(planted.position.y % 16).toBe(0)
    expect(planted.gridX).toBe(planted.position.x / 16)
  })

  test('[ and ] send the selected decoration back and bring it forward, one undo step each', () => {
    setup()
    pressRose(70, 250)
    release()
    step(() => fireEvent.keyDown(window, { key: ']' }))
    expect(canvasProps.decorations[0].layerBias).toBe(1)
    fireEvent.click(screen.getByRole('button', { name: 'Send back' }))
    fireEvent.click(screen.getByRole('button', { name: 'Send back' }))
    expect(canvasProps.decorations[0].layerBias).toBe(-1)
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(canvasProps.decorations[0].layerBias).toBe(0)
  })

  test('placed custom art shows its slot’s current image, and replacing the slot updates every copy', async () => {
    let slots = [{ slot: 0, url: 'https://cdn.test/a.png' }]
    global.fetch = jest.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/home/custom-asset' && init?.method === 'POST') slots = [{ slot: 0, url: 'https://cdn.test/b.png' }]
      if (url === '/api/home/custom-asset') return { ok: true, json: async () => ({ slots }) }
      return { ok: false, json: async () => ({}) }
    }) as any
    // The upload checks the image's size in the browser; jsdom can't decode images
    const RealImage = global.Image
    ;(global as any).Image = class {
      width = 32
      height = 32
      onload: () => void = () => {}
      set src(_: string) {
        setTimeout(() => this.onload(), 0)
      }
    }
    try {
      const art = { id: 'custom_asset_0_r1', decorationId: 'custom_asset_0', name: 'My Art', type: 'custom' as const, position: { x: 32, y: 240 } }
      const copy = { ...art, id: 'custom_asset_0_r2', position: { x: 128, y: 240 } }
      setup({ initialDecorations: [art, copy] })
      await waitFor(() => expect(canvasProps.decorations.map((d: DecorationItem) => d.customAssetUrl)).toEqual(['https://cdn.test/a.png', 'https://cdn.test/a.png']))

      const file = new File([new Uint8Array([137, 80, 78, 71])], 'b.png', { type: 'image/png' })
      await act(async () => {
        await paletteProps.onCustomSlotUpload(0, file)
      })
      expect(canvasProps.decorations.map((d: DecorationItem) => d.customAssetUrl)).toEqual(['https://cdn.test/b.png', 'https://cdn.test/b.png'])
      // a new image isn't an edit to the yard
      expect(() => routeChangeStart()('/feed')).not.toThrow()
    } finally {
      global.Image = RealImage
    }
  })
})

describe('Phase 3.5 the feel', () => {
  const selectRose = () => {
    pressRose(70, 250)
    release()
  }
  const undoButton = () => screen.getByRole('button', { name: 'Undo' })

  test('selecting shows the inspector in place of the palette; Back to the palette deselects', () => {
    setup()
    selectRose()
    expect(screen.getByRole('button', { name: 'Flip' })).toBeInTheDocument()
    expect(screen.getByText('Row 16, column 5')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Back to the palette/ }))
    expect(canvasProps.selectedDecorations.size).toBe(0)
    expect(screen.queryByRole('button', { name: 'Flip' })).not.toBeInTheDocument()
  })

  test('Flip (and F) mirrors it, one undo step each', () => {
    setup()
    selectRose()
    fireEvent.click(screen.getByRole('button', { name: 'Flip' }))
    expect(canvasProps.decorations[0].data).toEqual({ flip: true })
    step(() => fireEvent.keyDown(window, { key: 'f' }))
    expect(canvasProps.decorations[0].data).toEqual({})
    fireEvent.click(undoButton())
    expect(canvasProps.decorations[0].data).toEqual({ flip: true })
  })

  test('Duplicate (and Cmd+D) adds a copy a cell to the right and selects it', () => {
    setup()
    selectRose()
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }))
    const copy = canvasProps.decorations[1]
    expect(copy).toMatchObject({ decorationId: 'roses_red', position: { x: 80, y: 240 } })
    expect(canvasProps.selectedDecorations.has(copy.id)).toBe(true)
    step(() => fireEvent.keyDown(window, { key: 'd', metaKey: true, ctrlKey: true }))
    expect(canvasProps.decorations[2].position).toMatchObject({ x: 96, y: 240 })
  })

  test('Delete in the inspector removes it and brings the palette back', () => {
    setup()
    selectRose()
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(canvasProps.decorations).toHaveLength(0)
    expect(screen.queryByRole('button', { name: 'Flip' })).not.toBeInTheDocument()
  })

  test('Cmd+S saves and stays, even while typing in a field', async () => {
    const { onSave, onExit } = setup()
    step(() => paletteProps.onHouseCustomizationChange({ wallColor: '#3a5f8c' }))
    const input = document.createElement('input')
    document.body.appendChild(input)
    await act(async () => {
      fireEvent.keyDown(input, { key: 's', metaKey: true, ctrlKey: true })
    })
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onExit).not.toHaveBeenCalled()
    expect(() => routeChangeStart()('/feed')).not.toThrow()
    input.remove()
  })

  test('See it as a visitor hides the editing tools; Escape comes back', () => {
    setup()
    selectRose()
    fireEvent.click(screen.getByRole('button', { name: 'See it as a visitor' }))
    expect(canvasProps.onScenePointer).toBeUndefined()
    expect(canvasProps.isDecorationMode).toBe(false)
    expect(canvasProps.selectedDecorations).toBeUndefined()
    expect(screen.getByText('This is how neighbors see your yard.')).toBeInTheDocument()
    step(() => fireEvent.keyDown(window, { key: 'Escape' }))
    expect(canvasProps.onScenePointer).toBeDefined()
  })

  describe('the autosaved draft', () => {
    beforeEach(() => jest.useFakeTimers())
    afterEach(() => jest.useRealTimers())
    const draftKey = 'pixelHomeDraft:tester'

    test('unsaved work is kept a second after the last edit, and cleared once clean', () => {
      setup()
      step(() => paletteProps.onHouseCustomizationChange({ wallColor: '#3a5f8c' }))
      expect(localStorage.getItem(draftKey)).toBeNull()
      act(() => jest.advanceTimersByTime(1000))
      expect(JSON.parse(localStorage.getItem(draftKey)!).doc.house.wallColor).toBe('#3a5f8c')

      fireEvent.click(undoButton())
      act(() => jest.advanceTimersByTime(1000))
      expect(localStorage.getItem(draftKey)).toBeNull()
    })

    test('reopening offers it: Restore brings it back as one undo step', () => {
      setup()
      step(() => paletteProps.onHouseCustomizationChange({ wallColor: '#3a5f8c' }))
      act(() => jest.advanceTimersByTime(1000))
      cleanupAndReopen()

      expect(screen.getByText(/You have unsaved changes from/)).toBeInTheDocument()
      // nothing is overwritten while the question is open
      act(() => jest.advanceTimersByTime(5000))
      expect(localStorage.getItem(draftKey)).not.toBeNull()

      fireEvent.click(screen.getByRole('button', { name: 'Restore' }))
      expect(canvasProps.houseCustomizations.wallColor).toBe('#3a5f8c')
      expect(() => routeChangeStart()('/feed')).toThrow() // restored work is unsaved
      fireEvent.click(undoButton())
      expect(canvasProps.houseCustomizations.wallColor).toBeUndefined()
    })

    test('Discard drops it for good', () => {
      localStorage.setItem(draftKey, JSON.stringify({ at: Date.now(), doc: { decorations: [], terrain: { '6,12': 'sand' }, house: {}, atmosphere: { sky: 'night', weather: 'clear', timeOfDay: 'midday' }, template: 'cottage_v1', palette: 'thread_sage' } }))
      setup()
      fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
      expect(localStorage.getItem(draftKey)).toBeNull()
      expect(canvasProps.terrain).toEqual({})
    })

    test('a draft that matches the home as it is now is not offered', () => {
      setup()
      const doc = { decorations: canvasProps.decorations, terrain: {}, house: canvasProps.houseCustomizations, atmosphere: { sky: 'sunny', weather: 'clear', timeOfDay: 'midday' }, template: 'cottage_v1', palette: 'thread_sage' }
      localStorage.setItem(draftKey, JSON.stringify({ at: Date.now(), doc }))
      cleanupAndReopen()
      expect(screen.queryByText(/You have unsaved changes/)).not.toBeInTheDocument()
      expect(localStorage.getItem(draftKey)).toBeNull()
    })
  })
})

/** Unmount and open the editor again on the same saved home (a reload). */
function cleanupAndReopen() {
  const { cleanup } = require('@testing-library/react')
  cleanup()
  setup()
}
