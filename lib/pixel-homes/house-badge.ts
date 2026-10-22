/**
 * The 88×31 house badge (pixel homes Phase 5): a resident's house drawn small
 * in their own colours, with their name and house number in a 3×5 pixel
 * font, the size of the ThreadRing badges it sits beside. Served as SVG by
 * GET /api/home/[handle]/badge and shown on the profile's "Step back
 * outside" strip and in ring member lists.
 *
 * Everything is drawn as whole-pixel rects in a 88×31 viewBox, so it stays
 * crisp at 1× and 2×. No text from the resident reaches the SVG as text:
 * names become rects, and the <title> is escaped.
 */
import type { PrismaClient } from '@prisma/client'
import type { ColorPalette, HouseCustomizations, HouseTemplate } from '@/components/pixel-homes/HouseSVG'
import { visibleResidentWhere } from '@/lib/domain/users/profile-access'
import { PALETTE_COLORS as HOUSE_PALETTE_COLORS } from '@/components/pixel-homes/HouseSVG'

export const BADGE_WIDTH = 88
export const BADGE_HEIGHT = 31
/** Characters of the name that fit beside the house. */
export const BADGE_NAME_CHARS = 13

// Scene colours from the street (styles/components.css .ts-street-*)
const SKY = '#9dbfd3'
const GRASS = '#608d43'
const GRASS_DARK = '#4c7236'
export const INK = '#3e4b4d'
export const FRAME = '#4a403d'

// A 3×5 font: each glyph is five rows of three bits, top to bottom
const GLYPHS: Record<string, string> = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
  Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111',
  '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '3': '110001010001110',
  '4': '101101111001001', '5': '111100110001110', '6': '011100111101111', '7': '111001010010010',
  '8': '111101111101111', '9': '111101111001110',
  '.': '000000000000010', '-': '000000111000000', '_': '000000000000111', "'": '010010000000000',
  '!': '010010010000010', '?': '110001010000010', '&': '010101010101011', '+': '000010111010000',
}

export interface HouseBadgeData {
  template: HouseTemplate
  palette: ColorPalette
  customizations?: HouseCustomizations | null
  /** Display name, or handle */
  name: string
  /** House number on the street (join order), when known */
  number?: number | null
}

/** Name → the characters the font can draw: accents dropped, upper case, at most BADGE_NAME_CHARS. */
export function badgeText(name: string, max = BADGE_NAME_CHARS): string {
  const plain = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .split('')
    .map((c) => (c === ' ' || GLYPHS[c] ? c : ''))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
  if (plain.length <= max) return plain
  // Too long: stop at the last whole word that fits, unless that leaves too little
  const cut = plain.slice(0, max + 1).lastIndexOf(' ')
  return (cut >= 6 ? plain.slice(0, cut) : plain.slice(0, max)).trimEnd()
}

export type Px = { x: number; y: number; w: number; h: number; fill: string }

export function textPixels(text: string, x0: number, y0: number, fill: string): Px[] {
  const out: Px[] = []
  let x = x0
  for (const ch of text) {
    const glyph = GLYPHS[ch]
    if (glyph) {
      for (let row = 0; row < 5; row++) {
        // One rect per run of lit bits in the row
        let col = 0
        while (col < 3) {
          if (glyph[row * 3 + col] === '1') {
            let end = col
            while (end + 1 < 3 && glyph[row * 3 + end + 1] === '1') end++
            out.push({ x: x + col, y: y0 + row, w: end - col + 1, h: 1, fill })
            col = end + 1
          } else col++
        }
      }
    }
    x += 4
  }
  return out
}

function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex).map((c) => Math.max(0, Math.round(c * (1 - amount))))
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

const SAFE_HEX = /^#[0-9a-fA-F]{6}$/
const pick = (custom: string | undefined, fallback: string) => (custom && SAFE_HEX.test(custom) ? custom : fallback)

/** The house's colours, the same way HouseSVG picks them. */
export function badgeColors(palette: ColorPalette, customizations?: HouseCustomizations | null) {
  const base = HOUSE_PALETTE_COLORS[palette] ?? HOUSE_PALETTE_COLORS.thread_sage
  return {
    wall: pick(customizations?.wallColor, base.base),
    roof: pick(customizations?.roofColor, base.primary),
    trim: pick(customizations?.trimColor, base.secondary),
    window: pick(customizations?.windowColor, base.accent),
    door: pick(customizations?.detailColor, base.detail),
  }
}

