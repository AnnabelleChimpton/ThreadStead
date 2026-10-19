jest.mock('@/lib/config/database/connection', () => ({ db: {} }))

import { BADGE_NAME_CHARS, badgeColors, badgeText, houseBadgeSvg } from '../house-badge'

describe('badgeText', () => {
  it('upper-cases, drops accents and characters the font lacks', () => {
    expect(badgeText('Zoë & <script>')).toBe('ZOE & SCRIPT')
    expect(badgeText('🌷 Juniper 🌷')).toBe('JUNIPER')
  })

  it('stops at a whole word when the name is too long', () => {
    expect(badgeText('Edit Safety Test')).toBe('EDIT SAFETY')
    expect(badgeText('supercalifragilistic')).toHaveLength(BADGE_NAME_CHARS)
  })
})

describe('houseBadgeSvg', () => {
  const svg = (name = 'Juniper', extra: Record<string, unknown> = {}) =>
    houseBadgeSvg({ template: 'cabin_v1', palette: 'thread_sage', name, number: 19, ...extra })

  it('is an 88×31 drawing of whole-pixel rects, crisp at any whole scale', () => {
    const out = svg()
    expect(out).toMatch(/^<svg [^>]*width="88" height="31" viewBox="0 0 88 31" shape-rendering="crispEdges">/)
    const rects = [...out.matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"/g)]
    expect(rects.length).toBeGreaterThan(20)
    for (const [, x, y, w, h] of rects) {
      expect(Number(x) + Number(w)).toBeLessThanOrEqual(88)
      expect(Number(y) + Number(h)).toBeLessThanOrEqual(31)
    }
  })

  it('never puts the name in as text: the only text is an escaped title', () => {
    const out = svg('<img src=x onerror=alert(1)>"&')
    expect(out).not.toContain('<img')
    expect(out).not.toContain('onerror=alert(1)>"')
    expect(out).toContain('<title>&lt;img src=x onerror=alert(1)&gt;&quot;&amp;&apos;s house, number 19</title>')
    expect(out.replace(/<title>.*<\/title>/, '')).not.toMatch(/[^<>"=/\w\s#.:-]/)
  })

  it('uses the house’s own colours, and ignores colours that are not hex', () => {
    expect(badgeColors('thread_sage', { roofColor: '#123456', wallColor: 'red;background:url(x)' })).toMatchObject({
      roof: '#123456',
      wall: '#F5E9D4',
    })
    expect(svg('A', { customizations: { roofColor: '#123456' } })).toContain('fill="#123456"')
  })

  it('draws every template, and leaves the number off when there is none', () => {
    for (const template of ['cabin_v1', 'cottage_v1', 'townhouse_v1', 'loft_v1']) {
      expect(svg('A', { template })).toContain('<rect')
    }
    expect(svg('A', { number: null })).toContain("<title>A&apos;s house</title>")
  })
})
