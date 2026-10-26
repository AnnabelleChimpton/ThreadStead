/**
 * Dependency-free, state-aware CSS statement parsing for the user-CSS
 * pipeline (lib/utils/css/layers.ts).
 *
 * WHY THIS EXISTS: the previous transforms used naive regexes. The @import
 * extractor (`/@import\s+[^;]+;/`) truncated multi-weight Google-Fonts URLs
 * at the first semicolon INSIDE the url() string, corrupting every shipped
 * preset theme: the hoisted import broke (fonts never loaded), URL shrapnel
 * landed in rule bodies, and rules after the import escaped profile scoping
 * entirely. The selector regex also scoped @keyframes stops (from/to) into
 * invalid CSS, silently killing user animations. See
 * tests/css-pipeline/__tests__/css-pipeline-characterization.test.ts.
 *
 * This module tokenizes CSS at the statement level while respecting strings
 * ('…' and "…" with escapes), url(…) tokens, comments, and nested braces —
 * the minimum required to transform user CSS without corrupting it. It is
 * deliberately NOT a full CSS parser (postcss would be correct but is too
 * heavy for the client bundle; these functions run in preview paths).
 */

import { normalizeCss } from './css-normalize'
import { sanitizeCss } from '@/lib/utils/sanitization/css'

/**
 * A page's CSS as every transform here starts from: read the way a browser
 * reads it (normalizeCss), then re-checked, since an escaped @import or
 * property name got past the check at save (bug bash 2026-10-26, P0 #2)
 */
export function pageCssAsBrowserReads(css: string): string {
  return sanitizeCss(normalizeCss(css)).css
}

export interface CSSStatement {
  /** 'at' for @-rules, 'rule' for qualified rules, 'other' for stray text */
  kind: 'at' | 'rule' | 'other'
  /** Lowercased at-rule name without '@' (e.g. 'import', 'media') — at-rules only */
  atName?: string
  /** Selector list / at-rule prelude, trimmed, without the block braces */
  prelude: string
  /** Block contents (inside { }), undefined for statements ending in ';' */
  body?: string
}

/**
 * Split CSS into top-level statements. Comments are removed. Text that isn't
 * part of a valid statement (stray tokens) is kept as kind 'other' so nothing
 * is silently dropped.
 */
export function splitTopLevelStatements(css: string): CSSStatement[] {
  const src = stripComments(css)
  const statements: CSSStatement[] = []
  const len = src.length
  let i = 0

  const flushOther = (text: string) => {
    const trimmed = text.trim()
    if (trimmed) statements.push({ kind: 'other', prelude: trimmed })
  }

  while (i < len) {
    // Skip whitespace between statements
    while (i < len && /\s/.test(src[i])) i++
    if (i >= len) break

    const start = i
    // Scan forward to the end of this statement: either a ';' at depth 0
    // (statement at-rule like @import) or a balanced { ... } block.
    let braceDepth = 0
    let blockStart = -1
    let end = -1
    let terminatedBy: 'semicolon' | 'block' | 'eof' = 'eof'

    while (i < len) {
      const ch = src[i]
      if (ch === "'" || ch === '"') {
        i = skipString(src, i)
        continue
      }
      if (ch === '(') {
        i = skipParens(src, i)
        continue
      }
      if (ch === '{') {
        if (braceDepth === 0) blockStart = i
        braceDepth++
        i++
        continue
      }
      if (ch === '}') {
        braceDepth--
        i++
        if (braceDepth === 0) {
          end = i
          terminatedBy = 'block'
          break
        }
        continue
      }
      if (ch === ';' && braceDepth === 0) {
        end = i + 1
        terminatedBy = 'semicolon'
        break
      }
      i++
    }

    if (end === -1) {
      // Unterminated statement — keep the raw text so nothing is lost.
      flushOther(src.slice(start))
      break
    }

    // Advance past this statement. The block branch already leaves i === end,
    // but the semicolon branch breaks while i still points AT the ';' —
    // without this, an empty statement (stray ';') loops forever.
    i = end

    if (terminatedBy === 'semicolon') {
      const raw = src.slice(start, end - 1).trim()
      if (!raw) continue
      if (raw.startsWith('@')) {
        statements.push({
          kind: 'at',
          atName: atRuleName(raw),
          prelude: raw,
        })
      } else {
        // A ';'-terminated non-at statement is stray text (e.g. shrapnel)
        flushOther(raw)
      }
    } else {
      const prelude = src.slice(start, blockStart).trim()
      const body = src.slice(blockStart + 1, end - 1)
      if (prelude.startsWith('@')) {
        statements.push({ kind: 'at', atName: atRuleName(prelude), prelude, body })
      } else if (prelude) {
        statements.push({ kind: 'rule', prelude, body })
      } else {
        flushOther(body)
      }
    }
  }

  return statements
}

/** Serialize statements back to CSS text. */
export function serializeStatements(statements: CSSStatement[]): string {
  return statements
    .map((s) => {
      if (s.body === undefined) {
        return s.kind === 'at' ? `${s.prelude};` : s.prelude
      }
      return `${s.prelude} {${s.body}}`
    })
    .join('\n')
}

/**
 * Split a declaration block body into individual declarations, respecting
 * strings, url(...), and nested parens (e.g. data: URIs with semicolons).
 */
export function splitDeclarations(body: string): string[] {
  const decls: string[] = []
  let current = ''
  let i = 0
  while (i < body.length) {
    const ch = body[i]
    if (ch === "'" || ch === '"') {
      const end = skipString(body, i)
      current += body.slice(i, end)
      i = end
      continue
    }
    if (ch === '(') {
      const end = skipParens(body, i)
      current += body.slice(i, end)
      i = end
      continue
    }
    if (ch === ';') {
      if (current.trim()) decls.push(current.trim())
      current = ''
      i++
      continue
    }
    current += ch
    i++
  }
  if (current.trim()) decls.push(current.trim())
  return decls
}

/**
 * Extract statement-level @import (and @charset) rules, returning them intact
 * alongside the remaining CSS. Imports must precede all other rules per the
 * CSS spec, so callers hoist them to the top of generated output.
 */
