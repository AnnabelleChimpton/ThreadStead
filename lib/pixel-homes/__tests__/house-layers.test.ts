import sockets from '../../../design/pixel-art/_template-house.sockets.json'
import { HOUSE_PALETTE_RAMPS, KEY_RAMPS, LIT_GLASS_RAMP, isPaletteColour } from '../palette'
import {
  HOUSE_LAYER_SETS,
  PLACEHOLDER_LAYER_SETS,
  enabledHouseSpriteTemplates,
  houseLayerSet,
  houseOptionSprites,
  keyColourMap,
  swapKeyColours,
} from '../house-layers'
import { animatedSpriteIds } from '../sprite-animation'

describe('key colours', () => {
  test('match the drawing template', () => {
    const { _about, ...fromFile } = sockets.keyRamps
    expect(_about).toBeTruthy()
    expect(fromFile).toEqual(KEY_RAMPS)
  })

  test('every house palette has four master-palette colours per part', () => {
    for (const [name, ramps] of Object.entries(HOUSE_PALETTE_RAMPS)) {
      for (const part of Object.keys(KEY_RAMPS) as (keyof typeof KEY_RAMPS)[]) {
        expect([name, part, ramps[part].length]).toEqual([name, part, 4])
        for (const hex of ramps[part]) expect([name, part, hex, isPaletteColour(hex)]).toEqual([name, part, hex, true])
      }
    }
    expect(Object.keys(HOUSE_PALETTE_RAMPS).sort()).toEqual(['charcoal_nights', 'classic_linen', 'crt_glow', 'pixel_petals', 'thread_sage'])
  })

  test('swapKeyColours changes only solid key pixels, step for step', () => {
    const map = keyColourMap('pixel_petals')
    expect(map.size).toBe(16)
    const data = new Uint8ClampedArray([
      0x00, 0xd0, 0xd0, 255, // roof key step 3
      0x00, 0xd0, 0xd0, 128, // half-clear key: left alone
      0x12, 0x34, 0x56, 255, // not a key: left alone
      0x50, 0x00, 0x50, 255, // wall key step 1
    ])
    expect(swapKeyColours(data, map)).toBe(2)
    const hex = (i: number) => '#' + [...data.slice(i, i + 3)].map((n) => n.toString(16).padStart(2, '0')).join('')
    expect(hex(0)).toBe(HOUSE_PALETTE_RAMPS.pixel_petals.roof[2])
    expect(hex(4)).toBe('#00d0d0')
    expect(hex(8)).toBe('#123456')
    expect(hex(12)).toBe(HOUSE_PALETTE_RAMPS.pixel_petals.wall[0])
  })

  test('an unknown palette falls back to thread_sage', () => {
    expect([...keyColourMap('nope')]).toEqual([...keyColourMap('thread_sage')])
  })

  test('at night every palette lights its windows and keeps the rest', () => {
    const hex = (rgb: [number, number, number]) => '#' + rgb.map((c) => c.toString(16).padStart(2, '0')).join('')
    const key = (k: string) => parseInt(k.slice(1), 16)
    for (const palette of Object.keys(HOUSE_PALETTE_RAMPS)) {
      const day = keyColourMap(palette)
      const night = keyColourMap(palette, true)
      KEY_RAMPS.glass.forEach((k, step) => expect(hex(night.get(key(k))!)).toBe(LIT_GLASS_RAMP[step]))
      for (const part of ['wall', 'roof', 'trim'] as const) {
        for (const k of KEY_RAMPS[part]) expect(night.get(key(k))).toEqual(day.get(key(k)))
      }
    }
    for (const hex of LIT_GLASS_RAMP) expect(isPaletteColour(hex)).toBe(true)
  })
})

describe('which houses use layers', () => {
  test('nothing switches without real art, flag or not', () => {
    expect(Object.keys(HOUSE_LAYER_SETS)).toEqual([])
    expect(houseLayerSet('cabin_v1', 'cabin_v1')).toBeNull()
    expect(houseLayerSet('cabin_v1', undefined)).toBeNull()
  })

  test('the flag is a comma list', () => {
    expect([...enabledHouseSpriteTemplates(' cabin_v1, cottage_v1 ,')]).toEqual(['cabin_v1', 'cottage_v1'])
    expect(enabledHouseSpriteTemplates(undefined).size).toBe(0)
  })

  test('option sprites drop into their sockets; choices without a drawing are skipped', () => {
    const set = { ...PLACEHOLDER_LAYER_SETS.cabin_v1, options: { 'door-arched': '/d.png', 'window-round': '/w.png' } }
    const sprites = houseOptionSprites('cabin_v1', set, { doorStyle: 'arched', windowStyle: 'round', chimneyStyle: 'stone' })
    expect(sprites).toEqual([
      { name: 'door-arched', src: '/d.png', box: sockets.cabin.sockets.door },
      { name: 'window-round', src: '/w.png', box: sockets.cabin.sockets['window-left'] },
      { name: 'window-round', src: '/w.png', box: sockets.cabin.sockets['window-right'] },
    ])
    expect(houseOptionSprites('cabin_v1', set, { doorStyle: 'default' })).toEqual([])
  })
})

describe('animation budget', () => {
  test('at most three strips play, in stored order; stills never count', () => {
    const items = [
      { id: 'a', pngUrl: 'a.png', pngFrames: 3 },
      { id: 'still', pngUrl: 's.png', pngFrames: 1 },
      { id: 'svg', pngFrames: 4 },
      { id: 'b', pngUrl: 'b.png', pngFrames: 2 },
      { id: 'c', pngUrl: 'c.png', pngFrames: 4 },
      { id: 'd', pngUrl: 'd.png', pngFrames: 2 },
    ]
    expect([...animatedSpriteIds(items)]).toEqual(['a', 'b', 'c'])
    expect([...animatedSpriteIds(items, 1)]).toEqual(['a'])
  })
})
