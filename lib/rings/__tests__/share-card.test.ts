/**
 * @jest-environment node
 *
 * A ring's link-preview card drawn for real (sharp, no mocks): its size,
 * the badge scaled by a whole number so its pixels stay crisp squares, and
 * that a badge URL that isn't ours is never fetched.
 */
import sharp from 'sharp'
import { CARD_HEIGHT, CARD_WIDTH, badgeScale, renderRingShareCard, ringShareCard } from '@/lib/rings/share-card'
import { ringBadgePng } from '@/lib/rings/badge'

async function pixel(png: Buffer, x: number, y: number): Promise<number[]> {
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true })
  const i = (y * info.width + x) * info.channels
  return Array.from(data.subarray(i, i + 3))
}

describe('badgeScale', () => {
  it('scales an 88×31 badge by the largest whole number that fits', () => {
    expect(badgeScale(88, 31)).toBe(10)
  })

  it('never goes below 1', () => {
    expect(badgeScale(2000, 900)).toBe(1)
  })
})

describe('renderRingShareCard', () => {
  it('is a 1200×630 card with the badge 10× in the middle, every badge pixel a 10×10 square', async () => {
    const card = await renderRingShareCard(await ringBadgePng('Cozy Knits'))
    const meta = await sharp(card).metadata()
    expect([meta.width, meta.height]).toEqual([CARD_WIDTH, CARD_HEIGHT])

    // 880×310 badge, centred: it starts at (160, 160)
    const left = (CARD_WIDTH - 880) / 2
    const top = (CARD_HEIGHT - 310) / 2
    // Paper outside the badge
    expect(await pixel(card, 10, 10)).toEqual([0xf6, 0xef, 0xdc])
    // The badge's 1px frame is 10 card pixels wide, all one colour
    const frame = await pixel(card, left, top)
    for (const [dx, dy] of [[9, 0], [0, 9], [9, 9]]) {
      expect(await pixel(card, left + dx, top + dy)).toEqual(frame)
    }
    // ...and the next badge pixel in is the paper inside the frame, not a blend
    expect(await pixel(card, left + 10, top + 10)).toEqual([0xf6, 0xef, 0xdc])
  })
})

describe('ringShareCard', () => {
  const realFetch = global.fetch
  afterEach(() => {
    global.fetch = realFetch
  })

  it('draws the badge from the name when the uploaded one is not on our CDN, without fetching it', async () => {
    const fetchSpy = jest.fn()
    global.fetch = fetchSpy as unknown as typeof fetch
    const card = await ringShareCard('Elsewhere Ring', 'https://example.com/badge.png')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(card).toEqual(await renderRingShareCard(await ringBadgePng('Elsewhere Ring')))
  })
})