export function extractImports(css: string): { imports: string[]; rest: string } {
  const statements = splitTopLevelStatements(css)
  const imports: string[] = []
  const rest: CSSStatement[] = []
  for (const s of statements) {
    if (s.kind === 'at' && (s.atName === 'import' || s.atName === 'charset') && s.body === undefined) {
      imports.push(`${s.prelude};`)
    } else {
      rest.push(s)
    }
  }
  return { imports, rest: serializeStatements(rest) }
}

/**
 * The site chrome profile CSS must never reach: everything marked
 * data-site-chrome (header with its nav and menus, footer, cookie notice,
 * chat, toasts, "step outside", "view source", the nav bar on your-own-HTML
 * pages). By attribute only: a page's own class="site-header" used to count
 * as the site's, and every rule for it and inside it was dead.
 */
export const SITE_CHROME_SELECTOR = '[data-site-chrome]'

/** Anything but the site chrome and what's inside it, weighing nothing */
const OUTSIDE_CHROME = `:where(:not(${SITE_CHROME_SELECTOR}, ${SITE_CHROME_SELECTOR} *))`

/**
 * Standard-layout profile CSS styles the profile, and the site's own
 * wrappers around it, but never the site header, footer or other chrome:
 * presets that restyled `.nav-link` / `.site-footer` pushed the user menu
 * off-screen and left footer links unreadable. Each selector's subject gets
 * OUTSIDE_CHROME. This was an `@scope (html) to (chrome)` block, which
 * Safari before 17.4 drops whole, profile CSS and all.
 * Inherited properties (font, color) still flow into the chrome from body;
 * the chrome roots reset those themselves (styles/retro.css).
 */
export function scopeAwayFromSiteChrome(css: string): string {
  return mapSelectors(clampZIndex(pageCssAsBrowserReads(css)), outsideChrome, { nested: true })
}

/**
 * `nav a:hover::after` → `nav a:hover:where(:not(chrome…))::after`: the
 * boundary on the selector's subject, before any pseudo-element.
 */
export function outsideChrome(selector: string): string {
  const sel = selector.trim()
  let subject = 0 // where the last compound starts
  let pseudo = -1 // its first pseudo-element
  let i = 0
  while (i < sel.length) {
    const ch = sel[i]
    if (ch === '\\') {
      i += 2
    } else if (ch === '"' || ch === "'") {
      i = skipString(sel, i)
    } else if (ch === '(') {
      i = skipParens(sel, i)
    } else if (ch === '[') {
      while (i < sel.length && sel[i] !== ']') i = sel[i] === '"' || sel[i] === "'" ? skipString(sel, i) : i + 1
      i++
    } else if (/[\s>+~]/.test(ch)) {
      subject = ++i
      pseudo = -1
    } else {
      if (ch === ':' && pseudo === -1 && /^:(?::|(?:before|after|first-line|first-letter)(?![\w-]))/i.test(sel.slice(i))) pseudo = i
      i++
    }
  }
  const at = pseudo === -1 ? sel.length : pseudo
  return `${sel.slice(0, at)}${OUTSIDE_CHROME}${sel.slice(at)}`
}

/**
 * The highest z-index standard-layout CSS may give anything: one under the
 * site header's (NavBar.tsx, z-[9999]). That CSS restyles the site's own
 * parts, any of them, so `.site-main { position: relative; z-index: 99999 }`
 * put a whole profile over the nav (template audit 02 X2, B1 follow-up).
 * Your-own-HTML pages are kept under it another way (scopeAdvancedSelector,
 * styles/chrome-layers.css).
 */
export const PROFILE_Z_INDEX_MAX = 9998

/** `z-index: 99999` → `z-index: min(99999, 9998)`; keywords stay as they are */
export function clampZIndex(css: string): string {
  return css.replace(
    /(?<![\w-])(z-index\s*:\s*)([^;{}!]+?)(\s*(?:!\s*important)?\s*)(?=[;}]|$)/gi,
    (whole, prop: string, value: string, end: string) =>
      /^(?:auto|inherit|initial|unset|revert|revert-layer)$/i.test(value.trim())
        ? whole
        : `${prop}min(${value.trim()}, ${PROFILE_Z_INDEX_MAX})${end}`
  )
}

/**
 * rehype-sanitize prefixes every id (and name) in a person's own HTML with
 * this, so `id="x"` can't overwrite a `window.x` the site's scripts read.
 * The compiler rewrites `href="#x"`, `<label for>` and friends to match;
 * prefixUserContentIds does the same for their CSS.
 */
export const USER_CONTENT_PREFIX = 'user-content-'

/**
 * Point `#id` selectors and `url(#id)` references (SVG filters, gradients,
 * clip paths) at the prefixed ids the page actually has. Ids already written
 * with the prefix are left alone.
 */
