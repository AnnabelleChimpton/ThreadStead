/**
 * Ring badges, drawn one pixel at a time at 88×31 (design/threadring-audit/
 * 08-badges.md): four templates, eight palettes from threadstead-44, and an
 * optional glyph. The name is fitted in pixel fonts and never cut mid-word.
 * Pure, so the server's PNGs (lib/rings/badge.ts) and the badge designer's
 * preview are the same pixels. A port of the drafts' pixfont.py and
 * ringbadge.py.
 */
import { SMALL_GLYPHS } from '@/lib/pixel-homes/pixel-font'

export const BADGE_WIDTH = 88
export const BADGE_HEIGHT = 31
const W = BADGE_WIDTH
const H = BADGE_HEIGHT

export type Px = { x: number; y: number; w: number; h: number; fill: string }

// --- colours: all from threadstead-44 ---------------------------------------

const INK0 = '#2b2523'
const INK1 = '#4a403d'
const INK4 = '#d8cbbd'
const PAPER = '#fffaf5'
const PEACH_HI = '#ffe7cf'

/**
 * The one table of ring colours. A ring's theme colour (lib/rings/theme.ts)
 * is a palette's field, and its drawn badge is in that palette. field: the
 * badge colour; edge: its outline and shadow; hi: highlight and stitch; text:
 * the name on the field; deep: the name on pale paper; light: the pale step.
 * theme: offered as a page colour (butter is too light for text, so only
 * auto-picked badges get it).
 */
export const BADGE_PALETTES = {
  pine: { name: 'Pine', theme: true, field: '#2e4b3f', edge: '#1d3029', hi: '#4a957a', text: PAPER, deep: '#1d3029', light: '#c5d0cd' },
  moss: { name: 'Moss', theme: true, field: '#49722e', edge: '#1b350a', hi: '#a3c27a', text: PAPER, deep: '#2d5016', light: '#a3c27a' },
  sky: { name: 'Sky', theme: true, field: '#3f5f7a', edge: '#2b2523', hi: '#9dbfd3', text: PAPER, deep: '#3f5f7a', light: '#d4e6ef' },
  lavender: { name: 'Lavender', theme: true, field: '#5a4fb3', edge: '#2b2523', hi: '#8b7fe0', text: PAPER, deep: '#5a4fb3', light: '#c0b7f9' },
  rose: { name: 'Rose', theme: true, field: '#8c4a5b', edge: '#4a403d', hi: '#d9a9b5', text: PAPER, deep: '#8c4a5b', light: '#f4d6dc' },
  brick: { name: 'Brick', theme: true, field: '#c4473a', edge: '#7f1d1d', hi: '#f2a58e', text: PAPER, deep: '#7f1d1d', light: '#f2a58e' },
  butter: { name: 'Butter', theme: false, field: '#e8b730', edge: '#b07d1a', hi: '#f6e27f', text: INK1, deep: INK1, light: '#f6e27f' },
  wood: { name: 'Wood', theme: true, field: '#834a27', edge: '#3d2314', hi: '#b05e2b', text: PEACH_HI, deep: '#5c301b', light: '#e1b489' },
} as const

type Palette = (typeof BADGE_PALETTES)[BadgePaletteId]

// --- glyphs: 7×7 or 8×7, '#' the main colour, 'o' the second ----------------

const GLYPH_ROWS = {
  // Two linked rings: a webring. The 'o' ring passes over at the bottom crossing
  rings: ['.###....', '#...#...', '#...#oo.', '#..o#..o', '.##o...o', '...o...o', '....ooo.'],
  heart: ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...', '.......'],
  star: ['...#...', '...#...', '#######', '.#####.', '..###..', '.##.##.', '.#...#.'],
  note: ['..####.', '..#..#.', '..#..#.', '..#..#.', '###.###', '###.###', '.......'],
  cat: ['#.....#', '##...##', '#######', '#o###o#', '#######', '.#####.', '.......'],
  leaf: ['....###', '..#####', '.####o#', '.###o##', '.#o###.', '.o.....', 'o......'],
  house: ['...#...', '..###..', '.#####.', '#######', '.#ooo#.', '.#o#o#.', '.#o#o#.'],
  spool: ['#######', '.#ooo#.', '.#####.', '.#ooo#.', '.#####.', '.#ooo#.', '#######'],
  pencil: ['.....oo', '....o#o', '...###.', '..###..', '.###...', 'o##....', 'oo.....'],
  film: ['#.#.#.#', '#######', '#ooooo#', '#ooooo#', '#######', '#.#.#.#', '.......'],
} as const

