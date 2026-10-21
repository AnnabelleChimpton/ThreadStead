/**
 * The rest of the yard on threadstead-44: every terrain tile (the yard's
 * patterns and the editor's icons) and every sky picker icon.
 */
import { render } from '@testing-library/react'
import DecorationIcon from '@/components/pixel-homes/DecorationIcon'
import { TerrainTileIcon } from '@/components/pixel-homes/DecorationPalette'
import { SKY_COLORS, TERRAIN_PATTERNS, TerrainDitherDefs } from '@/components/pixel-homes/DitherPatternDefs'
import { TERRAIN_TILES } from '@/lib/pixel-homes/decoration-data'
import { isPaletteColour } from '@/lib/pixel-homes/palette'

const fills = (root: Element) => [...root.querySelectorAll('[fill]')].map((el) => el.getAttribute('fill')!)
// Partly clear paint blends into colours outside the palette
const seeThrough = (root: Element) => root.querySelectorAll('[opacity], [fill-opacity]').length

const SKY_ICONS = ['sunny_sky', 'cloudy_sky', 'sunset_sky', 'night_sky'] as const

describe('terrain', () => {
  test('every tile colour is a threadstead-44 colour', () => {
    const colours = TERRAIN_TILES.flatMap((t) => [t.color, ...Object.values(t.shades)])
    expect(colours.filter((c) => !isPaletteColour(c))).toEqual([])
  })

  test("every fill in the yard's terrain patterns is a palette colour, none see-through", () => {
    const { container } = render(<svg><TerrainDitherDefs prefix="t" /></svg>)
    const colours = fills(container)
    expect(colours.length).toBeGreaterThan(50)
    expect(colours.filter((c) => !isPaletteColour(c))).toEqual([])
    expect(seeThrough(container)).toBe(0)
  })

  test('every tile but grass has its own pattern, in its own colours', () => {
    const { container } = render(<svg><TerrainDitherDefs prefix="t" /></svg>)
    const patterns = TERRAIN_TILES.filter((t) => t.id !== 'grass').map((t) => TERRAIN_PATTERNS[t.id])
    expect(new Set(patterns).size).toBe(patterns.length)
    for (const t of TERRAIN_TILES.filter((t) => t.id !== 'grass')) {
      const pattern = container.querySelector(`pattern[id="t-${TERRAIN_PATTERNS[t.id]}"]`)
      expect(pattern).not.toBeNull()
      expect(pattern!.firstElementChild!.getAttribute('fill')).toBe(t.color)
    }
  })

  test.each(TERRAIN_TILES.map((t) => t.id))('the %s picker icon is all palette colours, none see-through', (id) => {
    const { container } = render(<TerrainTileIcon tileId={id} size={32} />)
    expect(fills(container).filter((c) => !isPaletteColour(c))).toEqual([])
    expect(seeThrough(container)).toBe(0)
  })
})

describe('sky picker icons', () => {
  test.each(SKY_ICONS)('%s is drawn in its sky colours, all palette', (id) => {
    const { container } = render(<DecorationIcon type="sky" id={id} size={24} />)
    const colours = fills(container)
    expect(colours.filter((c) => !isPaletteColour(c))).toEqual([])
    const sky = SKY_COLORS[id.replace('_sky', '') as keyof typeof SKY_COLORS]
    for (const band of sky) expect(colours).toContain(band)
  })

  test("a stored icon SVG doesn't replace the drawn sky", () => {
    const { container } = render(
      <DecorationIcon type="sky" id="sunny_sky" iconSvg={'<svg><circle fill="#FCD34D"/></svg>'} />
    )
    expect(fills(container)).not.toContain('#FCD34D')
    expect(fills(container)).toContain(SKY_COLORS.sunny[0])
  })
})
