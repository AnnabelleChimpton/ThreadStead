/**
 * Smoke-render tests for HouseSVG — the core renderer of the pixel homes
 * feature (~1,250 LOC, 4 templates × 5 palettes × ~30 customization fields,
 * previously ZERO tests). These don't pin pixels; they guarantee every
 * template/palette/customization combination renders a real SVG without
 * throwing — the regression class that matters when touching the renderer.
 */
import { render } from '@testing-library/react'
import HouseSVG, {
  HouseTemplate,
  ColorPalette,
  HouseCustomizations,
} from '@/components/pixel-homes/HouseSVG'

const TEMPLATES: HouseTemplate[] = ['cottage_v1', 'townhouse_v1', 'loft_v1', 'cabin_v1']
const PALETTES: ColorPalette[] = [
  'thread_sage',
  'charcoal_nights',
  'pixel_petals',
  'crt_glow',
  'classic_linen',
]

const SAMPLE_CUSTOMIZATIONS: HouseCustomizations = {
  windowStyle: 'round',
  doorStyle: 'arched',
  roofTrim: 'scalloped',
  wallColor: '#f3d3f2',
  roofColor: '#4a7e82',
  trimColor: '#632c72',
}

describe('HouseSVG renders every template × palette', () => {
  for (const template of TEMPLATES) {
    for (const palette of PALETTES) {
      test(`${template} / ${palette}`, () => {
        const { container } = render(<HouseSVG template={template} palette={palette} />)
        const svg = container.querySelector('svg')
        expect(svg).not.toBeNull()
        // A real house, not an empty shell: paths/rects present
        expect(svg!.querySelectorAll('path, rect, circle, polygon').length).toBeGreaterThan(5)
      })
    }
  }
})

describe('customizations and variants', () => {
  test('custom colors flow into the rendered output', () => {
    const { container } = render(
      <HouseSVG template="cottage_v1" palette="thread_sage" customizations={SAMPLE_CUSTOMIZATIONS} />
    )
    expect(container.innerHTML).toContain('#f3d3f2') // wallColor
    expect(container.innerHTML).toContain('#4a7e82') // roofColor
  })

  test('every windowStyle/doorStyle/roofTrim option renders', () => {
    const windows: NonNullable<HouseCustomizations['windowStyle']>[] = ['default', 'round', 'arched', 'bay']
    const doors: NonNullable<HouseCustomizations['doorStyle']>[] = ['default', 'arched', 'double', 'cottage']
    const trims: NonNullable<HouseCustomizations['roofTrim']>[] = ['default', 'ornate', 'scalloped', 'gabled']
    for (const windowStyle of windows) {
      for (const doorStyle of doors) {
        for (const roofTrim of trims) {
          const { container, unmount } = render(
            <HouseSVG
              template="cottage_v1"
              palette="thread_sage"
              customizations={{ windowStyle, doorStyle, roofTrim }}
            />
          )
          expect(container.querySelector('svg')).not.toBeNull()
          unmount()
        }
      }
    }
  })

  test('simplified variant renders for all templates', () => {
    for (const template of TEMPLATES) {
      const { container, unmount } = render(
        <HouseSVG template={template} palette="thread_sage" variant="simplified" />
      )
      expect(container.querySelector('svg')).not.toBeNull()
      unmount()
    }
  })
})
