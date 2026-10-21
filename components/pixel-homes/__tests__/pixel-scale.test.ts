import { pickPixelScale } from '../EnhancedHouseCanvas'

describe('pickPixelScale', () => {
  it('picks the largest scale that fits and maps to whole device pixels', () => {
    expect(pickPixelScale(1100, 2)).toBe(2) // 1024 fits
    expect(pickPixelScale(1600, 1)).toBe(3)
    expect(pickPixelScale(900, 2)).toBe(1.5) // 768 fits, 1.5 x 2 = 3
    expect(pickPixelScale(900, 1)).toBe(1) // 1.5 x 1 isn't whole
    expect(pickPixelScale(600, 3)).toBe(1)
  })

  it('also fits the height it is given', () => {
    expect(pickPixelScale(1200, 2, 660)).toBe(1.5) // 704 tall is too much
    expect(pickPixelScale(1200, 2, 800)).toBe(2)
  })

  it('stays at 1x when even that is too wide (the scene pans instead)', () => {
    expect(pickPixelScale(343, 3)).toBe(1)
  })
})

describe('pickPixelScale for the editor (allowBelowOne)', () => {
  const editor = (w: number, dpr: number, h = Infinity) => pickPixelScale(w, dpr, h, { allowBelowOne: true })

  it('is the same as the page above 1x', () => {
    expect(editor(1100, 2, 800)).toBe(2)
    expect(editor(900, 2)).toBe(1.5)
  })

  it('goes below 1x only to whole device pixels per art pixel', () => {
    expect(editor(359, 3)).toBe(2 / 3) // 341 px wide, each art pixel 2 device pixels
    expect(editor(359, 2)).toBe(0.5) // 256 px wide
    expect(editor(400, 2.625)).toBeCloseTo(2 / 2.625)
  })

  it('fits the height too, down to one device pixel per art pixel', () => {
    expect(editor(359, 3, 200)).toBe(1 / 3)
    expect(editor(359, 3, 10)).toBe(1 / 3) // nothing fits: the smallest, cropped
    expect(editor(359, 1)).toBe(1) // a 1x screen has nothing below 1x
  })
})

describe('pickCloseUpView (the house picker)', () => {
  const { pickCloseUpView } = jest.requireActual('@/lib/pixel-homes/pixel-scale')

  it('crops to the house at the largest whole-device-pixel scale that still shows it', () => {
    // signup on desktop: 456 px at 2x DPR → 1.5x, 304 columns around the house
    expect(pickCloseUpView(456, 2)).toEqual({ scale: 1.5, left: 104, top: 24, width: 304, height: 196 })
    // a phone at 3x DPR: 1x (3 device pixels per art pixel)
    expect(pickCloseUpView(323, 3)).toMatchObject({ scale: 1, width: 322 })
  })

  it('shows more of the yard when asked', () => {
    // the homepage demo: 636 px at 2x DPR
    expect(pickCloseUpView(636, 2, 400)).toMatchObject({ scale: 1.5, width: 424 })
    expect(pickCloseUpView(636, 2)).toMatchObject({ scale: 2, width: 318 })
  })

  it('never shows more than the scene, and every scale maps to whole device pixels', () => {
    for (const dpr of [1, 1.5, 2, 3]) {
      for (const w of [200, 320, 448, 700, 1400]) {
        const v = pickCloseUpView(w, dpr)
        expect(Number.isInteger(v.scale * dpr)).toBe(true)
        expect(v.width).toBeLessThanOrEqual(512)
        expect(v.top + v.height).toBeLessThanOrEqual(352)
        expect(v.left).toBe((512 - v.width) / 2)
      }
    }
  })
})
