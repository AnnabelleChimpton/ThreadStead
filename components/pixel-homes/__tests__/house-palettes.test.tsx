/**
 * @jest-environment node
 */
/**
 * Every house palette owns its walls, and switching palettes visibly
 * repaints every starter house (design/starter-house-audit). Before this,
 * all five palettes painted near-identical cream walls and two gave the
 * same loft, pixel for pixel.
 */
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import sharp from 'sharp'
import HouseSVG, { PALETTE_COLORS, type ColorPalette, type HouseTemplate } from '../HouseSVG'
import { HOUSE_DETAIL_COLOURS, HOUSE_PALETTE_RAMPS, isPaletteColour, housePaint } from '@/lib/pixel-homes/palette'
import { HOUSE_PALETTES, HOUSE_TEMPLATES } from '@/lib/pixel-homes/house-choice'

type RGB = [number, number, number]
const rgb = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB

function lab([r, g, b]: RGB): RGB {
  const f = (c: number) => {
    c /= 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  const [R, G, B] = [f(r), f(g), f(b)]
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047
  const Y = R * 0.2126 + G * 0.7152 + B * 0.0722
  const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883
  const t = (v: number) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116)
  return [116 * t(Y) - 16, 500 * (t(X) - t(Y)), 200 * (t(Y) - t(Z))]
}

/** CIE76 colour difference; above about 15 reads as a different colour at a glance. */
const deltaE = (a: RGB, b: RGB) => {
  const A = lab(a)
  const B = lab(b)
  return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2])
}

const palettes = HOUSE_PALETTES.map((p) => p.id)
const pairs = palettes.flatMap((a, i) => palettes.slice(i + 1).map((b) => [a, b] as const))

async function raster(template: HouseTemplate, palette: ColorPalette): Promise<Buffer> {
  const markup = renderToStaticMarkup(<HouseSVG template={template} palette={palette} />).replace(
    '<svg ',
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="180" '
  )
  return sharp(Buffer.from(markup), { density: 72 }).ensureAlpha().raw().toBuffer()
}

/** Share of the house's solid pixels whose colour visibly changes between two renders. */
function visibleChange(a: Buffer, b: Buffer): number {
  let solid = 0
  let changed = 0
  for (let i = 0; i < a.length; i += 4) {
    if (a[i + 3] < 128 && b[i + 3] < 128) continue
    solid++
    if (deltaE([a[i], a[i + 1], a[i + 2]], [b[i], b[i + 1], b[i + 2]]) > 15) changed++
  }
  return changed / solid
}

describe('the palette table', () => {
  test('covers every palette the picker offers', () => {
    expect(Object.keys(HOUSE_PALETTE_RAMPS).sort()).toEqual([...palettes].sort())
    expect(Object.keys(HOUSE_DETAIL_COLOURS).sort()).toEqual([...palettes].sort())
  })

  test('the code-drawn house paints with step 3 of each sprite ramp', () => {
    for (const p of palettes) {
      const ramps = HOUSE_PALETTE_RAMPS[p]
      expect([p, PALETTE_COLORS[p]]).toEqual([
        p,
        { base: ramps.wall[2], primary: ramps.roof[2], secondary: ramps.trim[2], accent: ramps.glass[2], detail: HOUSE_DETAIL_COLOURS[p] },
      ])
      for (const hex of Object.values(housePaint(p))) expect([p, hex, isPaletteColour(hex)]).toEqual([p, hex, true])
    }
  })

  test('every palette owns its walls and roof', () => {
    for (const [a, b] of pairs) {
      const walls = deltaE(rgb(PALETTE_COLORS[a].base), rgb(PALETTE_COLORS[b].base))
      expect([a, b, walls > 15]).toEqual([a, b, true])
      expect([a, b, HOUSE_PALETTE_RAMPS[a].wall]).not.toEqual([a, b, HOUSE_PALETTE_RAMPS[b].wall])
      expect([a, b, HOUSE_PALETTE_RAMPS[a].roof]).not.toEqual([a, b, HOUSE_PALETTE_RAMPS[b].roof])
    }
  })
})

describe('switching palettes', () => {
  // Measured 2026-10-21: the least different pair repaints 77% (cottage),
  // 90% (townhouse), 85% (loft) and 81% (cabin) of the house. The cottage
  // tops out lower because its stone foundation and brick chimney don't
  // follow the palette.
  test.each(HOUSE_TEMPLATES.map((t) => [t.id]))('visibly repaints most of the %s, for every pair', async (template) => {
    const renders = Object.fromEntries(
      await Promise.all(palettes.map(async (p) => [p, await raster(template as HouseTemplate, p)] as const))
    )
    for (const [a, b] of pairs) {
      const share = visibleChange(renders[a], renders[b])
      expect([template, a, b, share >= 0.6]).toEqual([template, a, b, true])
    }
  })
})
