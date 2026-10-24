/**
 * @jest-environment node
 *
 * Ring badges drawn for real (lib/rings/badge-art.ts, sharp in
 * lib/rings/badge.ts): the sizes, the HD being exactly the 88×31's pixels at
 * 4×, names that fit without being cut mid-word, the palettes the ring
 * themes take their colours from, and a drawn badge's choices surviving in
 * its file name so a new colour can redraw it.
 */
import crypto from 'crypto'
import sharp from 'sharp'

jest.mock('@/lib/storage/r2', () => ({
  putObject: jest.fn(async ({ key }: { key: string }) => `https://cdn.test/${key}`),
  keyFromPublicUrl: (url: string) => (url.startsWith('https://cdn.test/') ? url.slice('https://cdn.test/'.length) : null),
}))
import {
  BADGE_PALETTES,
  BADGE_TEMPLATE_IDS,
  autoPalette,
  badgeChoiceFor,
  badgeDesignFor,
  badgeRgba,
  drawBadge,
  fitName,
  type BadgeChoice,
  type BadgeDesign,
} from '@/lib/rings/badge-art'
import { drawAndUploadRingBadge, redrawRingBadge, ringBadgePng, ringBadgePngs } from '@/lib/rings/badge'
import { drawnBadgeChoice } from '@/lib/badge-uploader'
import { putObject } from '@/lib/storage/r2'
import { RING_THEMES, ringBadgePalette } from '@/lib/rings/theme'

const raw = (png: Buffer) => sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const design = (over: Partial<BadgeChoice> = {}): BadgeDesign => badgeDesignFor(over, 'Dungeons & Dragons', 'rose')

describe('the PNGs', () => {
  it('are 88×31 and 352×124, and the HD is the same pixels at exactly 4×', async () => {
    for (const template of BADGE_TEMPLATE_IDS) {
      const { png, hd } = await ringBadgePngs(design({ template }), 'dnd')
      const small = await raw(png)
      const big = await raw(hd)
      expect([small.info.width, small.info.height]).toEqual([88, 31])
      expect([big.info.width, big.info.height]).toEqual([352, 124])
      for (let y = 0; y < 124; y++) {
        for (let x = 0; x < 352; x++) {
          const a = ((y >> 2) * 88 + (x >> 2)) * 4
          const b = (y * 352 + x) * 4
          if (big.data.readUInt32BE(b) !== small.data.readUInt32BE(a)) {
            throw new Error(`${template}: HD pixel ${x},${y} isn't the 88×31's ${x >> 2},${y >> 2}`)
          }
        }
      }
    }
  })

  it('draws exactly what the browser preview draws', async () => {
    const { png } = await ringBadgePngs(design({ template: 'stamp', glyph: 'cat' }), 'dnd')
    expect(Buffer.from((await raw(png)).data).equals(Buffer.from(badgeRgba(drawBadge(design({ template: 'stamp', glyph: 'cat' }), 'dnd'))))).toBe(true)
  })

  it('keeps the stamp edge see-through', async () => {
    const { data } = await raw((await ringBadgePngs(design({ template: 'stamp' }), 'dnd')).png)
    expect(data[3]).toBe(0)
  })

  it("keeps Label's colour without a picture, as a strip", () => {
    const rgba = badgeRgba(drawBadge({ template: 'label', palette: 'rose', glyph: null, text: 'Cozy Knits' }, 'cozy-knits'))
    const hex = (x: number, y: number) =>
      '#' + Array.from(rgba.slice((y * 88 + x) * 4, (y * 88 + x) * 4 + 3), (v) => v.toString(16).padStart(2, '0')).join('')
    expect(hex(3, 15)).toBe(BADGE_PALETTES.rose.field)
    expect(hex(10, 15)).not.toBe(BADGE_PALETTES.rose.field)
  })

  it('draws the approved drafts, pixel for pixel', () => {
    // Checked against design/threadring-audit/badges/drafts when ported
    const hashes = Object.fromEntries(
      ([['label', 'pine', 'rings'], ['patch', 'rose', null], ['screen', 'sky', null], ['stamp', 'butter', 'cat']] as const).map(
        ([template, palette, glyph]) => [
          template,
          crypto.createHash('sha1').update(badgeRgba(drawBadge({ template, palette, glyph, text: 'Dungeons & Dragons' }, 'dnd'))).digest('hex'),
        ]
      )
    )
    expect(hashes).toEqual({
      label: 'ab640fc844bbf4533006b2203789060824c33e38',
      patch: '86ed786606104cd86e73b16fde5ef254b3806e56',
      screen: '1642a3dcc5131f1421a4f0b96898a9abc452dd18',
      stamp: '3a048f044b84b1a4109bc1ca06d6e307d52db313',
    })
  })
})

