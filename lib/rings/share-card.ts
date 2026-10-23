/**
 * A ring's link-preview image: its own 88×31 badge, scaled up by a whole
 * number with nearest-neighbour so every pixel stays a crisp square, in the
 * middle of a 1200×630 card of badge paper. What Bluesky, Mastodon and the
 * rest show when someone pastes a /tr/<slug> link. Server-only.
 *
 * The badge is the ring's uploaded image when it's one of ours (on our CDN),
 * else the default one drawn by lib/rings/badge.ts. Nothing else is fetched.
 */
import sharp from 'sharp'
import { keyFromPublicUrl } from '@/lib/storage/r2'
import { ringBadgePng } from '@/lib/rings/badge'
import { SHARE_CARD } from '@/lib/share-images'

export const CARD_WIDTH = SHARE_CARD.width
export const CARD_HEIGHT = SHARE_CARD.height
const PAPER = '#f6efdc'
// The badge may fill this much of the card; the rest is paper
const MAX_BADGE_WIDTH = 960
const MAX_BADGE_HEIGHT = 420
const FETCH_TIMEOUT_MS = 2000
const MAX_BADGE_BYTES = 2 * 1024 * 1024

/** The largest whole-number scale that fits; never below 1 (a big image is shrunk to fit instead). */
export function badgeScale(width: number, height: number): number {
  return Math.max(1, Math.floor(Math.min(MAX_BADGE_WIDTH / width, MAX_BADGE_HEIGHT / height)))
}

export async function renderRingShareCard(badge: Buffer): Promise<Buffer> {
  // First frame of an animated badge
  const source = sharp(badge, { pages: 1 })
  const { width = 88, height = 31 } = await source.metadata()
  const scale = badgeScale(width, height)
  let w = width * scale
  let h = height * scale
  if (w > MAX_BADGE_WIDTH || h > MAX_BADGE_HEIGHT) {
    const fit = Math.min(MAX_BADGE_WIDTH / w, MAX_BADGE_HEIGHT / h)
    w = Math.round(w * fit)
    h = Math.round(h * fit)
  }
  const scaled = await source.resize(w, h, { kernel: 'nearest', fit: 'fill' }).png().toBuffer()
  return sharp({
    create: { width: CARD_WIDTH, height: CARD_HEIGHT, channels: 4, background: PAPER },
  })
    .composite([{ input: scaled, left: Math.round((CARD_WIDTH - w) / 2), top: Math.round((CARD_HEIGHT - h) / 2) }])
    .png()
    .toBuffer()
}

/** The ring's uploaded badge when it's on our CDN; null for anything else, or on any failure. */
async function ownBadge(url: string | null): Promise<Buffer | null> {
  if (!url || keyFromPublicUrl(url) === null) return null
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), redirect: 'error' })
    if (!res.ok) return null
    const bytes = Buffer.from(await res.arrayBuffer())
    return bytes.length > 0 && bytes.length <= MAX_BADGE_BYTES ? bytes : null
  } catch {
    return null
  }
}

const cards = new Map<string, Buffer>()

/** The card for a ring, drawn once per badge (a new upload is a new URL). */
export async function ringShareCard(name: string, slug: string, badgeImageUrl: string | null, themeColor?: string | null): Promise<Buffer> {
  const key = `${badgeImageUrl ?? ''}|${slug}|${themeColor ?? ''}|${name}`
  const hit = cards.get(key)
  if (hit) return hit
  const badge = (await ownBadge(badgeImageUrl)) ?? (await ringBadgePng(name, slug, themeColor))
  let card: Buffer
  try {
    card = await renderRingShareCard(badge)
  } catch {
    // An upload sharp can't read: the drawn badge instead
    card = await renderRingShareCard(await ringBadgePng(name, slug, themeColor))
  }
  if (cards.size > 200) cards.clear()
  cards.set(key, card)
  return card
}
