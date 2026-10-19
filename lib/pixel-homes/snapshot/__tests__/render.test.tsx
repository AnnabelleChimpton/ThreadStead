/**
 * @jest-environment node
 *
 * The share snapshot drawn for real (sharp + librsvg, no mocks): sizes,
 * a few known pixels, and that her PNGs stay crisp — every art pixel a
 * whole square, never blended with its neighbours.
 */
import sharp from 'sharp'
import { getDecorationDimensions } from '@/lib/pixel-homes/decoration-dimensions'
import {
  CARD_SIZE,
  OG_SIZE,
  ogCropTop,
  renderHomeSnapshot,
  renderSceneSvg,
} from '@/lib/pixel-homes/snapshot/render'
import type { HomeScene, SceneDecoration } from '@/lib/pixel-homes/home-scene'

type RGBA = [number, number, number, number]

const RED: RGBA = [255, 0, 0, 255]
const BLUE: RGBA = [0, 0, 255, 255]
const SKY_TOP = '#5ba3d0' // sunny band 0 (DitherPatternDefs SKY_COLORS)
const SKY_NEXT = '#6bb5dc' // sunny band 2; band 1 is a 1px checker of the two

function scene(overrides: Partial<HomeScene> = {}): HomeScene {
  return {
    template: 'cottage_v1',
    palette: 'thread_sage',
    houseCustomizations: {},
    sky: 'sunny',
    terrain: {},
    decorations: [],
    ...overrides,
  }
}

function decoration(overrides: Partial<SceneDecoration> & { x: number; y: number }): SceneDecoration {
  const { x, y, ...rest } = overrides
  return {
    id: `${rest.decorationId ?? 'daisies_white'}_${x}_${y}`,
    decorationId: 'daisies_white',
    type: 'plant',
    zone: 'front_yard',
    position: { x, y, layer: 300000 + (y + 20) * 1000 + x },
    variant: 'white',
    size: 'medium',
    ...rest,
  }
}

/** A w×h PNG checkerboard of 1px red and blue squares (red at 0,0). */
async function checkerPng(w: number, h: number): Promise<Buffer> {
  const raw = Buffer.alloc(w * h * 4)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) raw.set((x + y) % 2 === 0 ? RED : BLUE, (y * w + x) * 4)
  return sharp(raw, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer()
}

async function pixels(png: Buffer) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const at = (x: number, y: number): RGBA => {
    const i = (y * info.width + x) * 4
    return [data[i], data[i + 1], data[i + 2], data[i + 3]]
  }
  const hex = (x: number, y: number) =>
    '#' + at(x, y).slice(0, 3).map((c) => c.toString(16).padStart(2, '0')).join('')
  return { info, at, hex }
}

const noImages = async () => null

