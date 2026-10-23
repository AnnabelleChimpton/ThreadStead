/**
 * Ring badges as PNGs (the art is lib/rings/badge-art.ts): the 88×31 and its
 * 352×124 "HD", which is the same pixels at exactly 4×. Also the badge a
 * ring strip or link preview shows when the ring has no image of its own:
 * the default badge, so it looks like any new ring's. Server-only.
 */
import sharp from 'sharp'
import { z } from 'zod'
import {
  BADGE_GLYPH_IDS,
  BADGE_HEIGHT,
  BADGE_TEMPLATE_IDS,
  BADGE_WIDTH,
  badgeChoiceFor,
  badgeDesignFor,
  badgeRgba,
  drawBadge,
  type BadgeDesign,
} from '@/lib/rings/badge-art'
import { ringBadgePalette } from '@/lib/rings/theme'
import { drawnBadgeChoice, uploadBadgeImage } from '@/lib/badge-uploader'

const HD_SCALE = 4

/** A badge as a request sends it. No palette: that's the ring's theme colour. Empty words say the ring's name. */
export const badgeChoiceSchema = z.object({
  template: z.enum(BADGE_TEMPLATE_IDS),
  glyph: z.enum(BADGE_GLYPH_IDS).nullable().optional(),
  text: z.string().trim().max(100).optional(),
})

/** The 88×31 and the 4× HD, from one drawing. */
export async function ringBadgePngs(design: BadgeDesign, slug: string): Promise<{ png: Buffer; hd: Buffer }> {
  const image = sharp(Buffer.from(badgeRgba(drawBadge(design, slug))), {
    raw: { width: BADGE_WIDTH, height: BADGE_HEIGHT, channels: 4 },
  })
  const [png, hd] = await Promise.all([
    image.clone().png().toBuffer(),
    image
      .clone()
      .resize(BADGE_WIDTH * HD_SCALE, BADGE_HEIGHT * HD_SCALE, { kernel: 'nearest' })
      .png()
      .toBuffer(),
  ])
  return { png, hd }
}

interface RingForBadge {
  slug: string
  name: string
  themeColor?: string | null
}

/** Draw a ring's badge from these choices, in its theme colour's palette, and upload it. */
export async function drawAndUploadRingBadge(ring: RingForBadge, choice: z.infer<typeof badgeChoiceSchema>) {
  const saved = badgeChoiceFor({ ...choice, glyph: choice.glyph ?? null })
  const design = badgeDesignFor(saved, ring.name, ringBadgePalette(ring.themeColor, ring.slug))
  return uploadBadgeImage(await ringBadgePngs(design, ring.slug), ring.slug, saved)
}

/**
 * After a ring's theme colour changes: its badge again in the new palette,
 * when it's one we drew. null for an uploaded image or no badge, which stay.
 */
export async function redrawRingBadge(ring: RingForBadge & { badgeImageUrl?: string | null }) {
  const choice = drawnBadgeChoice(ring.badgeImageUrl)
  return choice ? drawAndUploadRingBadge(ring, choice) : null
}

const drawn = new Map<string, Buffer>()

/** The default badge for a ring with no image of its own. */
export async function ringBadgePng(name: string, slug: string, themeColor?: string | null): Promise<Buffer> {
  const palette = ringBadgePalette(themeColor, slug)
  const key = `${slug}|${palette}|${name}`
  const hit = drawn.get(key)
  if (hit) return hit
  const { png } = await ringBadgePngs(badgeDesignFor({}, name, palette), slug)
  if (drawn.size > 500) drawn.clear()
  drawn.set(key, png)
  return png
}