export const BADGE_TEMPLATE_IDS = ['label', 'patch', 'screen', 'stamp'] as const
export const BADGE_PALETTE_IDS = ['pine', 'moss', 'sky', 'lavender', 'rose', 'brick', 'butter', 'wood'] as const
export const BADGE_GLYPH_IDS = Object.keys(GLYPH_ROWS) as [BadgeGlyphId, ...BadgeGlyphId[]]

export type BadgeTemplateId = (typeof BADGE_TEMPLATE_IDS)[number]
export type BadgePaletteId = (typeof BADGE_PALETTE_IDS)[number]
export type BadgeGlyphId = keyof typeof GLYPH_ROWS

export interface BadgeDesign {
  template: BadgeTemplateId
  /** The ring's theme colour's palette (lib/rings/theme.ts ringBadgePalette) */
  palette: BadgePaletteId
  glyph: BadgeGlyphId | null
  /** What the badge says: the ring's name unless its Host typed something else */
  text: string
}

/** What a Host picks; the palette comes with the ring's colour. */
export type BadgeChoice = Pick<BadgeDesign, 'template' | 'glyph' | 'text'>

// --- fonts ------------------------------------------------------------------

/** Rows of '#' and '.'. Big glyphs are 9 rows: 0–6 the cap height, 7–8 the descender. */
type Glyph = readonly string[]

function g(rows: string[], top = 0): Glyph {
  const w = Math.max(...rows.map((r) => r.length))
  const out = [...Array<string>(top).fill('.'.repeat(w)), ...rows.map((r) => r.padEnd(w, '.'))]
  while (out.length < 9) out.push('.'.repeat(w))
  return out
}

const X = 2 // x-height top row

