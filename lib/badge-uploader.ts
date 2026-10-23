/**
 * Puts a drawn ring badge (lib/rings/badge.ts) on R2 for Ring Hub: the 88×31
 * and its 4× HD, both lossless. Images owners upload themselves go through
 * /api/media/upload instead.
 *
 * The file name carries the Host's choices (template, glyph, words), since
 * the hub keeps only the image's address: that's how the designer reopens
 * on them, and how a new theme colour redraws the badge in its palette.
 */

import crypto from "crypto";
import { keyFromPublicUrl, putObject } from "@/lib/storage/r2";
import { BADGE_GLYPH_IDS, BADGE_TEMPLATE_IDS, type BadgeChoice } from "@/lib/rings/badge-art";

interface BadgeUploadResult {
  badgeImageUrl: string;
  badgeImageHighResUrl: string;
}

const DRAWN_KEY = /^badges\/[a-z0-9-]+-\d+-[0-9a-f]{8}\.([a-z]+)\.([a-z]+)\.([A-Za-z0-9_-]*)\.png$/;

/** `text` is "" when the badge says the ring's name, so a redraw says the name it has then. */
export async function uploadBadgeImage(
  images: { png: Buffer; hd: Buffer },
  ringSlug: string,
  choice: BadgeChoice
): Promise<BadgeUploadResult> {
  // A new key per badge, so caches and old credentials keep the old one
  const hash = crypto.createHash('md5').update(images.png).digest('hex').substring(0, 8);
  const words = Buffer.from(choice.text).toString('base64url');
  const base = `badges/${ringSlug}-${Date.now()}-${hash}.${choice.template}.${choice.glyph ?? 'none'}.${words}`;
  const [badgeImageUrl, badgeImageHighResUrl] = await Promise.all([
    putObject({ key: `${base}.png`, body: images.png, contentType: 'image/png' }),
    putObject({ key: `${base}-hd.png`, body: images.hd, contentType: 'image/png' }),
  ]);
  return { badgeImageUrl, badgeImageHighResUrl };
}

/** The choices a badge we drew was made from; null for an upload, someone else's image, or an old badge. */
export function drawnBadgeChoice(url: string | null | undefined): BadgeChoice | null {
  const match = url ? DRAWN_KEY.exec(keyFromPublicUrl(url) ?? '') : null;
  if (!match) return null;
  const [, template, glyph, words] = match;
  const templateId = BADGE_TEMPLATE_IDS.find((t) => t === template);
  const glyphId = glyph === 'none' ? null : BADGE_GLYPH_IDS.find((g) => g === glyph);
  if (!templateId || glyphId === undefined) return null;
  return { template: templateId, glyph: glyphId, text: Buffer.from(words, 'base64url').toString('utf8') };
}
