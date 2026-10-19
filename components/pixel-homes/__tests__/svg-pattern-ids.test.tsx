/**
 * SVG pattern ids are page-global, so a page with several houses (grid, map,
 * theme picker, street) needs every instance to own its ids. These pin that:
 * no duplicate ids, and every url(#…) resolves to a pattern in the same scene.
 */
import { render } from '@testing-library/react'
import HouseSVG, { HouseTemplate, PALETTE_COLORS } from '@/components/pixel-homes/HouseSVG'
import EnhancedHouseCanvas from '@/components/pixel-homes/EnhancedHouseCanvas'
import { layoutDitherBands } from '@/components/pixel-homes/DitherPatternDefs'

jest.mock('@/components/ui/PixelIcon', () => ({ PixelIcon: () => null }))

const TEMPLATES: HouseTemplate[] = ['cottage_v1', 'townhouse_v1', 'loft_v1', 'cabin_v1']

beforeAll(() => {
  // jsdom has neither observer; the components only need them to exist.
  class NoopObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  const g = globalThis as { ResizeObserver?: unknown; IntersectionObserver?: unknown }
  g.ResizeObserver ??= NoopObserver
  g.IntersectionObserver ??= NoopObserver
})

const duplicateIds = (root: Element) => {
  const counts = new Map<string, number>()
  root.querySelectorAll('[id]').forEach(el => counts.set(el.id, (counts.get(el.id) ?? 0) + 1))
  return [...counts].filter(([, n]) => n > 1).map(([id]) => id)
}

const urlRefs = (root: Element) =>
  [...root.querySelectorAll('[fill^="url(#"]')].map(el => el.getAttribute('fill')!.slice(5, -1))

const unresolvedRefs = (root: Element) => urlRefs(root).filter(id => !root.querySelector(`[id="${id}"]`))

// The roof's pattern fill, looked up inside the house's own <svg>
const roofFill = (house: Element) => {
  const roof = house.querySelector('path[fill^="url(#"]')!
  const id = roof.getAttribute('fill')!.slice(5, -1)
  return house.querySelector(`[id="${id}"] rect`)!.getAttribute('fill')
}

describe('HouseSVG pattern ids', () => {
  test('two houses in one render get distinct ids and their own roof colours', () => {
    const { container } = render(
      <>
        <HouseSVG template="cabin_v1" palette="thread_sage" />
        <HouseSVG template="cabin_v1" palette="crt_glow" />
      </>
    )
    const [first, second] = container.querySelectorAll('svg.house-svg')

    expect(duplicateIds(container)).toEqual([])
    expect(roofFill(first)).toBe(PALETTE_COLORS.thread_sage.primary)
    expect(roofFill(second)).toBe(PALETTE_COLORS.crt_glow.primary)
    // document.getElementById is what the browser uses for url(#…), so the
    // first house's patterns must not shadow the second's
    const secondRoofId = second.querySelector('path[fill^="url(#"]')!.getAttribute('fill')!.slice(5, -1)
    expect(second.contains(document.getElementById(secondRoofId))).toBe(true)
  })

  test('every pattern reference resolves, for every template and material', () => {
    for (const template of TEMPLATES) {
      for (const roofMaterial of ['default', 'shingles', 'tile', 'metal', 'thatch'] as const) {
        for (const wallPattern of ['default', 'shingles', 'board_batten', 'stone_veneer', 'brick'] as const) {
          for (const foundationStyle of ['default', 'brick'] as const) {
            for (const variant of ['detailed', 'simplified'] as const) {
              for (const chimneyStyle of ['default', 'brick', 'stone'] as const) {
                const { container, unmount } = render(
                  <HouseSVG
                    template={template}
                    palette="pixel_petals"
                    variant={variant}
                    customizations={{ roofMaterial, wallPattern, foundationStyle, chimneyStyle }}
                  />
                )
                expect(unresolvedRefs(container)).toEqual([])
                unmount()
              }
            }
          }
        }
      }
    }
  })
})

describe('EnhancedHouseCanvas pattern ids', () => {
  test('two canvases share no ids and every reference resolves', () => {
    const terrain = { '2,10': 'water', '3,10': 'stone_path', '4,10': 'flower_bed' }
    const { container } = render(
      <>
        <EnhancedHouseCanvas template="cottage_v1" palette="thread_sage" terrain={terrain} />
        <EnhancedHouseCanvas
          template="loft_v1"
          palette="charcoal_nights"
          terrain={terrain}
          atmosphere={{ sky: 'night', weather: 'clear', timeOfDay: 'night' }}
        />
      </>
    )
    expect(duplicateIds(container)).toEqual([])
    expect(unresolvedRefs(container)).toEqual([])
  })

  test('the terrain svg stays mounted when there are no tiles', () => {
    const { container, rerender } = render(<EnhancedHouseCanvas template="cabin_v1" palette="thread_sage" />)
    const terrainDefs = () => container.querySelector('pattern[id$="-terrain-water"]')
    const before = terrainDefs()
    expect(before).not.toBeNull()

    rerender(<EnhancedHouseCanvas template="cabin_v1" palette="thread_sage" terrain={{ '1,10': 'water' }} />)
    expect(terrainDefs()).toBe(before)
  })
})

describe('layoutDitherBands', () => {
  test('equal bands fill the height exactly', () => {
    const bands = layoutDitherBands(9, 96)
    expect(bands.reduce((sum, b) => sum + b.height, 0)).toBe(96)
    expect(Math.max(...bands.map(b => b.height)) - Math.min(...bands.map(b => b.height))).toBeLessThanOrEqual(1)
  })

  test('thin transitions are exactly 2px and the bands tile the height', () => {
    const bands = layoutDitherBands(11, 643, 2)
    expect(bands.filter(b => b.index % 2 === 1).every(b => b.height === 2)).toBe(true)
    let y = 0
    for (const band of bands) {
      expect(band.y).toBe(y)
      y += band.height
    }
    expect(y).toBe(643)
  })
})