/** 5×7 capitals, 4-wide lowercase with a 5-row x-height and 2-row descenders. */
const BIG: Record<string, Glyph> = {

  A: g(['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#']),
  B: g(['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.']),
  C: g(['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.']),
  D: g(['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.']),
  E: g(['#####', '#....', '#....', '####.', '#....', '#....', '#####']),
  F: g(['#####', '#....', '#....', '####.', '#....', '#....', '#....']),
  G: g(['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####']),
  H: g(['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#']),
  I: g(['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###']),
  J: g(['..##', '...#', '...#', '...#', '...#', '#..#', '.##.']),
  K: g(['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#']),
  L: g(['#...', '#...', '#...', '#...', '#...', '#...', '####']),
  M: g(['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#']),
  N: g(['#...#', '#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#']),
  O: g(['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.']),
  P: g(['####.', '#...#', '#...#', '####.', '#....', '#....', '#....']),
  Q: g(['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#']),
  R: g(['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#']),
  S: g(['.####', '#....', '#....', '.###.', '....#', '....#', '####.']),
  T: g(['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..']),
  U: g(['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.']),
  V: g(['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..']),
  W: g(['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.']),
  X: g(['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#']),
  Y: g(['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..']),
  Z: g(['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####']),

  a: g(['.##.', '...#', '.###', '#..#', '.###'], X),
  b: g(['#...', '#...', '###.', '#..#', '#..#', '#..#', '###.']),
  c: g(['.###', '#...', '#...', '#...', '.###'], X),
  d: g(['...#', '...#', '.###', '#..#', '#..#', '#..#', '.###']),
  e: g(['.##.', '#..#', '####', '#...', '.###'], X),
  f: g(['..##', '.#..', '####', '.#..', '.#..', '.#..', '.#..']),
  g: g(['.###', '#..#', '#..#', '#..#', '.###', '...#', '.##.'], X),
  h: g(['#...', '#...', '###.', '#..#', '#..#', '#..#', '#..#']),
  i: g(['#', '.', '#', '#', '#', '#', '#']),
  j: g(['..#', '...', '..#', '..#', '..#', '..#', '..#', '#.#', '.#.']),
  k: g(['#...', '#...', '#..#', '#.#.', '##..', '#.#.', '#..#']),
  l: g(['#.', '#.', '#.', '#.', '#.', '#.', '.#']),
  m: g(['##.#.', '#.#.#', '#.#.#', '#.#.#', '#.#.#'], X),
  n: g(['###.', '#..#', '#..#', '#..#', '#..#'], X),
  o: g(['.##.', '#..#', '#..#', '#..#', '.##.'], X),
  p: g(['###.', '#..#', '#..#', '#..#', '###.', '#...', '#...'], X),
  q: g(['.###', '#..#', '#..#', '#..#', '.###', '...#', '...#'], X),
  r: g(['#.##', '##..', '#...', '#...', '#...'], X),
  s: g(['.###', '#...', '.##.', '...#', '###.'], X),
  t: g(['.#.', '.#.', '###', '.#.', '.#.', '.#.', '..#']),
  u: g(['#..#', '#..#', '#..#', '#..#', '.###'], X),
  v: g(['#...#', '#...#', '.#.#.', '.#.#.', '..#..'], X),
  w: g(['#...#', '#...#', '#.#.#', '#.#.#', '.#.#.'], X),
  x: g(['#...#', '.#.#.', '..#..', '.#.#.', '#...#'], X),
  y: g(['#..#', '#..#', '#..#', '#..#', '.###', '...#', '.##.'], X),
  z: g(['####', '...#', '.##.', '#...', '####'], X),

  0: g(['.##.', '#..#', '#.##', '##.#', '#..#', '#..#', '.##.']),
  1: g(['.#.', '##.', '.#.', '.#.', '.#.', '.#.', '###']),
  2: g(['.##.', '#..#', '...#', '..#.', '.#..', '#...', '####']),
  3: g(['###.', '...#', '...#', '.##.', '...#', '...#', '###.']),
  4: g(['#..#', '#..#', '#..#', '####', '...#', '...#', '...#']),
  5: g(['####', '#...', '###.', '...#', '...#', '#..#', '.##.']),
  6: g(['.##.', '#...', '#...', '###.', '#..#', '#..#', '.##.']),
  7: g(['####', '...#', '..#.', '.#..', '.#..', '.#..', '.#..']),
  8: g(['.##.', '#..#', '#..#', '.##.', '#..#', '#..#', '.##.']),
  9: g(['.##.', '#..#', '#..#', '.###', '...#', '...#', '.##.']),

  '&': g(['.#...', '#.#..', '.#...', '#.#.#', '#..#.', '#..#.', '.##.#']),
  '.': g(['.', '.', '.', '.', '.', '.', '#']),
  ',': g(['.', '.', '.', '.', '.', '.', '#', '#']),
  '!': g(['#', '#', '#', '#', '#', '.', '#']),
  '?': g(['.##.', '#..#', '...#', '..#.', '.#..', '....', '.#..']),
  "'": g(['#', '#']),
  '-': g(['...', '...', '...', '###']),
  '+': g(['...', '...', '.#.', '###', '.#.']),
  ':': g(['.', '.', '#', '.', '.', '#']),
  '/': g(['..#', '..#', '.#.', '.#.', '.#.', '#..', '#..']),
  '#': g(['.#.#.', '.#.#.', '#####', '.#.#.', '#####', '.#.#.', '.#.#.']),
  '(': g(['.#', '#.', '#.', '#.', '#.', '#.', '.#']),
  ')': g(['#.', '.#', '.#', '.#', '.#', '.#', '#.']),
}

