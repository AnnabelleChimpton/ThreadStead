import {
  layoutFields,
  layoutOf,
  pageCSS,
  siteStylesCSSMode,
  siteStylesOn,
} from '@/lib/domain/profile/layout'

const ADMIN = '.ts-profile-header { color: teal; }'
const OWN = 'body { background: plum; }'

describe('layoutOf', () => {
  test("'default' and 'enhanced' are both the standard layout", () => {
    expect(layoutOf('default')).toBe('standard')
    expect(layoutOf('enhanced')).toBe('standard')
  })

  test("'advanced' is your own HTML", () => {
    expect(layoutOf('advanced')).toBe('html')
  })

  test('missing or unknown is standard', () => {
    expect(layoutOf(null)).toBe('standard')
    expect(layoutOf(undefined)).toBe('standard')
    expect(layoutOf('nonsense')).toBe('standard')
  })
})

describe('siteStylesOn', () => {
  test("'inherit' and 'override' are on, 'disable' is off", () => {
    expect(siteStylesOn('inherit')).toBe(true)
    expect(siteStylesOn('override')).toBe(true)
    expect(siteStylesOn('disable')).toBe(false)
  })

  test('missing is on', () => {
    expect(siteStylesOn(null)).toBe(true)
    expect(siteStylesOn(undefined)).toBe(true)
  })

  test('a stored mode reads back as one of the two written values', () => {
    expect(siteStylesCSSMode('override')).toBe('inherit')
    expect(siteStylesCSSMode('inherit')).toBe('inherit')
    expect(siteStylesCSSMode('disable')).toBe('disable')
    expect(siteStylesCSSMode(undefined)).toBe('inherit')
  })
})

describe('pageCSS', () => {
  test.each(['default', 'enhanced', 'advanced', null])('%s: your own CSS when you have some', (templateMode) => {
    expect(pageCSS({ templateMode, customCSS: OWN }, ADMIN)).toBe(OWN)
  })

  test.each(['default', 'enhanced', 'advanced', null])('%s: the admin default when you have none', (templateMode) => {
    expect(pageCSS({ templateMode, customCSS: '' }, ADMIN)).toBe(ADMIN)
    expect(pageCSS({ templateMode, customCSS: '  \n ' }, ADMIN)).toBe(ADMIN)
    expect(pageCSS({ templateMode, customCSS: null }, ADMIN)).toBe(ADMIN)
  })

  test("a 'default' page with saved CSS now sends that CSS, not the admin default", () => {
    expect(pageCSS({ templateMode: 'default', customCSS: OWN }, ADMIN)).toBe(OWN)
  })

  test('no CSS anywhere sends none', () => {
    expect(pageCSS({ templateMode: 'enhanced', customCSS: '' }, '')).toBeUndefined()
    expect(pageCSS({ templateMode: 'enhanced' }, '   ')).toBeUndefined()
    expect(pageCSS(undefined, undefined)).toBeUndefined()
  })

  test('your CSS goes out exactly as saved', () => {
    const spaced = '\n  body { color: red; }\n'
    expect(pageCSS({ templateMode: 'enhanced', customCSS: spaced }, ADMIN)).toBe(spaced)
  })
})

describe('layoutFields', () => {
  test('standard writes enhanced, html writes advanced', () => {
    expect(layoutFields({ layout: 'standard' })).toEqual({ templateMode: 'enhanced' })
    expect(layoutFields({ layout: 'html' })).toEqual({ templateMode: 'advanced' })
  })

  test('site styles on writes inherit, off writes disable', () => {
    expect(layoutFields({ siteStyles: true })).toEqual({ cssMode: 'inherit' })
    expect(layoutFields({ siteStyles: false })).toEqual({ cssMode: 'disable' })
  })

  test('both at once, or nothing', () => {
    expect(layoutFields({ layout: 'html', siteStyles: false })).toEqual({ templateMode: 'advanced', cssMode: 'disable' })
    expect(layoutFields({})).toEqual({})
  })

  test('what it writes reads back as the same choice', () => {
    for (const layout of ['standard', 'html'] as const) {
      for (const siteStyles of [true, false]) {
        const fields = layoutFields({ layout, siteStyles })
        expect(layoutOf(fields.templateMode)).toBe(layout)
        expect(siteStylesOn(fields.cssMode)).toBe(siteStyles)
      }
    }
  })
})