/** The little house, standing on the grass line (y = 24). */
function housePixels(template: HouseTemplate, colors: ReturnType<typeof badgeColors>): Px[] {
  const { wall, roof, trim, window, door } = colors
  const roofEdge = darken(roof, 0.3)
  const px: Px[] = []
  const rect = (x: number, y: number, w: number, h: number, fill: string) => px.push({ x, y, w, h, fill })
  const windowAt = (x: number, y: number) => {
    rect(x - 1, y - 1, 5, 5, trim)
    rect(x, y, 3, 3, window)
  }

  if (template === 'townhouse_v1') {
    rect(8, 9, 18, 15, wall)
    rect(7, 7, 20, 2, roof)
    rect(7, 7, 20, 1, roofEdge)
    windowAt(10, 11)
    windowAt(21, 11)
    windowAt(10, 17)
    windowAt(21, 17)
    rect(15, 17, 4, 7, door)
  } else if (template === 'loft_v1') {
    rect(5, 12, 24, 12, wall)
    rect(4, 10, 26, 2, roof)
    rect(4, 10, 26, 1, roofEdge)
    rect(7, 14, 11, 5, trim)
    rect(8, 15, 9, 3, window)
    rect(22, 16, 4, 8, door)
  } else {
    // Cabin and cottage: a gable (cabin) or a round-shouldered roof (cottage)
    const cottage = template === 'cottage_v1'
    rect(7, 14, 20, 10, wall)
    rect(22, 6, 2, 5, trim) // chimney
    const rows = cottage
      ? [[12, 10], [9, 16], [7, 20], [6, 22], [5, 24], [5, 24], [5, 24]]
      : [[15, 4], [13, 8], [11, 12], [9, 16], [7, 20], [5, 24], [5, 24]]
    rows.forEach(([x, w], i) => {
      rect(x, 7 + i, w, 1, i === rows.length - 1 ? roofEdge : roof)
      if (i < rows.length - 1) {
        rect(x, 7 + i, 1, 1, roofEdge)
        rect(x + w - 1, 7 + i, 1, 1, roofEdge)
      }
    })
    rect(15, 7, 4, 1, roofEdge)
    windowAt(10, 16)
    windowAt(21, 16)
    rect(15, 17, 4, 7, door)
  }
  // Foundation line
  rect(5, 23, 24, 1, darken(wall, 0.35))
  return px
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!)
}

/** The badge as an SVG document. */
export function houseBadgeSvg(data: HouseBadgeData): string {
  const colors = badgeColors(data.palette, data.customizations)
  const pixels: Px[] = [
    { x: 0, y: 0, w: BADGE_WIDTH, h: BADGE_HEIGHT, fill: FRAME },
    { x: 1, y: 1, w: BADGE_WIDTH - 2, h: 23, fill: SKY },
    { x: 1, y: 24, w: BADGE_WIDTH - 2, h: BADGE_HEIGHT - 25, fill: GRASS },
    { x: 1, y: 24, w: BADGE_WIDTH - 2, h: 1, fill: GRASS_DARK },
    ...housePixels(data.template, colors),
    ...textPixels(badgeText(data.name), 33, 7, INK),
    ...(data.number ? textPixels(`NO ${data.number}`, 33, 15, INK) : []),
  ]
  const title = `${data.name}'s house${data.number ? `, number ${data.number}` : ''}`
  const body = pixels.map((p) => `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="${p.fill}"/>`).join('')
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${BADGE_WIDTH}" height="${BADGE_HEIGHT}" ` +
    `viewBox="0 0 ${BADGE_WIDTH} ${BADGE_HEIGHT}" shape-rendering="crispEdges">` +
    `<title>${escapeXml(title)}</title>${body}</svg>`
  )
}

/**
 * Of these residents, the ones whose house badge this viewer may see, as
 * userId → local handle (for GET /api/home/<handle>/badge). One query; the
 * same visibility and block rules as the homes themselves.
 */
export async function badgeHandlesFor(
  db: Pick<PrismaClient, 'userHomeConfig'>,
  userIds: string[],
  viewerId: string | null | undefined,
  host: string
): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map()
  const homes = await db.userHomeConfig.findMany({
    where: { userId: { in: userIds }, user: visibleResidentWhere(viewerId) },
    select: { userId: true, user: { select: { handles: { where: { host }, select: { handle: true }, take: 1 } } } },
  })
  return new Map(homes.filter((h) => h.user.handles[0]).map((h) => [h.userId, h.user.handles[0].handle]))
}
