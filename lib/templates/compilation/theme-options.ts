/**
 * Theme options, Tumblr-style: a page declares the colours and fonts a
 * friend might want to change, and Settings > Your page turns them into
 * pickers, so nobody has to open the code to change them.
 *
 *   <meta name="color:Accent" content="#c96633">
 *   <meta name="font:Headings" content="Georgia, serif">
 *
 * Each one becomes a CSS variable on the page root, named by its type and
 * slugified name (`--color-accent`, `--font-headings`), which the page's CSS
 * uses as `var(--color-accent)`. The tags can sit in a pasted page's <head>
 * or anywhere in the template; they never reach the page itself (a raw
 * <meta> is never allowed into a page, see html-allowlist.ts).
 *
 * Values are checked three times: when the page compiles (a bad one is a
 * warning in the editor and is left out), when the stored copy is read for
 * a page view (validThemeOptions), and when Settings rewrites them. Colours
 * are hex, rgb(), hsl() or a colour name; fonts are a comma list of names
 * made of letters, numbers, spaces and hyphens, quoted or not. Nothing with
 * `; { } < > \ ( )` gets through, so no value can end the declaration,
 * open a url() or leave the <style> tag.
 *
 * Captured by extractDocument (document-head.ts), stored as head.options on
 * the compiled AST, injected by pages/_app.tsx and the editor preview
 * through documentHeadCss, rewritten by writeThemeOptions.
 *
 * Kept free of server-only imports: pages/_app.tsx and Settings use it.
 */
import { lineAt, tokenizeSource, type SourceAttribute, type SourceToken } from './source-scan'
import { PRESET_FONT_FACES } from '../preset-fonts'

export type ThemeOptionType = 'color' | 'font'

export interface ThemeOption {
  type: ThemeOptionType
  /** As the page wrote it after the colon, e.g. "Link hover" */
  name: string
  /** Validated (fonts normalised to `A, B, c`) */
  value: string
}

const OPTION_TYPES: readonly ThemeOptionType[] = ['color', 'font']
/** Tumblr's other option types: recognised so the editor can say they don't work yet */
const LATER_TYPES = new Set(['if', 'select', 'text', 'image', 'lang'])

const MAX_NAME = 40
const MAX_OPTIONS = 40

/** "Link hover" → "link-hover" */
export function optionSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** The CSS variable an option sets: `--color-link-hover` */
export function optionVar(option: Pick<ThemeOption, 'type' | 'name'>): string {
  return `--${option.type}-${optionSlug(option.name)}`
}

/** One key per variable: `color:link-hover` */
export function optionKey(option: Pick<ThemeOption, 'type' | 'name'>): string {
  return `${option.type}:${optionSlug(option.name)}`
}

const HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i
const NUMBER = String.raw`[-+]?(?:\d+\.?\d*|\.\d+)`
const COLOR_FUNCTION = new RegExp(
  String.raw`^(?:rgba?|hsla?)\(\s*${NUMBER}(?:deg|turn|rad|grad|%)?(?:\s*[,/]?\s*${NUMBER}%?){2,3}\s*\)$`,
  'i'
)
const COLOR_NAME = /^[a-z]{3,24}$/i

/** A colour as hex, rgb()/rgba(), hsl()/hsla() or a name, or undefined. */
export function safeOptionColor(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const v = value.trim()
  if (v.length > 64) return undefined
  if (HEX.test(v) || COLOR_FUNCTION.test(v)) return v
  if (COLOR_NAME.test(v)) return v.toLowerCase()
  return undefined
}

const FAMILY = /^(?:[A-Za-z0-9][A-Za-z0-9 -]*|'[A-Za-z0-9][A-Za-z0-9 -]*'|"[A-Za-z0-9][A-Za-z0-9 -]*")$/

/** A font list like `'Iowan Old Style', Georgia, serif`, normalised, or undefined. */
export function safeOptionFont(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const v = value.trim()
  if (!v || v.length > 200) return undefined
  const families = v.split(',').map((f) => f.trim().replace(/\s+/g, ' '))
  if (families.length > 8 || !families.every((f) => FAMILY.test(f))) return undefined
  return families.join(', ')
}