/** The house badges' 3×5 capitals, plus a few for ring names. */
const SMALL: Record<string, Glyph> = {}
const SMALL_BITS: Record<string, string> = {
  ...SMALL_GLYPHS,
  ':': '000010000010000', '/': '001001010100100', ',': '000000000010100', '#': '101111101111101',
}
for (const [c, bits] of Object.entries(SMALL_BITS)) {
  SMALL[c] = [0, 1, 2, 3, 4].map((r) => bits.slice(r * 3, r * 3 + 3).replace(/1/g, '#').replace(/0/g, '.'))
}
// The few small glyphs that are really one column wide
for (const c of ".'!:,") {
  const rows = SMALL[c]
  const cols = [0, 1, 2].filter((i) => rows.some((r) => r[i] === '#'))
  SMALL[c] = rows.map((r) => r.slice(cols[0], cols[cols.length - 1] + 1))
}
// So the small font draws every character the big one does
SMALL['('] = ['.#', '#.', '#.', '#.', '.#']
SMALL[')'] = ['#.', '.#', '.#', '.#', '#.']

// Accents for lowercase letters: there's room above the x-height, so é, ñ, ü
// keep theirs (capitals lose them). [column from the glyph's middle, row].
const ACCENTS: Record<string, [number | 'L' | 'R', number][]> = {
  '́': [[0, 1], [1, 0]], // acute
  '̀': [[-1, 0], [0, 1]], // grave
  '̂': [[-1, 1], [0, 0], [1, 1]], // circumflex
  '̈': [['L', 0], ['R', 0]], // diaeresis
  '̃': [[-2, 1], [-1, 0], [0, 1], [1, 0]], // tilde
  '̊': [[0, 0]], // ring, as a dot
}
const accentedGlyphs = new Map<string, Glyph | null>()

/** A big glyph, building accented lowercase letters (é, ñ, ü, ç…) on first use. */
function bigGlyph(ch: string): Glyph | undefined {
  if (BIG[ch]) return BIG[ch]
  if (!accentedGlyphs.has(ch)) accentedGlyphs.set(ch, accented(ch))
  return accentedGlyphs.get(ch) ?? undefined
}

function accented(ch: string): Glyph | null {
  const parts = Array.from(ch.normalize('NFD'))
  if (parts.length !== 2) return null
  const [base, mark] = parts
  if (base === 'i' || base === 'ı' || !BIG[base]) return null
  const rows = BIG[base].map((r) => r.split(''))
  const w = rows[0].length
  if (mark === '̧') {
    // cedilla
    if (base !== 'c') return null
    rows[7][w >> 1] = '#'
    rows[8][(w >> 1) - 1] = '#'
  } else if (ACCENTS[mark] && !(rows[0].join('') + rows[1].join('')).includes('#')) {
    const mid = Math.floor((w - 1) / 2) + (w % 2 === 0 ? 1 : 0)
    for (const [dx, row] of ACCENTS[mark]) {
      const x = dx === 'L' ? 0 : dx === 'R' ? w - 1 : mid + dx
      if (x >= 0 && x < w) rows[row][x] = '#'
    }
  } else return null
  return rows.map((r) => r.join(''))
}

class Font {
  constructor(
    private glyphs: (ch: string) => Glyph | undefined,
    readonly cap: number,
    readonly desc: number,
    readonly space: number,
    readonly pitch: number,
    private upper = false
  ) {}

  chars(s: string): string[] {
    return Array.from(this.upper ? s.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase() : s)
  }

  glyph(ch: string): Glyph {
    return this.glyphs(ch) ?? ['']
  }

  width(s: string): number {
    const cs = this.chars(s)
    let w = 0
    cs.forEach((ch, i) => {
      w += ch === ' ' ? this.space : this.glyph(ch)[0].length
      if (i < cs.length - 1 && ch !== ' ' && cs[i + 1] !== ' ') w += 1
    })
    return w
  }

  hasDescender(s: string): boolean {
    return this.chars(s).some((ch) => ch !== ' ' && this.glyph(ch).slice(this.cap).some((r) => r.includes('#')))
  }

  draw(put: (x: number, y: number, c: string) => void, s: string, x: number, y: number, colour: string) {
    const cs = this.chars(s)
    cs.forEach((ch, i) => {
      if (ch === ' ') {
        x += this.space
        return
      }
      const glyph = this.glyph(ch)
      glyph.forEach((row, ry) => {
        for (let rx = 0; rx < row.length; rx++) if (row[rx] === '#') put(x + rx, y + ry, colour)
      })
      x += glyph[0].length + (i < cs.length - 1 && cs[i + 1] !== ' ' ? 1 : 0)
    })
  }
}

