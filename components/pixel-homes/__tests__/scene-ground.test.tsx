/**
 * One ground everywhere: the yard's sky and lawn are threadstead-44, the same
 * bands as the street, and a night sky darkens the lawn and lights the windows.
 */
import { render } from '@testing-library/react'
import EnhancedHouseCanvas from '@/components/pixel-homes/EnhancedHouseCanvas'
import HouseSVG from '@/components/pixel-homes/HouseSVG'
import { GroundGradientDefs, NIGHT_STARS, SkyGradientDefs, type SkyType } from '@/components/pixel-homes/DitherPatternDefs'
import { LIT_GLASS, isPaletteColour } from '@/lib/pixel-homes/palette'

beforeAll(() => {
  class NoopObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  const g = globalThis as { ResizeObserver?: unknown }
  g.ResizeObserver ??= NoopObserver
})

const fills = (root: Element) =>
  [...root.querySelectorAll('[fill]')].map((el) => el.getAttribute('fill')!).filter((f) => f.startsWith('#'))

const SKIES: SkyType[] = ['sunny', 'cloudy', 'sunset', 'night']

describe('the yard ground', () => {
  test('every sky, lawn and star is a threadstead-44 colour', () => {
    const colours = [
      ...SKIES.flatMap((sky) => fills(render(<svg><SkyGradientDefs sky={sky} /></svg>).container)),
      ...(['day', 'night'] as const).flatMap((ground) => fills(render(<svg><GroundGradientDefs ground={ground} /></svg>).container)),
      ...NIGHT_STARS.map(([, , , colour]) => colour),
    ]
    expect(colours.length).toBeGreaterThan(20)
    expect(colours.filter((c) => !isPaletteColour(c))).toEqual([])
  })

  test("the day lawn starts at the street's grass ramp; the night lawn is darker", () => {
    const day = fills(render(<svg><GroundGradientDefs ground="day" /></svg>).container)
    const night = fills(render(<svg><GroundGradientDefs ground="night" /></svg>).container)
    expect(day).toContain('#608d43')
    expect(night).not.toContain('#a3c27a')
    expect(night).not.toContain('#608d43')
  })

  test('a night sky darkens the lawn and lights the windows; any other sky leaves them', () => {
    const scene = (sky: SkyType) =>
      render(<EnhancedHouseCanvas template="cottage_v1" palette="thread_sage" atmosphere={{ sky, weather: 'clear', timeOfDay: 'midday' }} />).container
    const day = scene('sunny')
    const night = scene('night')
    expect(day.querySelector('pattern[id$="-ground-day-0"]')).not.toBeNull()
    expect(night.querySelector('pattern[id$="-ground-night-0"]')).not.toBeNull()
    expect(night.querySelector('pattern[id*="-ground-day-"]')).toBeNull()
    expect(fills(day.querySelector('.house-svg')!)).not.toContain(LIT_GLASS)
    expect(fills(night.querySelector('.house-svg')!)).toContain(LIT_GLASS)
  })

  test("lit windows win over a resident's own window colour", () => {
    const { container } = render(<HouseSVG template="loft_v1" palette="crt_glow" customizations={{ windowColor: '#123456' }} lit />)
    expect(fills(container)).toContain(LIT_GLASS)
    expect(fills(container)).not.toContain('#123456')
  })
})
