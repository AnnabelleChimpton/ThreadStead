/**
 * The 88×31 a ring strip shows when the ring has no badge image of its own:
 * the ring's name in the house badges' pixel letters (lib/pixel-homes/
 * house-badge.ts) on cream, as a PNG. No fonts, so it draws the same
 * everywhere.
 */
import sharp from 'sharp'
import { BADGE_HEIGHT, BADGE_WIDTH, FRAME, INK, badgeText, textPixels, type Px } from '@/lib/pixel-homes/house-badge'

const PAPER = '#f6efdc'
const RULE = '#c9b998'
const LABEL = '#8f7d5c'
const LINE_CHARS = 20

/** The name over two lines of up to 20 letters, broken at a space when it can be. */
export function nameLines(name: string): string[] {
  const text = badgeText(name, LINE_CHARS * 2 + 1)
  if (text.length <= LINE_CHARS) return [text]
  const cut = text.slice(0, LINE_CHARS + 1).lastIndexOf(' ')
  const first = cut > 0 ? text.slice(0, cut) : text.slice(0, LINE_CHARS)
  return [first, badgeText(text.slice(first.length).trim(), LINE_CHARS)]
}

export function ringBadgeSvg(name: string): string {
  const lines = nameLines(name)
  const width = (s: string) => s.length * 4 - 1
  const pixels: Px[] = [
    { x: 0, y: 0, w: BADGE_WIDTH, h: BADGE_HEIGHT, fill: FRAME },
    { x: 1, y: 1, w: BADGE_WIDTH - 2, h: BADGE_HEIGHT - 2, fill: PAPER },
    { x: 3, y: 22, w: BADGE_WIDTH - 6, h: 1, fill: RULE },
  ]
  const top = lines.length === 1 ? 9 : 5
  lines.forEach((line, i) => pixels.push(...textPixels(line, Math.round((BADGE_WIDTH - width(line)) / 2), top + i * 7, INK)))
  pixels.push(...textPixels('THREADRING', Math.round((BADGE_WIDTH - width('THREADRING')) / 2), 24, LABEL))
  const body = pixels.map((p) => `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="${p.fill}"/>`).join('')
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${BADGE_WIDTH}" height="${BADGE_HEIGHT}" ` +
    `viewBox="0 0 ${BADGE_WIDTH} ${BADGE_HEIGHT}" shape-rendering="crispEdges">${body}</svg>`
  )
}

const drawn = new Map<string, Buffer>()

export async function ringBadgePng(name: string): Promise<Buffer> {
  const hit = drawn.get(name)
  if (hit) return hit
  const png = await sharp(Buffer.from(ringBadgeSvg(name))).png().toBuffer()
  if (drawn.size > 500) drawn.clear()
  drawn.set(name, png)
  return png
}
