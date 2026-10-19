/**
 * @jest-environment node
 */
import fs from 'fs'
import path from 'path'
import { PALETTE_COLOURS, PALETTE_RAMPS, isPaletteColour } from '../palette'
import { nameFromItemId, parseSpriteFilename } from '../sprite-filename'
import { checkSprite, type SpriteInspectionLike } from '../sprite-checks'

describe('palette', () => {
  test('matches design/pixel-art/threadstead-44.gpl, colour for colour and in order', () => {
    const gpl = fs.readFileSync(path.join(process.cwd(), 'design/pixel-art/threadstead-44.gpl'), 'utf8')
    const fromFile = gpl
      .split('\n')
      .map((line) => /^\s*(\d+)\s+(\d+)\s+(\d+)\s/.exec(line))
      .filter((m): m is RegExpExecArray => !!m)
      .map((m) => '#' + m.slice(1, 4).map((n) => Number(n).toString(16).padStart(2, '0')).join(''))
    expect(fromFile).toEqual(PALETTE_COLOURS)
    expect(PALETTE_COLOURS).toHaveLength(44)
    expect(Object.keys(PALETTE_RAMPS)).toHaveLength(11)
  })

  test('isPaletteColour ignores case', () => {
    expect(isPaletteColour('#2E4B3F')).toBe(true)
    expect(isPaletteColour('#2563eb')).toBe(false)
  })
})

describe('parseSpriteFilename', () => {
  const ok = (name: string) => {
    const r = parseSpriteFilename(name)
    if (!r.ok) throw new Error(r.error)
    return r.value
  }

  test('type, item and category come from the name', () => {
    expect(ok('plant_roses_red.png')).toEqual({ kind: 'decoration', itemId: 'roses_red', type: 'plant', category: 'plants', frames: 1 })
    expect(ok('structure_gazebo.png')).toMatchObject({ itemId: 'gazebo', category: 'structures' })
    expect(ok('furniture_mailbox.png')).toMatchObject({ itemId: 'mailbox', category: 'furniture' })
  })

  test('@Nf is a frame count', () => {
    expect(ok('water_fountain@4f.png')).toMatchObject({ itemId: 'fountain', type: 'water', frames: 4 })
  })

  test('seasonal items keep their year and sit in features', () => {
    expect(ok('seasonal_pumpkin_2026.png')).toMatchObject({ itemId: 'pumpkin_2026', type: 'seasonal', category: 'features' })
  })

  test('house layers and options', () => {
    expect(ok('house_cabin_roof.png')).toEqual({ kind: 'house', template: 'cabin', layer: 'roof' })
    expect(ok('house_cabin_door-arched.png')).toEqual({ kind: 'house', template: 'cabin', layer: 'door-arched' })
  })

  test('a folder path is ignored', () => {
    expect(ok('design/pixel-art/export/plant_lavender.png')).toMatchObject({ itemId: 'lavender' })
  })

  test('says what is wrong in plain words', () => {
    expect(parseSpriteFilename('roses_red.png')).toEqual({
      ok: false,
      error: 'The name has to start with a type: plant, path, feature, furniture, lighting, water, structure, seasonal.',
    })
    expect(parseSpriteFilename('plant_Roses.png')).toMatchObject({ ok: false, error: expect.stringMatching(/lowercase/) })
    expect(parseSpriteFilename('plant_roses.gif')).toMatchObject({ ok: false, error: 'Sprites are PNG files.' })
    expect(parseSpriteFilename('water_fountain@0f.png')).toMatchObject({ ok: false, error: expect.stringMatching(/1 to 8 frames/) })
    expect(parseSpriteFilename('plant_.png')).toMatchObject({ ok: false })
  })

  test('nameFromItemId', () => {
    expect(nameFromItemId('roses_red')).toBe('Roses Red')
  })
})

describe('checkSprite', () => {
  const art = (over: Partial<SpriteInspectionLike> = {}): SpriteInspectionLike => ({
    width: 24,
    height: 24,
    colours: new Map([['#2d5016', 40], ['#c4473a', 20]]),
    partialAlpha: 0,
    bottomPadding: 0,
    empty: false,
    ...over,
  })
  const byId = (r: ReturnType<typeof checkSprite>, id: string) => r.checks.find((c) => c.id === id)

  test('a sprite that meets the bible passes everything', () => {
    const r = checkSprite(art())
    expect(r.checks.every((c) => c.status === 'pass')).toBe(true)
    expect(r).toMatchObject({ frameWidth: 24, height: 24, gridWidth: 2, gridHeight: 2, blocked: false, needsOverride: false })
  })

  test('empty rows under the art are trimmed off the stored height', () => {
    const r = checkSprite(art({ bottomPadding: 5 }))
    expect(r).toMatchObject({ trimBottom: 5, height: 19, gridHeight: 2, blocked: false })
    expect(byId(r, 'ground')).toMatchObject({ status: 'warn', message: "5 empty rows under the art. They'll be trimmed so it stands where it's planted." })
  })

  test('off-palette colours need an override, most-used first', () => {
    const r = checkSprite(art({ colours: new Map([['#2563eb', 3], ['#1e40af', 9], ['#2e4b3f', 4]]) }))
    expect(r.needsOverride).toBe(true)
    expect(r.blocked).toBe(false)
    expect(r.offPalette).toEqual([{ hex: '#1e40af', count: 9 }, { hex: '#2563eb', count: 3 }])
    expect(byId(r, 'palette')?.message).toBe('2 colours not in threadstead-44 (12 pixels).')
  })

  test('frames have to split the width evenly', () => {
    expect(checkSprite(art({ width: 96 }), 4)).toMatchObject({ frameWidth: 24, blocked: false })
    const r = checkSprite(art({ width: 50 }), 4)
    expect(r.blocked).toBe(true)
    expect(byId(r, 'frames')?.message).toBe("50 px doesn't split into 4 equal frames.")
  })

  test('partial alpha, oversize and empty pictures block', () => {
    expect(checkSprite(art({ partialAlpha: 2 })).blocked).toBe(true)
    expect(checkSprite(art({ width: 120 })).blocked).toBe(true)
    expect(checkSprite(art({ width: 192 }), 2)).toMatchObject({ frameWidth: 96, blocked: false })
    expect(checkSprite(art({ empty: true, colours: new Map(), bottomPadding: 24 })).blocked).toBe(true)
  })

  test('more than 16 colours is advice, not a block', () => {
    const colours = new Map(Array.from({ length: 17 }, (_, i) => [`#0000${i.toString(16).padStart(2, "0")}`, 1] as [string, number]))
    const r = checkSprite(art({ colours }))
    expect(byId(r, 'colours')?.status).toBe('warn')
    expect(r.blocked).toBe(false)
  })
})