export function prefixUserContentIds(css: string): string {
  // [id="main"] and label[for=x] have no # ([id…] only worked when some # was elsewhere)
  if (!css.includes('#') && !/\[\s*[\w-]+\s*[~|^$*]?=/.test(css)) return css
  const withUrls = css.replace(
    /url\(\s*(['"]?)#(?!user-content-)([^'")\s]+)\1\s*\)/g,
    (_m, quote: string, id: string) => `url(${quote}#${USER_CONTENT_PREFIX}${id}${quote})`
  )
  return mapSelectors(withUrls, prefixSelectorIds, { nested: true })
}

/**
 * Attribute selectors that compare an id the page's elements carry renamed:
 * `[href="#about"]` and `[for="name"]`, `[id="x"]`, `[aria-controls="x"]`
 * (a skip link styled by `a[href="#main"]` showed for good: template audit
 * 03 F13). Any other attribute compares text and is left alone.
 */
function prefixAttributeId(attribute: string): string {
  const m = attribute.match(/^\[\s*([\w-]+)\s*([~|^$*]?=)\s*(["']?)(.*?)\3(\s+[is])?\s*\]$/i)
  if (!m) return attribute
  const [, name, op, quote, value, flag = ''] = m
  const lower = name.toLowerCase()
  const fragment = lower === 'href' && value.startsWith('#') && value.length > 1 && value !== '#top'
  const idName = /^(?:id|for|name|list|headers|aria-(?:controls|describedby|labelledby|owns|activedescendant|errormessage|flowto|details))$/.test(lower)
  const usemap = lower === 'usemap' && value.startsWith('#') && value.length > 1
  if ((!fragment && !idName && !usemap) || value.slice(fragment || usemap ? 1 : 0).startsWith(USER_CONTENT_PREFIX) || !value) return attribute
  // Ends with or contains: the renamed id still does, as written
  // ([id$="-box"] became [id$="user-content--box"] and matched nothing; bug bash 2026-10-26)
  if (op === '$=' || op === '*=') return attribute
  const renamed = fragment || usemap ? `#${USER_CONTENT_PREFIX}${value.slice(1)}` : `${USER_CONTENT_PREFIX}${value}`
  return `[${name}${op}${quote || '"'}${renamed}${quote || '"'}${flag}]`
}

/** `#a.b:not(#c)` → `#user-content-a.b:not(#user-content-c)`; `[href="#a"]` too. */
function prefixSelectorIds(selector: string): string {
  let out = ''
  let i = 0
  while (i < selector.length) {
    const ch = selector[i]
    if (ch === "'" || ch === '"') {
      const end = skipString(selector, i)
      out += selector.slice(i, end)
      i = end
      continue
    }
    if (ch === '[') {
      let end = i + 1
      while (end < selector.length && selector[end] !== ']') {
        end = selector[end] === '"' || selector[end] === "'" ? skipString(selector, end) : end + 1
      }
      out += prefixAttributeId(selector.slice(i, end + 1))
      i = end + 1
      continue
    }
    if (ch === '\\') {
      out += selector.slice(i, i + 2)
      i += 2
      continue
    }
    if (ch === '#' && /[A-Za-z_\\ -￿-]/.test(selector[i + 1] || '')) {
      out += selector.startsWith(USER_CONTENT_PREFIX, i + 1) ? '#' : `#${USER_CONTENT_PREFIX}`
      i++
      continue
    }
    out += ch
    i++
  }
  return out
}

/**
 * One selector of advanced-mode CSS. Everything below html and body is the
 * page's own HTML: those parts must be inside the page root, so a page's
 * `div {}`, `*`, `div:has(...)` or `.ts-page-frame` can't match the site's
 * wrappers around it (raising one put the page over the site's nav;
 * template audit 02 X2, 03 F6b), and nothing the page writes reaches the
 * site's chrome, which is all outside the root (pinned by
 * page-components-ssr.test.tsx):
 *   `html`, `:root`, `body` → themselves (`html:root:is(html)`,
 *                             `:root:is(html) body`)
 *   `body > header`, `body .x`, `html .x` → `… body :where(.profile-template-root) > header`
 *                             (the page's top level, as its author meant)
 *   `::selection` etc.     → html and the page
 *   anything else, `*` included → `:root body :where(.profile-template-root) …`
 * The page root itself answers to its class (whole-page effects moved onto
 * it, overlays, a page that names it); what it mustn't do is pinned in
 * styles/chrome-layers.css.
 * Every selector gains the same weight, one class and one element, so the
 * author's own rules rank among themselves as in a browser (`body .nav a`
 * still beats a later `.nav a`; template audit 01 #9), and each beats the
 * site's rules of its own shape (the theme's `a:hover`).
 */
export function scopeAdvancedSelector(selector: string): string {
  const sel = selector.trim()
  // A whole-page overlay (scanlines, sparkles) drawn on body::before is the
  // page root's: over the page, never over the site's nav (it tinted it)
  const overlay = sel.match(/^(?::root|html|body|html\s+body)(::?(?:before|after))$/i)
  if (overlay) return `:root body ${PAGE_ROOT}${overlay[1]}`
  if (sel.startsWith('::')) return `:root${sel}, :root body ${INSIDE_PAGE} ${sel}`
  if (sel.startsWith(PAGE_ROOT)) return `:root body ${sel}`

  // The html and body compounds a selector starts with, and the rest
  const { whole, rootCompound, bodyCompound } = rootLead(sel)
  if (!rootCompound && !bodyCompound) return `:root body ${INSIDE_PAGE} ${sel}`
  // Classes, ids and attributes written on html or body are the page root's
  // (document-head.ts puts a pasted page's there); pseudo-classes stay put
  const root = rootCompound ? splitCompound(rootCompound) : null
  const body = bodyCompound ? splitCompound(bodyCompound) : null
  const onRoot = `${root?.moved ?? ''}${body?.moved ?? ''}`
  // `:root` twice for `:root` itself keeps every selector's weight as it was
  const top = root ? `${root.name}:root:is(html)${root.kept}` : ':root:is(html)'
  const bodyPart = body ? ` ${body.name}${body.kept}` : ''
  const rest = sel.slice(whole.length)
  // An effect moved onto the page root keeps its condition (moveWholePageEffects)
  if (rest.startsWith(PAGE_ROOT)) return `${top}${bodyPart} ${PAGE_ROOT}${onRoot}${rest.slice(PAGE_ROOT.length)}`
  if (rest) return `${top}${bodyPart} ${INSIDE_PAGE}${onRoot} ${rest}`
  // html or body itself, when the page root carries those classes
  const has = onRoot ? `:has(${INSIDE_PAGE}${onRoot})` : ''
  return `${top}${bodyPart}${has}`
}

/**
 * The html (or :root) and body compounds a selector starts with, as far as
 * they go: past spaces inside :has(), :not() and [attr="a b"] too. Stopped
 * at the first space, :root:has(.toggle input:checked) was cut in two and
 * the dark-mode switch did nothing (bug bash 2026-10-26).
 */
function rootLead(sel: string): { whole: string; rootCompound?: string; bodyCompound?: string } {
  let at = 0
  let rootCompound: string | undefined
  let bodyCompound: string | undefined
  if (/^(?::root|html)(?![\w-])/i.test(sel)) {
    at = compoundEnd(sel, 0)
    rootCompound = sel.slice(0, at)
  }
  const gap = /^\s*>?\s*/.exec(sel.slice(at))![0]
  if (/^body(?![\w-])/i.test(sel.slice(at + gap.length))) {
    const start = at + gap.length
    at = compoundEnd(sel, start)
    bodyCompound = sel.slice(start, at)
    at += /^\s*/.exec(sel.slice(at))![0].length
  } else if (rootCompound) {
    at += gap.length
  }
  return { whole: sel.slice(0, at), rootCompound, bodyCompound }
}

/** html or body itself, with conditions on them (`html:has(#dark:checked)`, `body.night`, `html > body:hover`) */
const isRootOrBodyWhen = (selector: string) => {
  const { whole, rootCompound, bodyCompound } = rootLead(selector.trim())
  return !!(rootCompound || bodyCompound) && whole.trim() === selector.trim()
}

/** `body.dark:hover` → name `body`, moved `.dark`, kept `:hover` */
function splitCompound(compound: string): { name: string; moved: string; kept: string } {
  const name = compound.match(/^(?::root|html|body)/i)![0]
  let moved = ''
  let kept = ''
  let i = name.length
  while (i < compound.length) {
    let end = i + 1
    if (compound[i] === '[') {
      while (end < compound.length && compound[end] !== ']') end = compound[end] === '"' || compound[end] === "'" ? skipString(compound, end) : end + 1
      end++
    } else {
      while (end < compound.length && !/[.#[:]/.test(compound[end])) end = compound[end] === '(' ? skipParens(compound, end) : end + 1
    }
    const part = compound.slice(i, end)
    if (/^[.#[]/.test(part)) moved += part
    else kept += part
    i = end
  }
  return { name, moved, kept }
}

/** Inside the page root, weighing nothing */
const INSIDE_PAGE = ':where(.profile-template-root)'

/**
 * The site's cascade layers, in order (styles/globals.css declares the same
 * list; a test keeps them equal). A page's CSS can sit before the site's
 * stylesheet in the document, so it states the order first: otherwise its
 * own layer names would be the first ever declared and rank under, or for
 * !important over, everything the site layers.
 */
export const SITE_LAYER_ORDER =
  '@layer theme, base, threadstead-browser, threadstead-reset, threadstead-global, components, utilities, threadstead-site, threadstead-components, threadstead-template, threadstead-user-base, threadstead-user-custom, threadstead-user-override, threadstead-user-nuclear, threadstead-page;'

/** Where a page's own @layers go: the site's last layer */
export const PAGE_LAYER = 'threadstead-page'

/**
 * `@layer a, b;` and `@layer a {…}` → `@layer threadstead-page.a…`, an
 * unnamed `@layer {…}` → `@layer threadstead-page {…}`. Without this a page's
 * `@layer theme` was the site's own theme layer, and its !important rules
 * there outranked the site's (the guard in styles/chrome-layers.css). Layers
 * nested in a page layer are already inside it and keep their names.
 */
export function namePageLayers(css: string): string {
  if (!/@layer/i.test(css)) return css
  const GROUP_AT_RULES = new Set(['media', 'supports', 'container', 'scope'])
  const out = splitTopLevelStatements(css).map((s) => {
    if (s.kind !== 'at') return s
    if (s.atName === 'layer') {
      const names = s.prelude.replace(/^@layer/i, '').split(',').map((n) => n.trim()).filter(Boolean)
      const prelude = names.length ? `@layer ${names.map((n) => `${PAGE_LAYER}.${n}`).join(', ')}` : `@layer ${PAGE_LAYER}`
      return { ...s, prelude }
    }
    if (s.body !== undefined && GROUP_AT_RULES.has(s.atName || '')) {
      return { ...s, body: '\n' + namePageLayers(s.body) + '\n' }
    }
    return s
  })
  return serializeStatements(out)
}

/** The element a page of your own HTML is drawn in (AdvancedProfileRenderer) */
export const PAGE_ROOT = '.profile-template-root'

/**
 * On html or body, these reach the site's chrome, which lives in body: a
 * filter, transform, perspective, zoom, contain or will-change makes body
 * the nav's containing block (it scrolls away) or applies to it, and
 * visibility and opacity hide or fade it (template audit 10 #1). A clip,
 * mask or content-visibility hides it too, html's writing-mode turns it on
 * its side, and an animation or motion path moves it (bug bash 2026-10-26).
 * With the -webkit- spellings browsers still take. display: none took the
 * whole site away; on the page root its guard (chrome-layers.css) ignores it.
 */
const WHOLE_PAGE_EFFECTS = /^(?:-webkit-|-moz-)?(?:filter|backdrop-filter|transform|translate|rotate|scale|perspective|zoom|contain|will-change|visibility|opacity|clip-path|mask(?:-[\w-]+)?|content-visibility|writing-mode|animation(?:-[\w-]+)?|offset(?:-[\w-]+)?)$/i
const isWholePageEffect = (declaration: string) => {
  const colon = declaration.indexOf(':')
  const name = declaration.slice(0, colon).trim()
  return WHOLE_PAGE_EFFECTS.test(name) || (/^display$/i.test(name) && /^none\s*(?:!\s*important)?$/i.test(declaration.slice(colon + 1).trim()))
}
const ROOT_OR_BODY = /^(?::root|html|body|html\s+body)$/i

/**
 * "Do this to my whole page" on html or body (a vintage filter, a tilted
 * page, a checkbox dark-mode toggle on html:has(#dark:checked)) goes on the
 * page root instead, where it does exactly that; the rest of the rule stays
 * put. Rules nested in an html or body rule that are still html or body
 * (`&:hover`, `body` in html, `@media` around declarations) come out to the
 * top level first, so their effects move too: kept nested, a filter in
 * them stayed on the real body, nav and all (bug bash 2026-10-26).
 */
export function moveWholePageEffects(css: string): string {
  if (!/(?:html|body|:root)/i.test(css)) return css
  return serializeStatements(splitTopLevelStatements(css).flatMap((s) => effectsMoved(s) ?? s))
}

const EFFECT_GROUPS = new Set(['media', 'supports', 'container', 'layer'])

/** The statement with its effects moved, or null when it has none to move */
function effectsMoved(s: CSSStatement): CSSStatement[] | null {
  if (s.kind === 'at' && s.body !== undefined && EFFECT_GROUPS.has(s.atName || '')) {
    return [{ ...s, body: '\n' + moveWholePageEffects(s.body) + '\n' }]
  }
  if (s.kind !== 'rule' || s.body === undefined) return null
  const selectors = splitSelectorList(s.prelude).map((selector) => selector.trim())
  if (!selectors.every((selector) => isRootOrBodyWhen(selector))) return null

  const { declarations, nested } = splitRuleBody(s.body)
  const stays: string[] = [] // nested rules kept as written: the page's own, scoped later
  const outside: CSSStatement[] = [] // html or body ones holding effects, out at the top level
  for (const rule of nested) {
    const atName = rule.prelude.startsWith('@') ? atRuleName(rule.prelude) : null
    const resolved = atName === null
      ? splitSelectorList(rule.prelude).flatMap((selector) => selectors.map((parent) => unnested(selector, parent)))
      : []
    const comesOut = hasEffects(rule.body) &&
      (atName === null ? resolved.every((selector) => isRootOrBodyWhen(selector)) : EFFECT_GROUPS.has(atName))
    if (!comesOut) stays.push(`${rule.prelude} {${rule.body}}`)
    // body { @media (x) { opacity: 0 } } is @media (x) { body { opacity: 0 } }
    else if (atName !== null) outside.push(...effectsMoved({ kind: 'at', atName, prelude: rule.prelude, body: `${s.prelude} {${rule.body}}` })!)
    else outside.push(...(effectsMoved({ kind: 'rule', prelude: resolved.join(', '), body: rule.body }) ?? [{ kind: 'rule', prelude: resolved.join(', '), body: rule.body }]))
  }

  const effects = declarations.filter(isWholePageEffect)
  if (effects.length === 0 && outside.length === 0) return null
  const rest = declarations.filter((d) => !effects.includes(d))
  const out: CSSStatement[] = []
  if (rest.length > 0 || stays.length > 0) {
    out.push({ ...s, body: ` ${[rest.length > 0 ? `${rest.join('; ')};` : '', ...stays].filter(Boolean).join(' ')} ` })
  }
  if (effects.length > 0) {
    // A condition goes with it: html:has(#dark:checked) inverts the page, not the nav
    const prelude = selectors.every((selector) => ROOT_OR_BODY.test(selector))
      ? PAGE_ROOT
      : selectors.map((selector) => `${selector} ${PAGE_ROOT}`).join(', ')
    out.push({ kind: 'rule', prelude, body: ` ${effects.join('; ')}; ` })
  }
  return [...out, ...outside]
}

/** Any effect declared in a rule body, at any depth */
function hasEffects(body: string): boolean {
  return [...body.matchAll(/(?:^|[;{}])\s*([-\w]+\s*:[^;{}]*)/g)].some((m) => isWholePageEffect(m[1]))
}

/** A nested selector written out in full: `&:hover` in body is `body:hover`, `body` in html is `html body` */
function unnested(selector: string, parent: string): string {
  const sel = selector.trim()
  return sel.includes('&') ? sel.replace(/&/g, parent) : `${parent} ${sel}`
}

/** A rule's own declarations, and the rules nested in it ({ prelude, body }), as written */
function splitRuleBody(body: string): { declarations: string[]; nested: { prelude: string; body: string }[] } {
  const declarations: string[] = []
  const nested: { prelude: string; body: string }[] = []
  let statement = 0
  let i = 0
  const declaration = (end: number) => {
    const text = body.slice(statement, end).trim()
    if (text) declarations.push(text)
  }
  while (i < body.length) {
    const ch = body[i]
    if (ch === "'" || ch === '"') {
      i = skipString(body, i)
    } else if (ch === '(') {
      i = skipParens(body, i)
    } else if (ch === ';') {
      declaration(i)
      statement = ++i
    } else if (ch === '{') {
      const close = closingBrace(body, i)
      nested.push({ prelude: body.slice(statement, i).trim(), body: body.slice(i + 1, close) })
      i = statement = close + 1
    } else {
      i++
    }
  }
  declaration(body.length)
  return { declarations, nested }
}

/**
 * The site's own @keyframes names (styles/*.css and Tailwind's theme; a test
 * keeps this list complete). A page's @keyframes of the same name replaced
 * the site's everywhere on that page, the nav's loading spinner included
 * (template audit 01 #16e), so the page's is renamed, with its uses.
 */
export const SITE_KEYFRAMES: ReadonlySet<string> = new Set([
  'bounce', 'curtain-flutter', 'excited-wave', 'fadeInDown', 'flag-raise', 'float-cloud', 'float-note',
  'gentle-wave', 'mobileErrorShake', 'mobilePageEnter', 'mobilePullRefreshSpin', 'mobilePulse',
  'mobileSuccessBounce', 'nb-wiggle', 'ping', 'pulse', 'pulse-glow', 'pulse-light', 'retro-flicker',
  'shimmer', 'skeleton-shimmer-animation', 'slideInFromTop', 'slideUpFromBottom', 'smoke-rise', 'spin',
  'swipe-in-from-left', 'swipe-in-from-right', 'swipe-out-left', 'swipe-out-right', 'swipe-out-up',
  'ts-arrive-fade', 'ts-arrive-sign', 'ts-blink', 'ts-house-arrive', 'ts-pixel-hop', 'ts-sprite-strip',
  'userDropdownSlideIn', 'window-glow',
])

/** `@keyframes spin` and `animation: spin 1s` → `page-spin`, for the names the site uses too */
export function renameCollidingKeyframes(css: string): string {
  const defined = new Set(
    [...css.matchAll(/@(?:-webkit-|-moz-)?keyframes\s+([\w-]+)/gi)].map((m) => m[1]).filter((name) => SITE_KEYFRAMES.has(name))
  )
  if (defined.size === 0) return css
  const names = new RegExp(`(?<![\\w-])(${[...defined].join('|')})(?![\\w-])`, 'g')
  return css
    .replace(/(@(?:-webkit-|-moz-)?keyframes\s+)([\w-]+)/gi, (whole, at: string, name: string) => (defined.has(name) ? `${at}page-${name}` : whole))
    .replace(/((?<![\w-])animation(?:-name)?\s*:)([^;{}]*)/gi, (_whole, prop: string, value: string) => prop + value.replace(names, 'page-$1'))
}

/**
 * Font families the site's own chrome is set in (styles/*.css and
 * Tailwind's theme; a test keeps this list complete), lowercased. A page's
 * @font-face of one of these names replaced it everywhere on that page,
 * the site's logo included (bug bash 2026-10-26).
 */
export const SITE_FONTS: ReadonlySet<string> = new Set([
  '-apple-system', 'apple color emoji', 'blinkmacsystemfont', 'cambria', 'consolas', 'courier new', 'fira code',
  'georgia', 'liberation mono', 'menlo', 'monaco', 'noto color emoji', 'roboto', 'segoe ui', 'segoe ui emoji',
  'segoe ui symbol', 'sfmono-regular', 'times', 'times new roman',
])

/** `@font-face { font-family: Georgia }` and its uses → `"page-Georgia"`, for the names the site uses too */
export function renameSiteFonts(css: string): string {
  if (!/@font-face/i.test(css)) return css
  const familyName = (value: string) => value.trim().replace(/^(["'])(.*)\1$/, '$2').replace(/\s+/g, ' ')
  const defined = new Map<string, string>() // lowercased → as written
  for (const face of css.matchAll(/@font-face\s*\{([^}]*)\}/gi)) {
    const family = /(?<![\w-])font-family\s*:\s*([^;}]+)/i.exec(face[1])?.[1]
    const name = family ? familyName(family) : ''
    if (SITE_FONTS.has(name.toLowerCase())) defined.set(name.toLowerCase(), name)
  }
  if (defined.size === 0) return css
  const names = new RegExp(
    `(["']?)(?<![\\w-])(${[...defined.keys()].map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')).join('|')})(?![\\w-])\\1`,
    'gi'
  )
  return css.replace(/((?<![\w-])font(?:-family)?\s*:)([^;{}]*)/gi, (_whole, prop: string, value: string) =>
    prop + value.replace(names, (_m, _q: string, name: string) => `"page-${defined.get(familyName(name).toLowerCase()) ?? name}"`)
  )
}

/**
 * THE transform for advanced-mode (your own HTML page) CSS. The live page
 * (pages/_app.tsx) and the editor preview (pages/template-preview.tsx) both
 * call this, so the preview can't show a page the live site won't.
 *
 * - @import / @charset are hoisted intact, after `fontImports` (Google Fonts
 *   <link>s pulled out of a pasted document's head, see document-head.ts).
 * - `bodyCss` (a pasted page's <body bgcolor text link…>) comes before the
 *   page's own rules, so those still win; `styleCss` (its <html style> and
 *   <body style>) after them, as an inline style beats a stylesheet.
 * - Ids and url(#…) references follow the user-content- prefix.
 * - Root selectors stay roots (scopeAdvancedSelector).
 * - The site's layer order comes first, and the page's own layers go into
 *   threadstead-page (namePageLayers).
 * - Whole-page effects and overlays on html/body go on the page root, out
 *   of the site chrome's way (moveWholePageEffects, scopeAdvancedSelector).
 * - Every selector is confined to the page root, which the site's header,
 *   footer and other chrome are all outside of, so a page's `nav a {}` or
 *   `h1::after {}` can't restyle or fake the site's own navigation. No
 *   @scope: Safari before 17.4 dropped the whole page's CSS with it.
 */
export function transformAdvancedCss(
  css: string,
  options: { fontImports?: readonly string[]; bodyCss?: string; styleCss?: string } = {}
): string {
  // <body bgcolor…> rules go first so the page's own CSS wins over them.
  // Each read as the browser reads it, so one left open can't take in the next
  const source = [options.bodyCss, css, options.styleCss].filter((part): part is string => !!part).map(pageCssAsBrowserReads).join('\n')
  const { imports, rest } = extractImports(renameSiteFonts(renameCollidingKeyframes(prefixUserContentIds(source))))
  const allImports = [
    ...(options.fontImports ?? []).filter((line) => !imports.includes(line)),
    ...imports,
  ]
  // A page written with light-dark() says it's for light and dark, before
  // its own rules, so they can say otherwise: with nothing declared,
  // light-dark() stayed light (template audit 13 #9). Not for a mention of
  // prefers-color-scheme: a page that only tweaked a border there went
  // near-black for dark-mode visitors, its own dark text unreadable (bug bash 2026-10-26)
  const schemes = /light-dark\(/i.test(rest) && !/(?<![\w-])color-scheme\s*:/i.test(rest) ? ':root { color-scheme: light dark; }\n' : ''
  const scoped = mapSelectors(namePageLayers(moveWholePageEffects(schemes + rest)), scopeAdvancedSelector, { authorScopes: true })
  if (!scoped && allImports.length === 0) return ''
  // Layer statements are the one thing allowed before @import
  return [SITE_LAYER_ORDER, ...allImports, scoped].filter(Boolean).join('\n')
}

/**
 * Transform every qualified rule's selector list, recursing into conditional
 * group at-rules (@media, @supports, @container, @layer blocks) and leaving
 * everything else (@keyframes, @font-face, @page, statement at-rules)
 * untouched.
 */
export function mapSelectors(
  css: string,
  mapSelector: (selector: string) => string,
  options: { recurseGroups?: boolean; nested?: boolean; authorScopes?: boolean } = {}
): string {
  const recurseGroups = options.recurseGroups !== false
  const GROUP_AT_RULES = new Set(['media', 'supports', 'container', 'layer', 'scope', 'starting-style'])
  const statements = splitTopLevelStatements(css)
  const out = statements.flatMap((s): CSSStatement | CSSStatement[] => {
    // `authorScopes`: a page's own @scope (.card) { img {} }: only its root
    // selector is mapped; the rules inside are relative to it (template audit 01 #16b)
    // Its root can't be html or body, whose scope is the whole document
    // nav and all: those are the page root. Nor can it be left out, which
    // makes it the <style>'s parent, outside the page (bug bash 2026-10-26)
    if (options.authorScopes && s.kind === 'at' && s.atName === 'scope') {
      const open = s.prelude.indexOf('(')
      const pageRoot = mapSelector(PAGE_ROOT)
      if (open === -1 || /^@scope\s+to\b/i.test(s.prelude)) {
        return { ...s, prelude: `@scope (${pageRoot})${s.prelude.replace(/^@scope/i, '')}` }
      }
      const close = skipParens(s.prelude, open)
      const roots = splitSelectorList(s.prelude.slice(open + 1, close - 1)).map((selector) => {
        const mapped = mapSelector(selector)
        return isWholeDocument(mapped) ? mapSelector(`${selector} ${PAGE_ROOT}`) : mapped
      })
      return { ...s, prelude: `${s.prelude.slice(0, open + 1)}${roots.join(', ')}${s.prelude.slice(close - 1)}` }
    }
    if (s.kind === 'rule') {
      const selectors = splitSelectorList(s.prelude).map(mapSelector)
      // `authorScopes` (a page's own CSS): rules nested in an html or body
      // rule stay inside the page too, as written at the top level would
      if (options.authorScopes && s.body?.includes('{')) {
        // html or body itself (`body.dark` → body:has(the page root.dark))
        const roots = selectors.filter(isWholeDocument)
        if (roots.length > 0) {
          const inside = selectors.filter((selector) => !isWholeDocument(selector))
          const rootRule = { ...s, prelude: roots.join(', '), body: nestedInsidePage(s.body) }
          return inside.length > 0 ? [{ ...s, prelude: inside.join(', ') }, rootRule] : rootRule
        }
      }
      // `nested`: rules nested inside this one (CSS nesting) too
      const body = options.nested && s.body !== undefined ? mapNestedSelectors(s.body, mapSelector) : s.body
      return { ...s, prelude: selectors.join(', '), body }
    }
    if (recurseGroups && s.kind === 'at' && s.body !== undefined && GROUP_AT_RULES.has(s.atName || '')) {
      return { ...s, body: '\n' + mapSelectors(s.body, mapSelector, options) + '\n' }
    }
    return s
  })
  return serializeStatements(out)
}

/** A mapped selector that is html or body itself, not inside the page root (`body.dark` → body:has(the page root.dark)) */
const isWholeDocument = (selector: string) => !selector.replace(/:has\(.*\)$/, '').includes(PAGE_ROOT)

/**
 * The selectors of the rules nested in a rule body (`.card { #title { … } }`),
 * at any depth; declarations and at-rule preludes are copied as written.
 * Nested `#id` rules weren't prefixed, so they matched nothing (template
 * audit 05, 10). Not for scoping: a nested selector is relative to its parent.
 */
function mapNestedSelectors(body: string, mapSelector: (selector: string) => string): string {
  if (!body.includes('{')) return body
  let out = ''
  let emitted = 0 // body before this is in out
  let statement = 0 // where the current declaration or rule starts
  let i = 0
  while (i < body.length) {
    const ch = body[i]
    if (ch === "'" || ch === '"') {
      i = skipString(body, i)
    } else if (ch === '(') {
      i = skipParens(body, i)
    } else if (ch === ';') {
      statement = ++i
    } else if (ch === '{') {
      const close = closingBrace(body, i)
      const prelude = body.slice(statement, i)
      const selectors = prelude.trim()
      const mapped = selectors.startsWith('@')
        ? prelude
        : prelude.replace(selectors, splitSelectorList(selectors).map(mapSelector).join(', '))
      out += body.slice(emitted, statement) + mapped + '{' + mapNestedSelectors(body.slice(i + 1, close), mapSelector) + '}'
      i = emitted = statement = close + 1
    } else {
      i++
    }
  }
  return out + body.slice(emitted)
}

/**
 * The body of a page's html or body rule, with the rules nested in it kept
 * inside the page root: `body { nav a {} }` meant `body nav a`, which top
 * level gets as `… body :where(.profile-template-root) nav a`, but nested
 * it stayed relative to body and reached the site's own nav (component
 * styling audit R6). `&:hover`, `&.dark` and a nested `body` are still
 * html or body, and what's nested in them is treated the same; nested
 * @media and the like too. Declarations are copied as written.
 */
function nestedInsidePage(body: string): string {
  let out = ''
  let emitted = 0
  let statement = 0
  let i = 0
  while (i < body.length) {
    const ch = body[i]
    if (ch === "'" || ch === '"') {
      i = skipString(body, i)
    } else if (ch === '(') {
      i = skipParens(body, i)
    } else if (ch === ';') {
      statement = ++i
    } else if (ch === '{') {
      const close = closingBrace(body, i)
      const prelude = body.slice(statement, i).trim()
      const inner = body.slice(i + 1, close)
      let rules: string
      if (prelude.startsWith('@')) {
        rules = `${prelude} {${nestedInsidePage(inner)}}`
      } else {
        const mapped = splitSelectorList(prelude).map(nestedUnderRoot)
        const roots = mapped.filter((m) => m.root).map((m) => m.selector)
        const inside = mapped.filter((m) => !m.root).map((m) => m.selector)
        rules = [
          inside.length > 0 ? `${inside.join(', ')} {${inner}}` : '',
          roots.length > 0 ? `${roots.join(', ')} {${nestedInsidePage(inner)}}` : '',
        ].filter(Boolean).join(' ')
      }
      out += `${body.slice(emitted, statement)} ${rules}`
      i = emitted = statement = close + 1
    } else {
      i++
    }
  }
  return out + body.slice(emitted)
}

/**
 * One selector nested in an html or body rule: whether it's still html or
 * body (`&:hover`, `body`), or else the same selector inside the page root.
 * What it picks out past html or body goes inside the root, as top level
 * (`> header` the page's top level; a sibling of body, `+ x`, is inside it).
 */
function nestedUnderRoot(selector: string): { selector: string; root: boolean } {
  const sel = selector.trim()
  const amp = lastTopLevel(sel, '&')
  const lead = amp === -1 ? sel.match(/^body(?![\w-])/i) : null
  if (amp === -1 && !lead) return { selector: `${INSIDE_PAGE} ${pastRoot(sel)}`, root: false }
  const end = compoundEnd(sel, amp === -1 ? 0 : amp)
  const rest = sel.slice(end).trim()
  if (!rest) return { selector: sel, root: true }
  return { selector: `${sel.slice(0, end)} ${INSIDE_PAGE} ${pastRoot(rest)}`, root: false }
}

/** `> x` stays a child of the page root; `+ x` and `~ x` go inside it */
const pastRoot = (rest: string) => rest.replace(/^[+~]\s*/, '')

/** The last index of `ch` outside parens, brackets and strings, or -1 */
function lastTopLevel(selector: string, ch: string): number {
  let found = -1
  for (let i = 0; i < selector.length; ) {
    const c = selector[i]
    if (c === "'" || c === '"') i = skipString(selector, i)
    else if (c === '(') i = skipParens(selector, i)
    else if (c === '[') i = selector.indexOf(']', i) === -1 ? selector.length : selector.indexOf(']', i) + 1
    else {
      if (c === ch) found = i
      i++
    }
  }
  return found
}

/** Where the compound selector holding index `at` ends */
function compoundEnd(selector: string, at: number): number {
  let i = at
  while (i < selector.length && !/[\s>+~]/.test(selector[i])) {
    const c = selector[i]
    if (c === "'" || c === '"') i = skipString(selector, i)
    else if (c === '(') i = skipParens(selector, i)
    else if (c === '[') i = selector.indexOf(']', i) === -1 ? selector.length : selector.indexOf(']', i) + 1
    else i++
  }
  return i
}

/** The index of the } that closes the { at `open` (or the end) */
function closingBrace(css: string, open: number): number {
  let depth = 0
  for (let i = open; i < css.length; ) {
    const ch = css[i]
    if (ch === "'" || ch === '"') {
      i = skipString(css, i)
      continue
    }
    if (ch === '(') {
      i = skipParens(css, i)
      continue
    }
    if (ch === '{') depth++
    if (ch === '}' && --depth === 0) return i
    i++
  }
  return css.length
}

/**
 * Transform every declaration inside qualified rules (NOT inside @keyframes /
 * @font-face, and NOT inside conditional group rules unless recurse is true).
 */
export function mapRuleDeclarations(
  css: string,
  mapDecl: (decl: string) => string,
  options: { recurseGroups?: boolean } = {}
): string {
  const GROUP_AT_RULES = new Set(['media', 'supports', 'container', 'layer', 'scope'])
  const statements = splitTopLevelStatements(css)
  const out = statements.map((s) => {
    if (s.kind === 'rule' && s.body !== undefined) {
      const decls = splitDeclarations(s.body).map(mapDecl)
      return { ...s, body: decls.length ? ` ${decls.join('; ')}; ` : '' }
    }
    if (
      options.recurseGroups &&
      s.kind === 'at' &&
      s.body !== undefined &&
      GROUP_AT_RULES.has(s.atName || '')
    ) {
      return { ...s, body: '\n' + mapRuleDeclarations(s.body, mapDecl, options) + '\n' }
    }
    return s
  })
  return serializeStatements(out)
}

/** Split a selector list on top-level commas (respects parens/strings). */
export function splitSelectorList(selectorList: string): string[] {
  const parts: string[] = []
  let current = ''
  let i = 0
  while (i < selectorList.length) {
    const ch = selectorList[i]
    if (ch === "'" || ch === '"') {
      const end = skipString(selectorList, i)
      current += selectorList.slice(i, end)
      i = end
      continue
    }
    if (ch === '(') {
      const end = skipParens(selectorList, i)
      current += selectorList.slice(i, end)
      i = end
      continue
    }
    if (ch === ',') {
      if (current.trim()) parts.push(current.trim().replace(/\s+/g, ' '))
      current = ''
      i++
      continue
    }
    current += ch
    i++
  }
  if (current.trim()) parts.push(current.trim().replace(/\s+/g, ' '))
  return parts
}

// ---------------------------------------------------------------------------
// low-level scanners
// ---------------------------------------------------------------------------

function atRuleName(prelude: string): string {
  const m = prelude.match(/^@([a-zA-Z-]+)/)
  return m ? m[1].toLowerCase() : ''
}

/** Remove comments without touching strings or url() contents. */
export function stripComments(css: string): string {
  let out = ''
  let i = 0
  while (i < css.length) {
    const ch = css[i]
    if (ch === "'" || ch === '"') {
      const end = skipString(css, i)
      out += css.slice(i, end)
      i = end
      continue
    }
    if (ch === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2)
      i = end === -1 ? css.length : end + 2
      continue
    }
    out += ch
    i++
  }
  return out
}

/** Given index of a quote char, return index just past the closing quote. */
function skipString(src: string, start: number): number {
  const quote = src[start]
  let i = start + 1
  while (i < src.length) {
    if (src[i] === '\\') {
      i += 2
      continue
    }
    if (src[i] === quote) return i + 1
    i++
  }
  return src.length
}

/** Given index of '(', return index just past the matching ')'. */
function skipParens(src: string, start: number): number {
  let depth = 0
  let i = start
  while (i < src.length) {
    const ch = src[i]
    if (ch === "'" || ch === '"') {
      i = skipString(src, i)
      continue
    }
    if (ch === '(') depth++
    if (ch === ')') {
      depth--
      if (depth === 0) return i + 1
    }
    i++
  }
  return src.length
}
