/**
 * The editor's safety fixes (pixel-homes PLAN.md, Phase 0):
 *  - 0.5: "unsaved" means the home differs from the last save (terrain,
 *    colours, theme, sky and text included, not just undo history), and
 *    Cancel, site links and router navigation all ask before dropping it
 *  - 0.6: a plain click on a decoration only selects it; a drag starts past
 *    a small threshold and always ends on mouseup
 *
 * The canvas and palette are stubs that hand back their props, so each test
 * calls the same callbacks the real components would, in the same order: a
 * press on a decoration fires onDecorationMouseDown, then bubbles to the
 * canvas's onMouseDown with canvas coordinates.
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
    return null
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

/** Press on the rose at canvas (x, y), as the real canvas reports it. */
function pressRose(x: number, y: number) {
  step(() => canvasProps.onDecorationMouseDown(ROSE.id, ev()))
  step(() => canvasProps.onMouseDown(x, y, ev()))
}
const moveTo = (x: number, y: number) => step(() => canvasProps.onMouseMove(x, y, ev()))
const release = () => step(() => fireEvent.mouseUp(window))

/** The routeChangeStart listener the leave guard registered. */
const routeChangeStart = () => router.events.on.mock.calls.filter(([name]) => name === 'routeChangeStart').at(-1)![1]

beforeEach(() => {
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
    step(() => canvasProps.onDecorationClick(ROSE.id, ev()))
    expect(canvasProps.selectedDecorations.has(ROSE.id)).toBe(true)
    // no ghost follows the pointer
    moveTo(300, 300)
    expect(canvasProps.previewPosition).toBeNull()

    // the next click on the lawn used to teleport the rose there
    step(() => canvasProps.onClick(300, 300, ev()))
    expect(rosePosition()).toMatchObject({ x: 64, y: 240 })
    expect(canvasProps.selectedDecorations.size).toBe(0)
  })

  test('a wobble under the threshold is still a click', () => {
    setup()
    pressRose(70, 250)
    moveTo(72, 251)
    expect(canvasProps.previewPosition).toBeNull()
    release()
    step(() => canvasProps.onClick(300, 300, ev()))
    expect(rosePosition()).toMatchObject({ x: 64, y: 240 })
  })

  test('a real drag moves the decoration, keeping the grab point', () => {
    setup()
    pressRose(70, 250) // 6 px right of and 10 px below the rose's corner
    moveTo(150, 250)
    expect(canvasProps.previewItem?.id).toBe(ROSE.id)
    expect(canvasProps.previewPosition).not.toBeNull()
    moveTo(200, 300)
    release()

    const { x, y } = rosePosition()
    // snapping may pull it up to 8 px towards the 16 px grid
    expect(Math.abs(x - 194)).toBeLessThanOrEqual(8)
    expect(Math.abs(y - 290)).toBeLessThanOrEqual(8)
    expect(canvasProps.previewPosition).toBeNull()

    // the click that follows the drop neither places nor moves anything
    step(() => canvasProps.onClick(200, 300, ev()))
    expect(rosePosition()).toMatchObject({ x, y })
  })

  test('the drag ends on mouseup even when the pointer left the canvas', () => {
    setup()
    pressRose(70, 250)
    moveTo(150, 250)
    step(() => canvasProps.onMouseLeave())
    release()
    expect(rosePosition()).toMatchObject({ x: 64, y: 240 })
    expect(canvasProps.previewPosition).toBeNull()

    // nothing is left armed for the next click
    step(() => canvasProps.onClick(300, 300, ev()))
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
  const clickCancel = () => fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

  test('a clean editor leaves without asking', async () => {
    const { onExit } = setup()
    clickCancel()
    await waitFor(() => expect(onExit).toHaveBeenCalled())
    expect(screen.queryByText('Leave without saving?')).not.toBeInTheDocument()
  })

  test('terrain alone counts: Cancel asks, Keep editing stays, Leave leaves', async () => {
    const { onExit } = setup()
    step(() => paletteProps.onTerrainSelect('water'))
    step(() => canvasProps.onMouseDown(100, 200, ev()))
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
    step(() => canvasProps.onClick(200, 200, ev()))
    expect(canvasProps.decorations).toHaveLength(2)
    expect(() => routeChangeStart()('/feed')).toThrow()

    step(() => fireEvent.keyDown(window, { key: 'z', ctrlKey: true, metaKey: true }))
    expect(canvasProps.decorations).toHaveLength(1)
    expect(() => routeChangeStart()('/feed')).not.toThrow()
  })

  test('after a successful save the editor leaves without asking', async () => {
    const { onSave, onExit } = setup()
    step(() => paletteProps.onHouseCustomizationChange({ wallColor: '#3a5f8c', houseNumber: undefined }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Save/ }))
    })

    const payload = onSave.mock.calls[0][0]
    expect(payload.houseCustomizations.wallColor).toBe('#3a5f8c')
    // cleared fields go as null so the server clears them too
    expect(payload.houseCustomizations).toHaveProperty('houseNumber', null)
    expect(onExit).toHaveBeenCalled()
    expect(screen.queryByText('Leave without saving?')).not.toBeInTheDocument()
    expect(() => routeChangeStart()('/home/tester')).not.toThrow()
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
    step(() => canvasProps.onMouseDown(100, 200, ev()))
    for (const x of [116, 132, 148, 164]) moveTo(x, 200)
    release()
    expect(Object.keys(canvasProps.terrain)).toHaveLength(5)

    undoKey()
    expect(canvasProps.terrain).toEqual({})
    redoKey()
    expect(Object.keys(canvasProps.terrain)).toHaveLength(5)
  })

  test('typing sign text is one undo step, and the palette follows undo', () => {
    setup()
    step(() => canvasProps.onDecorationClick(ROSE.id, ev()))
    for (const text of ['H', 'HI', 'HI!']) step(() => paletteProps.onDecorationUpdate(ROSE.id, { text }))
    expect(paletteProps.selectedItem.text).toBe('HI!')

    undoKey()
    expect(canvasProps.decorations[0].text).toBeUndefined()
    expect(paletteProps.selectedItem.text).toBeUndefined()
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
    step(() => canvasProps.onClick(200, 200, ev()))
    step(() => paletteProps.onItemSelect(null))
    const pine = canvasProps.decorations[1]
    expect(pine.decorationId).toBe('tree_pine')
    step(() => canvasProps.onDecorationClick(pine.id, ev()))
    expect(canvasProps.selectedDecorations.has(pine.id)).toBe(true)

    undoKey()
    expect(canvasProps.decorations).toHaveLength(1)
    expect(canvasProps.selectedDecorations.size).toBe(0)
  })

  test('deleting and moving are undoable', () => {
    setup()
    step(() => canvasProps.onDecorationClick(ROSE.id, ev()))
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