const BIG_FONT = new Font(bigGlyph, 7, 2, 3, 10)
const SMALL_FONT = new Font((ch) => SMALL[ch], 5, 0, 2, 7, true)

const MAP: Record<string, string> = {
  ß: 'ss', æ: 'ae', Æ: 'AE', ø: 'o', Ø: 'O', œ: 'oe', Œ: 'OE', ł: 'l', Ł: 'L',
  '’': "'", '‘': "'", '“': '', '”': '', '"': '', '–': '-', '—': '-', _: ' ', '|': ' ', '·': ' ',
}

/** A name → what the fonts can draw. Emoji and other scripts become a gap, not a box. */
export function badgeText(name: string): string {
  let out = ''
  for (const raw of name.normalize('NFC')) {
    const ch = MAP[raw] ?? raw
    if (!ch) continue
    if (ch.length === 1 && /\p{Ll}/u.test(ch) && bigGlyph(ch)) {
      out += ch
      continue
    }
    if (ch.length === 1 && 'íìîï'.includes(ch)) {
      out += 'i'
      continue
    }
    for (const c of ch.normalize('NFD')) {
      if (/\p{M}/u.test(c)) continue
      out += c === ' ' || BIG[c] ? c : ' '
    }
  }
  return out.split(/\s+/).filter(Boolean).join(' ')
}

// --- fitting: never an ellipsis, never half a word ----------------------------

const STOP = new Set(['the', 'of', 'a', 'an', 'for'])
const isUpper = (c: string) => /\p{Lu}/u.test(c)
const isLower = (c: string) => /\p{Ll}/u.test(c)

/** Words, plus soft breaks inside camelCase and dotted words (no space drawn there). */
type Token = { text: string; glued: boolean }

function tokens(text: string): Token[] {
  const out: Token[] = []
  for (const word of text.split(' ')) {
    const parts: string[] = []
    let cur = ''
    for (const ch of word) {
      const last = cur.slice(-1)
      if (cur && ((isUpper(ch) && isLower(last)) || ch === '.' || last === '/' || last === '-')) {
        parts.push(cur)
        cur = ''
      }
      cur += ch
    }
    parts.push(cur)
    parts.forEach((p, j) => out.push({ text: p, glued: j > 0 }))
  }
  return out
}

function join(toks: Token[]): string {
  return toks.map((t, i) => (i === 0 || t.glued ? t.text : ' ' + t.text)).join('')
}

/** Every way to choose k break points from start..end-1, in order. */
function* breaks(start: number, end: number, k: number): Generator<number[]> {
  if (k === 0) {
    yield []
    return
  }
  for (let i = start; i < end; i++) for (const rest of breaks(i + 1, end, k - 1)) yield [i, ...rest]
}

const blockHeight = (font: Font, n: number) => (n - 1) * font.pitch + font.cap

function tryFit(text: string, maxw: number, maxh: number, font: Font, n: number): string[] | null {
  const toks = tokens(text)
  if (toks.length < n || blockHeight(font, n) > maxh) return null
  let best: { glued: number; width: number; lines: string[] } | null = null
  for (const cuts of breaks(1, toks.length, n - 1)) {
    const b = [0, ...cuts, toks.length]
    const lines = b.slice(0, -1).map((from, i) => join(toks.slice(from, b[i + 1])))
    const width = Math.max(...lines.map((l) => font.width(l)))
    if (width > maxw) continue
    // Balanced, and breaking at spaces before breaking inside a word
    const glued = cuts.filter((c) => toks[c].glued).length
    if (!best || glued < best.glued || (glued === best.glued && width < best.width)) best = { glued, width, lines }
  }
  return best?.lines ?? null
}

/** One very long word in as many small-font lines as fit, broken where it must. */
function wrapAnywhere(text: string, maxw: number, maxh: number): string[] {
  const lines = ['']
  for (const ch of text) {
    const line = lines[lines.length - 1]
    if (SMALL_FONT.width(line + ch) <= maxw) lines[lines.length - 1] = line + ch
    else if (blockHeight(SMALL_FONT, lines.length + 1) <= maxh) lines.push(ch === ' ' ? '' : ch)
    else break
  }
  return lines.map((l) => l.trim())
}

