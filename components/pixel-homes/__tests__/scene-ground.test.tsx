/**
 * One ground everywhere: the yard's sky and lawn are threadstead-44, the same
 * bands as the street.
 */
import { render } from '@testing-library/react'
import { GroundGradientDefs, NIGHT_STARS, SkyGradientDefs, type SkyType } from '@/components/pixel-homes/DitherPatternDefs'
import { isPaletteColour } from '@/lib/pixel-homes/palette'

const fills = (root: Element) =>
  [...root.querySelectorAll('[fill]')].map((el) => el.getAttribute('fill')!).filter((f) => f.startsWith('#'))

const SKIES: SkyType[] = ['sunny', 'cloudy', 'sunset', 'night']

describe('the yard ground', () => {
  test('every sky, lawn and star is a threadstead-44 colour', () => {
    const colours = [
      ...SKIES.flatMap((sky) => fills(render(<svg><SkyGradientDefs sky={sky} /></svg>).container)),
      ...fills(render(<svg><GroundGradientDefs /></svg>).container),
      ...NIGHT_STARS.map(([, , , colour]) => colour),
    ]
    expect(colours.length).toBeGreaterThan(20)
    expect(colours.filter((c) => !isPaletteColour(c))).toEqual([])
  })

  test("the lawn is the street's grass ramp", () => {
    expect(fills(render(<svg><GroundGradientDefs /></svg>).container)).toContain('#608d43')
  })
})
