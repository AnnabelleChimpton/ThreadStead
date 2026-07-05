/**
 * Unit tests for decoration placement grid math — the logic under every
 * drag/drop in the decoration editor (previously untested).
 */
import {
  pixelToGrid,
  gridToPixel,
  snapToGrid,
  DEFAULT_DECORATION_GRID,
  DecorationGridConfig,
} from '@/lib/pixel-homes/decoration-grid-utils'

const config: DecorationGridConfig = { ...DEFAULT_DECORATION_GRID }

describe('pixelToGrid', () => {
  test('floors into the containing cell', () => {
    const cell = config.cellSize
    expect(pixelToGrid(cell * 2 + 1, cell * 3 + cell - 1, config)).toMatchObject({
      gridX: 2,
      gridY: 3,
    })
  })

  test('clamps to canvas bounds (never negative, never past the edge)', () => {
    const maxX = Math.floor(config.canvasWidth / config.cellSize) - 1
    const maxY = Math.floor(config.canvasHeight / config.cellSize) - 1
    expect(pixelToGrid(-50, -50, config)).toMatchObject({ gridX: 0, gridY: 0 })
    expect(pixelToGrid(config.canvasWidth * 2, config.canvasHeight * 2, config)).toMatchObject({
      gridX: maxX,
      gridY: maxY,
    })
  })
})

describe('gridToPixel', () => {
  test('round-trips with pixelToGrid for in-bounds cells', () => {
    const p = gridToPixel(4, 2, config)
    const g = pixelToGrid(p.pixelX, p.pixelY, config)
    expect(g.gridX).toBe(4)
    expect(g.gridY).toBe(2)
  })

  test('clamps out-of-range grid coords into the canvas', () => {
    const p = gridToPixel(9999, 9999, config)
    expect(p.pixelX).toBeLessThanOrEqual(config.canvasWidth - config.cellSize)
    expect(p.pixelY).toBeLessThanOrEqual(config.canvasHeight - config.cellSize)
  })
})

describe('snapToGrid', () => {
  test('snaps when within snapDistance of a grid point', () => {
    const cell = config.cellSize
    const result = snapToGrid(cell * 3 + 1, cell * 2 - 1, { ...config, magneticSnapping: true })
    expect(result.snapped).toBe(true)
    expect(result.snapType).toBe('grid')
    expect(result.position.pixelX % cell).toBe(0)
    expect(result.position.pixelY % cell).toBe(0)
  })

  test('does not snap beyond snapDistance', () => {
    const cell = config.cellSize
    const off = Math.ceil(config.snapDistance) + 2
    const result = snapToGrid(cell * 3 + off, cell * 2 + off, {
      ...config,
      magneticSnapping: true,
    })
    expect(result.snapped).toBe(false)
    // Unsnapped placement keeps the exact pixel position (free placement)
    expect(result.position.pixelX).toBe(cell * 3 + off)
  })

  test('magneticSnapping=false is a pass-through', () => {
    const result = snapToGrid(123, 456, { ...config, magneticSnapping: false })
    expect(result.snapped).toBe(false)
    expect(result.position).toMatchObject({ pixelX: 123, pixelY: 456 })
  })
})