describe('fitting a name', () => {
  // The Label's text box beside its tab
  const fit = (name: string, slug = 'ring') => fitName(name, slug, 67, 23).lines

  it('breaks long names at spaces, then inside camelCase and dotted words', () => {
    expect(fit('Dungeons & Dragons')).toEqual(['Dungeons', '& Dragons'])
    expect(fit('MagicTheGathering')).toEqual(['MagicThe', 'Gathering'])
    expect(fit('contactjuggling.org')).toEqual(['contactjuggling', '.org'])
  })

  it('drops whole trailing words rather than cutting one', () => {
    expect(fit('Pixel Embroiderers Society of Greater Manchester')).toEqual(['Pixel', 'Embroiderers', 'Society of Greater'])
  })

  it('keeps lowercase accents and leaves emoji and other scripts out', () => {
    expect(fit('Señor Piñata Fans')).toEqual(['Señor', 'Piñata Fans'])
    expect(fit('Café Lofi ☕')).toEqual(['Café Lofi'])
    expect(fit('手芸 Crafts')).toEqual(['Crafts'])
    expect(fit('“Quoted” name')).toEqual(['Quoted name'])
  })

  it("says the slug when nothing in the name can be drawn", () => {
    expect(fit('ねこ部', 'neko-club')).toEqual(['neko club'])
    expect(fit('🎉🎉', 'party')).toEqual(['party'])
  })

  it('breaks one very long word where it must, and nothing reaches past the box', () => {
    expect(fit('Supercalifragilisticexpialidociousness').join('')).toBe('Supercalifragilisticexpialidociousness')
    for (const name of [
      'Supercalifragilisticexpialidociousness',
      'Société des Amis (Paris) de la Bibliothèque Nationale Française',
      'Pneumonoultramicroscopicsilicovolcanoconiosis and friends',
      'ÀÉÎÕÜ çédille (1999) #42 / 50% + more!',
    ]) {
      for (const template of BADGE_TEMPLATE_IDS) {
        expect(() => drawBadge(design({ template, text: name }), 'ring')).not.toThrow()
      }
      const { font, lines } = fitName(name, 'ring', 67, 23)
      expect(lines.length).toBeLessThanOrEqual(3)
      for (const line of lines) expect(font.width(line)).toBeLessThanOrEqual(67)
    }
  })
})

describe('palettes', () => {
  it('are the ring theme colours, all but butter', () => {
    expect(RING_THEMES.map((t) => [t.id, t.hex])).toEqual([
      ['pine', '#2e4b3f'],
      ['moss', '#49722e'],
      ['sky', '#3f5f7a'],
      ['lavender', '#5a4fb3'],
      ['rose', '#8c4a5b'],
      ['brick', '#c4473a'],
      ['wood', '#834a27'],
    ])
    for (const theme of RING_THEMES) expect(theme.hex).toBe(BADGE_PALETTES[theme.id].field)
  })

  it("follow the ring's theme colour, and the slug when it has none", () => {
    expect(ringBadgePalette('#5A4FB3', 'writing-club')).toBe('lavender')
    expect(ringBadgePalette('thread-berry', 'writing-club')).toBe('rose')
    for (const none of [null, undefined, '', '#123456', 'red']) expect(ringBadgePalette(none, 'writing')).toBe(autoPalette('writing'))
  })

  it('pick a steady auto palette per slug, always one a page can use', () => {
    const slugs = ['writing', 'video-games', 'ttrpgs', 'homepageagain', 'cozy-knits', 'ねこ', ...Array.from({ length: 50 }, (_, i) => `ring-${i}`)]
    for (const slug of slugs) {
      expect(autoPalette(slug)).toBe(autoPalette(slug))
      // It's the ring page's accent too (ringAccentHex), so never butter
      expect(BADGE_PALETTES[autoPalette(slug)].theme).toBe(true)
    }
    expect(new Set(slugs.map(autoPalette)).size).toBeGreaterThan(3)
  })
})