/**
 * The first that fits: big font on one line, then two; small font on one,
 * two, three; the same with the little words dropped; whole words from the
 * front. A first word too long for any of those breaks where it must.
 */
export function fitName(name: string, slug: string, maxw: number, maxh: number, maxLines = 3): { font: Font; lines: string[] } {
  let text = badgeText(name)
  if (!/[\p{L}\p{N}]/u.test(text)) text = badgeText(slug.replace(/-/g, ' '))
  const attempts: [Font, number][] = [[BIG_FONT, 1], [BIG_FONT, 2], [SMALL_FONT, 1], [SMALL_FONT, 2], [SMALL_FONT, 3]]
  const variants = [text]
  const short = text.replace(/ and /g, ' & ').split(' ').filter((w) => !STOP.has(w.toLowerCase())).join(' ')
  if (short !== text) variants.push(short)
  for (const t of variants) {
    for (const [font, n] of attempts) {
      if (n > maxLines) continue
      const lines = tryFit(t, maxw, maxh, font, n)
      if (lines) return { font, lines }
    }
  }
  let words = text.split(' ')
  while (words.length > 1) {
    words = words.slice(0, -1)
    while (words.length > 1 && (STOP.has(words[words.length - 1].toLowerCase()) || words[words.length - 1] === '&' || words[words.length - 1] === 'and')) {
      words = words.slice(0, -1)
    }
    for (let n = 1; n <= maxLines; n++) {
      const lines = tryFit(words.join(' '), maxw, maxh, SMALL_FONT, n)
      if (lines) return { font: SMALL_FONT, lines }
    }
  }
  return { font: SMALL_FONT, lines: wrapAnywhere(words[0], maxw, maxh) }
}

// --- drawing -------------------------------------------------------------------

class Canvas {
  px: (string | null)[]

  constructor(fill: string | null) {
    this.px = new Array<string | null>(W * H).fill(fill)
  }

  put = (x: number, y: number, c: string) => {
    if (x >= 0 && x < W && y >= 0 && y < H) this.px[y * W + x] = c
  }

  rect(x: number, y: number, w: number, h: number, c: string) {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.put(xx, yy, c)
  }

  hline(x0: number, x1: number, y: number, c: string) {
    this.rect(x0, y, x1 - x0 + 1, 1, c)
  }

  vline(x: number, y0: number, y1: number, c: string) {
    this.rect(x, y0, 1, y1 - y0 + 1, c)
  }

  glyph(name: BadgeGlyphId, x: number, y: number, main: string, second: string) {
    GLYPH_ROWS[name].forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) {
        if (row[rx] === '#') this.put(x + rx, y + ry, main)
        else if (row[rx] === 'o') this.put(x + rx, y + ry, second)
      }
    })
  }

  /** One rect per run of a colour along a row. */
  rects(): Px[] {
    const out: Px[] = []
    for (let y = 0; y < H; y++) {
      let x = 0
      while (x < W) {
        const fill = this.px[y * W + x]
        let end = x + 1
        while (end < W && this.px[y * W + end] === fill) end++
        if (fill) out.push({ x, y, w: end - x, h: 1, fill })
        x = end
      }
    }
    return out
  }
}

const glyphWidth = (name: BadgeGlyphId) => GLYPH_ROWS[name][0].length

function drawText(cv: Canvas, fit: { font: Font; lines: string[] }, x0: number, y0: number, w: number, h: number, colour: string, shadow?: string) {
  const { font, lines } = fit
  const bh = blockHeight(font, lines.length)
  let y = y0 + Math.floor((h - bh) / 2)
  // Descenders on the last line hang below the cap box: up 1 if they'd hit the edge
  if (font.hasDescender(lines[lines.length - 1]) && y + bh + font.desc > y0 + h) y = Math.max(y0, y - 1)
  lines.forEach((line, i) => {
    const x = x0 + Math.floor((w - font.width(line) + 1) / 2)
    if (shadow) font.draw(cv.put, line, x + 1, y + i * font.pitch + 1, shadow)
    font.draw(cv.put, line, x, y + i * font.pitch, colour)
  })
}

