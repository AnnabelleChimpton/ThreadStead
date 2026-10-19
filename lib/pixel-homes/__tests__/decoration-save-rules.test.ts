/**
 * Lenient on read, strict on write: whatever older code stored must open in
 * the editor and pass the save API's schema when saved again unchanged.
 */
import {
  normalizeDecorationRow,
  normalizeHexColor,
  normalizeHomeConfig,
  normalizePosition,
  normalizeTerrain,
  saveHomeSchema,
  POSITION_MARGIN,
} from '../decoration-save-rules'

describe('normalizeHexColor', () => {
  test.each([
    ['#a1b2c3', '#a1b2c3'],
    ['#A1B2C3', '#A1B2C3'],
    ['000000', '#000000'], // a stored value from prod, missing its #
    [' #71f98c ', '#71f98c'],
    ['#abc', '#aabbcc'],
    ['fff', '#ffffff'],
  ])('%p → %p', (input, output) => {
    expect(normalizeHexColor(input)).toBe(output)
  })

  test.each([['banana'], ['#12'], ['#1234567'], ['rgb(0,0,0)'], [''], [null], [undefined], [42]])(
    '%p → null (the theme colour)',
    (input) => {
      expect(normalizeHexColor(input)).toBeNull()
    }
  )
})

describe('normalizeHomeConfig', () => {
  const legacy = {
    houseTemplate: 'castle_v9',
    palette: 'neon',
    atmosphereSky: 'sunny',
    atmosphereWeather: 'light_rain',
    atmosphereTimeOfDay: 'dusk',
    wallColor: '000000',
    roofColor: '#71f98c',
    trimColor: 'banana',
    windowColor: null,
    detailColor: '',
    doorStyle: 'curtains',
    windowStyle: 'round',
    roofTrim: null,
    welcomeMat: 'simple',
    chimneyStyle: 'brick',
    houseTitle: 'A'.repeat(300),
    houseBoardText: 'hi neighbor',
    houseNumber: '',
    terrain: { '3,8': 'water', '99,1': 'water', '4,8': 'lava', bad: 'grass' },
  }

  test('unknown values fall back to defaults, known ones survive', () => {
    const home = normalizeHomeConfig(legacy)
    expect(home.template).toBe('cottage_v1')
    expect(home.palette).toBe('thread_sage')
    expect(home.atmosphere).toEqual({ sky: 'sunny', weather: 'light_rain', timeOfDay: 'midday' })
    expect(home.houseCustomizations).toMatchObject({
      wallColor: '#000000',
      roofColor: '#71f98c',
      trimColor: null,
      windowColor: null,
      detailColor: null,
      doorStyle: null,
      windowStyle: 'round',
      welcomeMat: null,
      chimneyStyle: 'brick',
      houseBoardText: 'hi neighbor',
      houseNumber: null,
    })
    expect(home.houseCustomizations.houseTitle).toHaveLength(100)
    expect(home.terrain).toEqual({ '3,8': 'water' })
  })

  test('a normalized home passes the save schema unchanged', () => {
    const home = normalizeHomeConfig(legacy)
    const parsed = saveHomeSchema.safeParse({
      decorations: [],
      template: home.template,
      palette: home.palette,
      atmosphere: home.atmosphere,
      houseCustomizations: home.houseCustomizations,
      terrain: home.terrain,
    })
    expect(parsed.success).toBe(true)
  })

  test('a brand-new config with only defaults is fine too', () => {
    const home = normalizeHomeConfig({})
    expect(home.template).toBe('cottage_v1')
    expect(home.terrain).toEqual({})
    expect(saveHomeSchema.safeParse({ decorations: [], ...home }).success).toBe(true)
  })
})

describe('normalizeTerrain', () => {
  test.each([[null], [[]], ['x'], [42]])('%p → {}', (input) => {
    expect(normalizeTerrain(input)).toEqual({})
  })
})

describe('normalizeDecorationRow', () => {
  test('clamps out-of-yard positions and cleans odd fields', () => {
    expect(normalizeDecorationRow({ positionX: 99999, positionY: -5000, layer: 1e12, variant: 'big pink!', size: 'huge', data: 'text' }))
      .toEqual({ position: { x: 512, y: -POSITION_MARGIN, layer: 10_000_000 }, gridX: null, gridY: null, layerBias: 0, variant: 'default', size: 'medium', data: null })
  })

  test('leaves a normal row alone', () => {
    expect(normalizeDecorationRow({ positionX: 64, positionY: 240, layer: 452064, variant: 'default', size: 'large', data: { text: 'HI' } }))
      .toEqual({ position: { x: 64, y: 240, layer: 452064 }, gridX: null, gridY: null, layerBias: 0, variant: 'default', size: 'large', data: { text: 'HI' } })
  })

  test('keeps a stored grid cell only when it matches the stored position', () => {
    expect(normalizeDecorationRow({ positionX: 64, positionY: 240, gridX: 4, gridY: 15, layerBias: 2 })).toMatchObject({ gridX: 4, gridY: 15, layerBias: 2 })
    expect(normalizeDecorationRow({ positionX: 65, positionY: 240, gridX: 4, gridY: 15 })).toMatchObject({ gridX: null, gridY: null })
    expect(normalizeDecorationRow({ positionX: 64, positionY: 240, layerBias: 40 })).toMatchObject({ layerBias: 3 })
  })

  test('a normalized row passes the save schema', () => {
    const row = normalizeDecorationRow({ positionX: 1e9, positionY: NaN, layer: -3, variant: null, size: null, data: [1, 2] })
    const parsed = saveHomeSchema.safeParse({
      decorations: [
        {
          decorationType: 'plant',
          decorationId: 'roses_red',
          zone: 'front_yard',
          positionX: row.position.x,
          positionY: row.position.y,
          layer: row.position.layer,
          variant: row.variant,
          size: row.size,
          data: row.data,
        },
      ],
    })
    expect(parsed.success).toBe(true)
  })

  test('normalizePosition rounds and replaces non-numbers', () => {
    expect(normalizePosition(10.6, 'x')).toEqual({ x: 11, y: 0 })
  })
})