export function safeOptionValue(type: ThemeOptionType, value: unknown): string | undefined {
  return type === 'color' ? safeOptionColor(value) : safeOptionFont(value)
}

/** The family names in a font list, unquoted */
export function fontFamilies(stack: string): string[] {
  return stack.split(',').map((f) => f.trim().replace(/^['"]|['"]$/g, ''))
}

/** Options as stored on a compiled page, checked again (it comes from the database). */
export function validThemeOptions(raw: unknown): ThemeOption[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: ThemeOption[] = []
  for (const item of raw.slice(0, MAX_OPTIONS)) {
    const { type, name, value } = (item || {}) as Record<string, unknown>
    if (!OPTION_TYPES.includes(type as ThemeOptionType)) continue
    if (typeof name !== 'string' || name.length > MAX_NAME || !optionSlug(name)) continue
    const safe = safeOptionValue(type as ThemeOptionType, value)
    if (!safe) continue
    const option = { type: type as ThemeOptionType, name, value: safe }
    if (seen.has(optionKey(option))) continue
    seen.add(optionKey(option))
    out.push(option)
  }
  return out
}

/**
 * The CSS the options stand for: one `:root` block of variables, plus the
 * @font-face rules for any of the site's self-hosted fonts they name. Goes
 * through transformAdvancedCss like the rest of the page's CSS (`:root`
 * stays the page root there).
 */
export function themeOptionsCss(raw: unknown): string {
  const options = validThemeOptions(raw)
  if (options.length === 0) return ''
  const faces = new Set<string>()
  for (const option of options) {
    if (option.type !== 'font') continue
    for (const family of fontFamilies(option.value)) {
      if (Object.prototype.hasOwnProperty.call(PRESET_FONT_FACES, family)) faces.add(PRESET_FONT_FACES[family])
    }
  }
  const vars = options.map((o) => `  ${optionVar(o)}: ${o.value};`).join('\n')
  return [...faces, `:root {\n${vars}\n}`].join('\n')
}

// ---------------------------------------------------------------------------
// Reading and rewriting the source
// ---------------------------------------------------------------------------

type OpenToken = Extract<SourceToken, { type: 'open' }>

function attribute(token: OpenToken, name: string): SourceAttribute | undefined {
  return token.attributes.find((a) => a.name.toLowerCase() === name)
}

function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

/** `type:Name` from a <meta name>, or null when it isn't one of ours. */
function declaredName(token: SourceToken): { type: string; name: string } | null {
  if (token.type !== 'open' || token.name.toLowerCase() !== 'meta' || token.unterminated) return null
  const raw = attribute(token, 'name')?.value
  if (raw === undefined) return null
  const m = decodeEntities(raw).match(/^\s*([a-z]+):([\s\S]*)$/i)
  if (!m) return null
  const type = m[1].toLowerCase()
  if (!OPTION_TYPES.includes(type as ThemeOptionType) && !LATER_TYPES.has(type)) return null
  return { type, name: m[2].trim().replace(/\s+/g, ' ') }
}

/**
 * Is this source tag a theme option (or one of Tumblr's types we don't do
 * yet)? The stripped-tag report skips these: the options report their own
 * problems.
 */
export function isThemeOptionMeta(token: SourceToken): boolean {
  return declaredName(token) !== null
}

export interface DeclaredOption extends ThemeOption {
  token: OpenToken
}

export interface ScannedOptions {
  options: ThemeOption[]
  /** For the editor's problems panel, each starting "Line N:" */
  warnings: string[]
  /** Every option <meta> tag, kept out of the page */
  spans: Array<{ start: number; end: number }>
  /** The tag each option came from (the first, when one is repeated) */
  declared: DeclaredOption[]
}

function quoted(value: string): string {
  const short = value.length > 40 ? `${value.slice(0, 40)}…` : value
  return `"${short}"`
}

/** Every theme option the source declares, in order, with what's wrong with the rest. */
export function scanThemeOptions(source: string, tokens: SourceToken[] = tokenizeSource(source)): ScannedOptions {
  const result: ScannedOptions = { options: [], warnings: [], spans: [], declared: [] }
  const lines = new Map<string, number>()
  for (const token of tokens) {
    const declared = declaredName(token)
    if (!declared || token.type !== 'open') continue
    result.spans.push({ start: token.start, end: token.end })
    const line = lineAt(source, token.start)
    const label = `${declared.type}:${declared.name}`

    if (LATER_TYPES.has(declared.type)) {
      result.warnings.push(`Line ${line}: ${label} isn't something pages here can set yet. Colours (color:) and fonts (font:) work.`)
      continue
    }
    const type = declared.type as ThemeOptionType
    if (!optionSlug(declared.name) || declared.name.length > MAX_NAME) {
      result.warnings.push(
        declared.name
          ? `Line ${line}: ${quoted(declared.name)} is too long for a setting name. Keep it under ${MAX_NAME} letters.`
          : `Line ${line}: <meta name="${declared.type}:"> needs a name after the colon, like ${declared.type}:Accent.`
      )
      continue
    }
    const option = { type, name: declared.name }
    const key = optionKey(option)
    const first = lines.get(key)
    if (first !== undefined) {
      result.warnings.push(`Line ${line}: ${label} is already set on line ${first}, so this one does nothing.`)
      continue
    }
    const content = attribute(token, 'content')?.value
    const value = safeOptionValue(type, content === undefined ? '' : decodeEntities(content))
    if (!value) {
      const written = content === undefined ? '' : decodeEntities(content)
      result.warnings.push(
        type === 'color'
          ? `Line ${line}: ${quoted(written)} isn't a colour ${label} can use. Try a hex code like #c96633.`
          : `Line ${line}: ${quoted(written)} isn't a font list ${label} can use. Write font names split by commas, like Georgia, serif.`
      )
      continue
    }
    if (result.options.length >= MAX_OPTIONS) {
      result.warnings.push(`Line ${line}: a page can have ${MAX_OPTIONS} settings at most, so ${label} does nothing.`)
      continue
    }
    lines.set(key, line)
    result.options.push({ ...option, value })
    result.declared.push({ ...option, value, token })
  }
  return result
}

/** A value written back into an attribute quoted with `quote` */
function encodeAttribute(value: string, quote: string): string {
  const encoded = value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return quote === "'" ? encoded.replace(/'/g, '&#39;') : encoded.replace(/"/g, '&quot;')
}

/**
 * The source with new option values written into their <meta content>.
 * `values` is keyed by optionKey. Only the content value of each changed
 * tag moves; quotes, spacing, line breaks and everything else stay as the
 * person wrote them (an unquoted value gets double quotes). Values that don't pass the checks are ignored.
 */
export function writeThemeOptions(source: string, values: Record<string, string>): string {
  const edits: Array<{ start: number; end: number; text: string }> = []
  for (const option of scanThemeOptions(source).declared) {
    const wanted = values[optionKey(option)]
    if (wanted === undefined) continue
    const value = safeOptionValue(option.type, wanted)
    if (!value || value === option.value) continue

    // Only tags with a valid content value are options, so it's there
    const content = attribute(option.token, 'content')
    if (!content) continue
    const eq = source.slice(content.start, content.end).indexOf('=')
    if (eq < 0) continue
    let valueStart = content.start + eq + 1
    while (valueStart < content.end && /\s/.test(source[valueStart])) valueStart++
    const quote = source[valueStart]
    if (quote === '"' || quote === "'") {
      const close = source.indexOf(quote, valueStart + 1)
      const valueEnd = close < 0 || close > content.end ? content.end : close
      edits.push({ start: valueStart + 1, end: valueEnd, text: encodeAttribute(value, quote) })
    } else {
      edits.push({ start: valueStart, end: content.end, text: `"${encodeAttribute(value, '"')}"` })
    }
  }
  let out = source
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    out = out.slice(0, edit.start) + edit.text + out.slice(edit.end)
  }
  return out
}