describe('the default badge', () => {
  it("is Label with linked rings, saying the ring's name", () => {
    expect(badgeChoiceFor({})).toEqual({ template: 'label', glyph: 'rings', text: '' })
    expect(badgeDesignFor({}, 'Knits', 'moss')).toEqual({ template: 'label', palette: 'moss', glyph: 'rings', text: 'Knits' })
    expect(badgeDesignFor({ glyph: null, text: '  ' }, 'Knits', 'moss')).toMatchObject({ glyph: null, text: 'Knits' })
  })

  it('is what a ring with no image of its own shows, in its colour', async () => {
    const { png } = await ringBadgePngs(badgeDesignFor({}, 'Cozy Knits', 'sky'), 'cozy-knits')
    expect((await ringBadgePng('Cozy Knits', 'cozy-knits', '#3f5f7a')).equals(png)).toBe(true)
  })
})

describe('a drawn badge on R2', () => {
  const ring = { slug: 'knits', name: 'Knits', themeColor: '#49722e' }

  it('keeps its choices in its file name, words and all', async () => {
    const urls = await drawAndUploadRingBadge(ring, { template: 'screen', glyph: null, text: 'Ça va? 手芸 & co.' })
    expect(urls.badgeImageHighResUrl).toMatch(/-hd\.png$/)
    expect(drawnBadgeChoice(urls.badgeImageUrl)).toEqual({ template: 'screen', glyph: null, text: 'Ça va? 手芸 & co.' })
    // No words: the ring's name, whatever it's called when it's redrawn. No picture: none
    expect(drawnBadgeChoice((await drawAndUploadRingBadge(ring, { template: 'label' })).badgeImageUrl)).toEqual({
      template: 'label',
      glyph: null,
      text: '',
    })
  })

  it("isn't an upload, someone else's image or an old badge", () => {
    for (const url of [null, 'https://cdn.test/media/u1/badge.png', 'https://example.com/badges/knits-1-abcdef12.label.rings..png', 'https://cdn.test/badges/knits-1700000000000-abcdef12.png']) {
      expect(drawnBadgeChoice(url)).toBeNull()
    }
  })

  it('is redrawn in a new colour with the same choices; an upload is left alone', async () => {
    const { badgeImageUrl } = await drawAndUploadRingBadge(ring, { template: 'patch', glyph: 'cat' })
    ;(putObject as jest.Mock).mockClear()
    const redrawn = await redrawRingBadge({ ...ring, themeColor: '#c4473a', badgeImageUrl })
    expect(drawnBadgeChoice(redrawn!.badgeImageUrl)).toEqual({ template: 'patch', glyph: 'cat', text: '' })
    const png: Buffer = (putObject as jest.Mock).mock.calls.find(([o]) => !o.key.endsWith('-hd.png'))[0].body
    // Patch's field, just inside its edge, in brick
    const { data } = await raw(png)
    expect(Array.from(data.subarray((3 * 88 + 3) * 4, (3 * 88 + 3) * 4 + 3))).toEqual([0xc4, 0x47, 0x3a])
    expect(await redrawRingBadge({ ...ring, badgeImageUrl: 'https://cdn.test/media/u1/badge.png' })).toBeNull()
  })
})