type Template = (text: string, slug: string, p: Palette, glyph: BadgeGlyphId | null) => Canvas

/** Index card: paper, espresso frame, a coloured tab with the glyph. */
const label: Template = (text, slug, p, glyph) => {
  const cv = new Canvas(PAPER)
  cv.rect(0, 0, W, H, INK1)
  cv.rect(1, 1, W - 2, H - 2, PAPER)
  const tab = glyph ? 15 : 0
  if (glyph) {
    cv.rect(1, 1, tab - 1, H - 2, p.field)
    cv.vline(tab, 1, H - 2, INK1)
    cv.glyph(glyph, Math.floor((tab - glyphWidth(glyph)) / 2) + 1, 12, p.text, p.hi)
  }
  const x0 = tab + 3
  const w = W - tab - 6
  drawText(cv, fitName(text, slug, w, H - 8), x0, 4, w, H - 8, INK1)
  return cv
}

/** Sewn-on patch: a coloured field, a running stitch, the name with a 1px shadow. */
const patch: Template = (text, slug, p, glyph) => {
  const cv = new Canvas(p.field)
  cv.rect(0, 0, W, H, p.edge)
  cv.rect(1, 1, W - 2, H - 2, p.field)
  // Running stitch inset 2px: 2 on, 2 off, from each corner
  const run = (points: [number, number][]) => points.forEach(([x, y], i) => i % 4 < 2 && cv.put(x, y, p.hi))
  const [x0, y0, x1, y1] = [2, 2, W - 3, H - 3]
  const span = (from: number, to: number) => Array.from({ length: to - from }, (_, i) => from + i)
  run(span(x0, x1 + 1).map((x) => [x, y0]))
  run(span(x0, x1 + 1).map((x) => [x, y1]))
  run(span(y0 + 2, y1 - 1).map((y) => [x0, y]))
  run(span(y0 + 2, y1 - 1).map((y) => [x1, y]))
  let left = 5
  if (glyph) {
    cv.glyph(glyph, 6, 12, p.text, p.hi)
    left = 7 + glyphWidth(glyph) + 2
  }
  const w = W - left - 6 // and 1 for the shadow
  drawText(cv, fitName(text, slug, w, H - 10), left, 5, w, H - 10, p.text, p.edge)
  return cv
}

/** The classic bevelled 88×31: a raised coloured frame round a sunken dark window. */
const screen: Template = (text, slug, p, glyph) => {
  const cv = new Canvas(INK0)
  cv.rect(1, 1, W - 2, H - 2, p.field)
  cv.hline(1, W - 2, 1, p.hi)
  cv.vline(1, 1, H - 2, p.hi)
  cv.hline(1, W - 2, H - 2, p.edge)
  cv.vline(W - 2, 1, H - 2, p.edge)
  let wx0 = 4
  const [wy0, wx1, wy1] = [4, W - 5, H - 5]
  if (glyph) {
    cv.glyph(glyph, 4, 12, p.text, p.hi)
    wx0 = 5 + glyphWidth(glyph) + 1
  }
  cv.rect(wx0, wy0, wx1 - wx0 + 1, wy1 - wy0 + 1, INK0)
  cv.hline(wx0, wx1, wy0, p.edge)
  cv.vline(wx0, wy0, wy1, p.edge)
  cv.hline(wx0, wx1, wy1, p.hi)
  cv.vline(wx1, wy0, wy1, p.hi)
  const innerW = wx1 - wx0 - 3
  const innerH = wy1 - wy0 - 3
  drawText(cv, fitName(text, slug, innerW, innerH), wx0 + 2, wy0 + 2, innerW, innerH, p.light)
  return cv
}

