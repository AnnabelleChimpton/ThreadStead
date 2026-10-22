import { readFileSync } from 'fs'
import path from 'path'
import sockets from '../../../design/pixel-art/_template-house.sockets.json'
import { HOUSE_PALETTE_RAMPS, KEY_RAMPS, isPaletteColour } from '../palette'
import {
  HOUSE_LAYER_SETS,
  HOUSE_SOCKETS,
  PLACEHOLDER_LAYER_SETS,
  enabledHouseSpriteTemplates,
  houseLayerSet,
  houseExtrasAt,
  houseOptionSprites,
  keyColourMap,
  spriteDoorRect,
  spriteDrawable,
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
})

/** Width and height from a PNG's header. */
function pngSize(src: string): { w: number; h: number } {
  const file = readFileSync(path.join(process.cwd(), 'public', src))
  expect(file.toString('ascii', 1, 4)).toBe('PNG')
  return { w: file.readUInt32BE(16), h: file.readUInt32BE(20) }
}

describe('the drawn houses', () => {
  const templates = ['cabin_v1', 'cottage_v1', 'townhouse_v1', 'loft_v1']

  test('all four templates have art', () => {
    expect(Object.keys(HOUSE_LAYER_SETS).sort()).toEqual([...templates].sort())
  })

  test.each(templates)('%s: layers are 200x180 and every option is its socket size', (template) => {
    const set = HOUSE_LAYER_SETS[template]
    expect(pngSize(set.layers.base)).toEqual({ w: 200, h: 180 })
    expect(pngSize(set.layers.roof)).toEqual({ w: 200, h: 180 })
    for (const [name, src] of Object.entries(set.options)) {
      const socket = name.startsWith('window-') ? 'window-left' : name.split('-')[0]
      const box = HOUSE_SOCKETS[template][socket]
      expect([name, pngSize(src)]).toEqual([name, { w: box.w, h: box.h }])
    }
    expect(Object.keys(set.options)).toContain('chimney-default')
  })

  test.each(templates)('%s: both windows are the same size, and every overlay spot is on the house', (template) => {
    const box = HOUSE_SOCKETS[template]
    expect({ w: box['window-right'].w, h: box['window-right'].h }).toEqual({ w: box['window-left'].w, h: box['window-left'].h })
    for (const spot of Object.values(houseExtrasAt(template))) {
      expect(spot.x).toBeGreaterThanOrEqual(0); expect(spot.x).toBeLessThan(200)
      expect(spot.y).toBeGreaterThanOrEqual(0); expect(spot.y).toBeLessThan(180)
    }
  })
})

describe('which houses use layers', () => {
  test('only templates named in the flag switch', () => {
    expect(houseLayerSet('cabin_v1', undefined)).toBeNull()
    expect(houseLayerSet('cabin_v1', 'loft_v1')).toBeNull()
    expect(houseLayerSet('cabin_v1', 'cabin_v1,loft_v1')).toBe(HOUSE_LAYER_SETS.cabin_v1)
    expect(houseLayerSet('nope_v1', 'nope_v1')).toBeNull()
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

  test('the default chimney is its own sprite, so "none" can leave it out', () => {
    const set = HOUSE_LAYER_SETS.loft_v1
    const chimneys = (c: Record<string, unknown>) => houseOptionSprites('loft_v1', set, c).filter((s) => s.name.startsWith('chimney')).map((s) => s.name)
    expect(chimneys({})).toEqual(['chimney-default'])
    expect(chimneys({ chimneyStyle: 'default' })).toEqual(['chimney-default'])
    expect(chimneys({ chimneyStyle: 'brick' })).toEqual(['chimney-brick'])
    expect(chimneys({ chimneyStyle: 'none' })).toEqual([])
  })
})

describe('spriteDrawable: homes keep HouseSVG when the art can\'t show their choices', () => {
  const cabin = HOUSE_LAYER_SETS.cabin_v1

  test('plain homes and every drawn option are drawable', () => {
    expect(spriteDrawable(cabin, undefined)).toBe(true)
    expect(spriteDrawable(cabin, { doorStyle: 'cottage', windowStyle: 'bay', chimneyStyle: 'none', roofTrim: 'default', windowTreatments: 'none' })).toBe(true)
    // the sign, number, mat and lights are laid over the sprites
    expect(spriteDrawable(cabin, { houseBoardText: 'Hello', houseNumber: '7', welcomeMat: 'floral', exteriorLights: 'lantern' })).toBe(true)
  })

  test('custom colours, roof trims and window treatments are not', () => {
    expect(spriteDrawable(cabin, { wallColor: '#123456' })).toBe(false)
    expect(spriteDrawable(cabin, { roofTrim: 'scalloped' })).toBe(false)
    expect(spriteDrawable(cabin, { windowTreatments: 'shutters' })).toBe(false)
  })

  test('a choice with no drawing is not, unless it looks like the default', () => {
    expect(spriteDrawable(PLACEHOLDER_LAYER_SETS.cabin_v1, { doorStyle: 'arched' })).toBe(false)
    expect(spriteDrawable(PLACEHOLDER_LAYER_SETS.cabin_v1, { chimneyStyle: 'none' })).toBe(false)
    expect(spriteDrawable(HOUSE_LAYER_SETS.townhouse_v1, { doorStyle: 'double' })).toBe(true)
  })
})

describe('overlays and the door', () => {
  test('the cabin\'s sign, number, mat and lights land where HouseSVG draws them', () => {
    expect(houseExtrasAt('cabin_v1')).toEqual({
      sign: { x: 100, y: 90 },
      number: { x: 160, y: 105 },
      mat: { x: 100, y: 155 },
      lights: { x: 90, y: 120 },
    })
  })

  test('the door link follows the drawn door', () => {
    expect(spriteDoorRect('townhouse_v1')).toEqual({ x: 90, y: 125, width: 20, height: 35 })
    expect(spriteDoorRect('cabin_v1')).toEqual({ x: 90, y: 120, width: 20, height: 30 })
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