describe('renderHomeSnapshot', () => {
  test('draws a 1200×630 share image and a 512×352 card', async () => {
    const { og, card } = await renderHomeSnapshot(scene(), { loadImage: noImages })
    expect(await sharp(og).metadata()).toMatchObject({ format: 'png', ...OG_SIZE })
    expect(await sharp(card).metadata()).toMatchObject({ format: 'png', ...CARD_SIZE })
  })

  test('the sky is the canvas sky, and the share image is it at exactly 2×', async () => {
    const { og, card } = await renderHomeSnapshot(scene(), { loadImage: noImages })
    const c = await pixels(card)
    const o = await pixels(og)
    expect(ogCropTop(scene())).toBe(0)

    expect(c.hex(5, 5)).toBe(SKY_TOP)
    expect(c.hex(500, 5)).toBe(SKY_TOP)
    // The first transition band is a 1px checker of the two sky colours…
    const checker = [c.hex(10, 15), c.hex(11, 15), c.hex(10, 16), c.hex(11, 16)]
    expect(new Set(checker)).toEqual(new Set([SKY_TOP, SKY_NEXT]))
    expect(checker[0]).toBe(checker[3])
    expect(checker[1]).toBe(checker[2])
    expect(checker[0]).not.toBe(checker[1])

    // …and in the share image each of those pixels is a 2×2 square, shifted
    // right by the 44 units of sky carried past the yard's left edge.
    for (const [x, y] of [[10, 15], [11, 15], [10, 16], [11, 16]]) {
      const ox = (x + 44) * 2
      const oy = y * 2
      const want = c.hex(x, y)
      expect([o.hex(ox, oy), o.hex(ox + 1, oy), o.hex(ox, oy + 1), o.hex(ox + 1, oy + 1)]).toEqual([want, want, want, want])
    }
    // The carried-on sky at the far left continues the same bands.
    expect(o.hex(0, 0)).toBe(SKY_TOP)
  })

  test('a different sky is a different picture', async () => {
    const { card } = await renderHomeSnapshot(scene({ sky: 'sunset' }), { loadImage: noImages })
    expect((await pixels(card)).hex(5, 5)).toBe('#4a3070')
  })

  test("the house uses the resident's colours", async () => {
    const count = async (s: HomeScene) => {
      const { card } = await renderHomeSnapshot(s, { loadImage: noImages })
      const { at } = await pixels(card)
      let n = 0
      for (let y = 32; y < 212; y++) for (let x = 156; x < 356; x++) {
        const [r, g, b] = at(x, y)
        if (r === 255 && g === 0 && b === 255) n++
      }
      return n
    }
    expect(await count(scene())).toBe(0)
    expect(await count(scene({ houseCustomizations: { roofColor: '#FF00FF' } }))).toBeGreaterThan(100)
  })

  test('her PNG sprites keep every pixel: nearest-neighbour at 1× and 2×, never blended', async () => {
    const sprite = await checkerPng(20, 20) // daisies_white is 20×20 on the canvas
    const loadImage = jest.fn(async (url: string) => (url === 'https://cdn.test/daisies_white.png' ? sprite : null))
    const daisy = decoration({ x: 100, y: 250, pngUrl: 'https://cdn.test/daisies_white.png' })
    const s = scene({ decorations: [daisy] })

    const { og, card } = await renderHomeSnapshot(s, { loadImage })
    expect(loadImage).toHaveBeenCalledWith('https://cdn.test/daisies_white.png')
    const c = await pixels(card)
    const o = await pixels(og)
    const top = ogCropTop(s)

    for (let j = 0; j < 20; j++) {
      for (let i = 0; i < 20; i++) {
        const want = (i + j) % 2 === 0 ? RED : BLUE
        expect(c.at(100 + i, 250 + j)).toEqual(want)
        const ox = (100 + 44 + i) * 2
        const oy = (250 - top + j) * 2
        expect([o.at(ox, oy), o.at(ox + 1, oy), o.at(ox, oy + 1), o.at(ox + 1, oy + 1)]).toEqual([want, want, want, want])
      }
    }
    // Just outside the sprite is grass, not a smeared edge.
    for (const [x, y] of [[99, 260], [120, 260], [110, 249]]) {
      const [r, g, b] = c.at(x, y)
      expect(r === 255 && b === 0).toBe(false)
      expect(g).toBeGreaterThan(b)
    }
  })

  test('a large sprite is scaled by nearest-neighbour too: only its own colours', async () => {
    const sprite = await checkerPng(20, 20)
    const big = decoration({ x: 200, y: 260, size: 'large', pngUrl: 'https://cdn.test/d.png' })
    const { card } = await renderHomeSnapshot(scene({ decorations: [big] }), { loadImage: async () => sprite })
    const c = await pixels(card)
    // large = 1.4× → a 28×28 box
    const seen = new Set<string>()
    for (let y = 260; y < 288; y++) for (let x = 200; x < 228; x++) seen.add(c.at(x, y).join(','))
    expect(seen).toEqual(new Set([RED.join(','), BLUE.join(',')]))
  })

  test("a PNG that won't load falls back to the code-drawn decoration, like the canvas", async () => {
    const daisy = decoration({ x: 300, y: 280, pngUrl: 'https://cdn.test/missing.png' })
    const bare = await pixels((await renderHomeSnapshot(scene(), { loadImage: noImages })).card)
    const withFallback = await pixels((await renderHomeSnapshot(scene({ decorations: [daisy] }), { loadImage: noImages })).card)
    let changed = 0
    for (let y = 280; y < 300; y++) for (let x = 300; x < 320; x++) if (bare.hex(x, y) !== withFallback.hex(x, y)) changed++
    expect(changed).toBeGreaterThan(10)
  })

  test("a resident's own upload is drawn at its natural size, centred in its square", async () => {
    const art = await checkerPng(8, 8)
    const custom = decoration({ x: 64, y: 200, type: 'custom', decorationId: 'custom_0', customAssetUrl: 'https://cdn.test/u.png' })
    const { card } = await renderHomeSnapshot(scene({ decorations: [custom] }), { loadImage: async () => art })
    const c = await pixels(card)
    // a 64×64 box; the 8×8 art sits in its middle: (64+28, 200+28)
    expect(c.at(92, 228)).toEqual(RED)
    expect(c.at(93, 228)).toEqual(BLUE)
    expect(c.at(99, 235)).toEqual(RED)
    expect(c.at(91, 228)).not.toEqual(BLUE)
  })

  test('the house sorts with the decorations by their feet, as the canvas does', async () => {
    const red = await checkerPng(1, 1) // a single red pixel, stretched to the box
    const blue = await sharp(Buffer.from(BLUE), { raw: { width: 1, height: 1, channels: 4 } }).png().toBuffer()
    const load = async (url: string) => (url.endsWith('red.png') ? red : blue)
    // Feet at 150 + its height, above the house's sort line (182): behind the wall
    const behind = decoration({ x: 240, y: 150, pngUrl: 'https://cdn.test/red.png' })
    const { card } = await renderHomeSnapshot(scene({ decorations: [behind] }), { loadImage: load })
    expect((await pixels(card)).at(250, 160)).not.toEqual(RED)

    // Brought forward a level: in front of the house again
    const forward = { ...behind, layerBias: 1 }
    const front = await renderHomeSnapshot(scene({ decorations: [forward] }), { loadImage: load })
    expect((await pixels(front.card)).at(250, 160)).toEqual(RED)

    // Between two decorations at the same spot, the one further down the yard is in front
    const lower = { ...decoration({ x: 240, y: 152, pngUrl: 'https://cdn.test/blue.png' }), id: 'b', layerBias: 1 }
    const both = await renderHomeSnapshot(scene({ decorations: [lower, forward] }), { loadImage: load })
    expect((await pixels(both.card)).at(250, 160)).toEqual(BLUE)
  })

  test('a flipped decoration is mirrored in its box, as the canvas draws it', async () => {
    // left half red, right half blue
    const halves = await sharp(Buffer.from([...RED, ...BLUE]), { raw: { width: 2, height: 1, channels: 4 } }).png().toBuffer()
    const plain = decoration({ x: 300, y: 280, pngUrl: 'https://cdn.test/h.png' })
    const flipped = { ...plain, data: { flip: true } }
    const at = async (item: typeof plain) =>
      (await pixels((await renderHomeSnapshot(scene({ decorations: [item] }), { loadImage: async () => halves })).card))
    const box = getDecorationDimensions('daisies_white', 'plant').width
    expect((await at(plain)).at(302, 290)).toEqual(RED)
    expect((await at(flipped)).at(302, 290)).toEqual(BLUE)
    expect((await at(flipped)).at(300 + box - 2, 290)).toEqual(RED)
  })

  test('terrain tiles are drawn on the grid', async () => {
    const bare = await pixels((await renderHomeSnapshot(scene(), { loadImage: noImages })).card)
    const watered = await pixels(
      (await renderHomeSnapshot(scene({ terrain: { '2,18': 'water', '3,18': 'grass' } }), { loadImage: noImages })).card
    )
    expect(watered.hex(40, 296)).not.toBe(bare.hex(40, 296)) // cell 2,18 = x 32–48, y 288–304
    expect(watered.hex(56, 296)).toBe(bare.hex(56, 296)) // grass is the ground already
  })
})

describe('ogCropTop', () => {
  test('keeps the roof: a yard full at the bottom never crops past 30 rows', () => {
    const low = scene({ decorations: [decoration({ x: 10, y: 330 })] })
    expect(ogCropTop(low)).toBe(30)
  })

  test('something in the sky pulls the crop up to the top', () => {
    const high = scene({ decorations: [decoration({ x: 10, y: 0 })] })
    expect(ogCropTop(high)).toBe(0)
  })
})

describe('renderSceneSvg', () => {
  test('fetches nothing itself: every image is inlined as data', async () => {
    const svg = await renderSceneSvg(
      scene({ decorations: [decoration({ x: 1, y: 200, pngUrl: 'https://cdn.test/d.png' })] }),
      { loadImage: async () => checkerPng(2, 2) }
    )
    const hrefs = [...svg.matchAll(/href="([^"]*)"/g)].map((m) => m[1])
    expect(hrefs.length).toBeGreaterThan(0)
    expect(hrefs.every((h) => h.startsWith('data:image/png;base64,'))).toBe(true)
  })
})