/** Postage stamp: a perforated, see-through paper edge, a coloured frame, a pale panel. */
const stamp: Template = (text, slug, p, glyph) => {
  const cv = new Canvas(null)
  cv.rect(1, 1, W - 2, H - 2, PAPER)
  // Perforation: the outer row is paper on even positions only, with a
  // hairline of shadow on the bottom and right holes so it reads on white
  for (let x = 1; x < W - 1; x++) {
    if (x % 2 === 0) {
      cv.put(x, 0, PAPER)
      cv.put(x, H - 1, PAPER)
    } else cv.put(x, H - 1, INK4)
  }
  for (let y = 1; y < H - 1; y++) {
    if (y % 2 === 0) {
      cv.put(0, y, PAPER)
      cv.put(W - 1, y, PAPER)
    } else cv.put(W - 1, y, INK4)
  }
  cv.rect(3, 3, W - 6, H - 6, p.field)
  cv.rect(4, 4, W - 8, H - 8, p.light)
  let left = 6
  if (glyph) {
    cv.glyph(glyph, 6, 12, p.field, p.deep)
    left = 7 + glyphWidth(glyph) + 2
  }
  const w = W - left - 6
  drawText(cv, fitName(text, slug, w, H - 12), left, 6, w, H - 12, p.deep)
  return cv
}

const TEMPLATES: Record<BadgeTemplateId, Template> = { label, patch, screen, stamp }

/** The badge as pixel rects on an 88×31 grid; what isn't covered is see-through. */
export function drawBadge(design: BadgeDesign, slug = ''): Px[] {
  return TEMPLATES[design.template](design.text, slug, BADGE_PALETTES[design.palette], design.glyph).rects()
}

/** A glyph alone, for the designer's picker. */
export function glyphPixels(name: BadgeGlyphId, main: string, second: string): Px[] {
  const out: Px[] = []
  GLYPH_ROWS[name].forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] !== '.') out.push({ x, y, w: 1, h: 1, fill: row[x] === '#' ? main : second })
    }
  })
  return out
}

/** The rects as 88×31 RGBA bytes (transparent where nothing is drawn). */
export function badgeRgba(pixels: Px[]): Uint8Array {
  const out = new Uint8Array(W * H * 4)
  for (const p of pixels) {
    const n = Number.parseInt(p.fill.slice(1), 16)
    for (let y = p.y; y < p.y + p.h; y++) {
      for (let x = p.x; x < p.x + p.w; x++) {
        out.set([(n >> 16) & 255, (n >> 8) & 255, n & 255, 255], (y * W + x) * 4)
      }
    }
  }
  return out
}

// --- the default badge ----------------------------------------------------------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(s: string): number {
  let c = 0xffffffff
  const byte = (b: number) => (c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8))
  for (const ch of s) {
    const u = ch.codePointAt(0)!
    if (u < 0x80) byte(u)
    else if (u < 0x800) [0xc0 | (u >> 6), 0x80 | (u & 63)].forEach(byte)
    else if (u < 0x10000) [0xe0 | (u >> 12), 0x80 | ((u >> 6) & 63), 0x80 | (u & 63)].forEach(byte)
    else [0xf0 | (u >> 18), 0x80 | ((u >> 12) & 63), 0x80 | ((u >> 6) & 63), 0x80 | (u & 63)].forEach(byte)
  }
  return (c ^ 0xffffffff) >>> 0
}

/**
 * A ring's palette while it has no theme colour: steady per slug, so a list
 * of rings varies. Only the page colours, since it's the page's accent too.
 */
const AUTO_PALETTES = BADGE_PALETTE_IDS.filter((id) => BADGE_PALETTES[id].theme)
export function autoPalette(slug: string): BadgePaletteId {
  return AUTO_PALETTES[crc32(slug) % AUTO_PALETTES.length]
}

/** These choices, with the default for anything not chosen: Label with linked rings, saying the ring's name (""). */
export function badgeChoiceFor(choice: Partial<BadgeChoice>): BadgeChoice {
  return {
    template: choice.template ?? 'label',
    glyph: choice.glyph === undefined ? 'rings' : choice.glyph,
    text: choice.text?.trim() ?? '',
  }
}

/** The badge drawn from these choices in this palette. The default is what new rings, and rings with no image, get. */
export function badgeDesignFor(choice: Partial<BadgeChoice>, name: string, palette: BadgePaletteId): BadgeDesign {
  const { template, glyph, text } = badgeChoiceFor(choice)
  return { template, palette, glyph, text: text || name }
}
