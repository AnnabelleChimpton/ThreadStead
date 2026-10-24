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
 * pages). Used as the exclusive lower boundary of the profile @scope below.
 * By attribute only: a page's own class="site-header" used to count as the
 * site's, and every rule for it and inside it was dead.
 */
export const SITE_CHROME_SELECTOR = '[data-site-chrome]'

// At-rules that are invalid or global inside @scope — hoisted above the block.
const GLOBAL_AT_RULES = new Set([
  'import', 'charset', 'namespace', 'font-face', 'keyframes', '-webkit-keyframes',
  '-moz-keyframes', 'property', 'page', 'counter-style', 'font-feature-values',
  'font-palette-values', 'view-transition', 'position-try',
])

/**
 * Wrap whole-page profile CSS in a donut scope — `@scope (html) to (chrome)` —
 * so it styles the profile but cannot match the site header, footer or other
 * chrome. Without this, presets that restyle `.nav-link` / `.site-footer`
 * pushed the user menu off-screen and left footer links unreadable.
 *
 * Selectors that name the root (`:root`, `html …`) become `:scope …`: inside
 * @scope, plain selectors only match descendants of the scope root.
 * Inherited properties (font, color) still flow into the chrome from body —
 * the chrome roots reset those themselves (styles/retro.css).
 */
export function scopeAwayFromSiteChrome(css: string): string {
  return wrapInChromeScope(clampZIndex(css), (sel) =>
    sel
      .replace(/^html(?![\w-])/, ':scope')
      .replace(/:root(?![\w-])/g, ':scope')
  )
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
 * Hoist the at-rules that can't live inside @scope, then wrap the rest in
 * the chrome donut with each selector rewritten by `scopeSelector`.
 */
function wrapInChromeScope(css: string, scopeSelector: (selector: string) => string): string {
  if (!css.trim()) return ''
  const hoisted: CSSStatement[] = []
  const scoped: CSSStatement[] = []
  for (const s of splitTopLevelStatements(css)) {
    const isGlobal = s.kind === 'at' && (GLOBAL_AT_RULES.has(s.atName || '') || s.body === undefined)
    ;(isGlobal ? hoisted : scoped).push(s)
  }
  if (scoped.length === 0) return serializeStatements(hoisted)

  const inner = mapSelectors(serializeStatements(scoped), scopeSelector, { authorScopes: true })
  const head = serializeStatements(hoisted)
  return `${head}${head ? '\n' : ''}@scope (html) to (${SITE_CHROME_SELECTOR}) {\n${inner}\n}`
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
  if (!css.includes('#')) return css
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
  if ((!fragment && !idName) || value.slice(fragment ? 1 : 0).startsWith(USER_CONTENT_PREFIX) || !value) return attribute
  const renamed = fragment ? `#${USER_CONTENT_PREFIX}${value.slice(1)}` : `${USER_CONTENT_PREFIX}${value}`
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
 * One selector of advanced-mode CSS, scoped under `@scope (html)` where
 * `:scope` is the html element. Everything below html and body is the
 * page's own HTML: those parts must be inside the page root, so a page's
 * `div {}`, `*`, `div:has(...)` or `.ts-page-frame` can't match the site's
 * wrappers around it (raising one put the page over the site's nav;
 * template audit 02 X2, 03 F6b):
 *   `html`, `:root`, `body` → themselves (`html:scope:is(html)`,
 *                             `:scope:is(html) body`)
 *   `body > header`, `body .x`, `html .x` → `… body :where(.profile-template-root) > header`
 *                             (the page's top level, as its author meant)
 *   `::selection` etc.     → the root and everything in body
 *   anything else, `*` included → `:scope body :where(.profile-template-root) …`
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
  if (overlay) return `:scope body ${PAGE_ROOT}${overlay[1]}`
  if (sel.startsWith('::')) return `:scope:root${sel}, :scope body ${sel}`
  if (sel.startsWith(PAGE_ROOT)) return `:scope body ${sel}`

  // The html and body compounds a selector starts with, and the rest
  const lead = sel.match(/^((?::root|html)(?![\w-])[^\s>+~]*)?\s*>?\s*(body(?![\w-])[^\s>+~]*)?\s*/i)!
  const [whole, rootCompound, bodyCompound] = lead
  if (!rootCompound && !bodyCompound) return `:scope body ${INSIDE_PAGE} ${sel}`
  // Classes, ids and attributes written on html or body are the page root's
  // (document-head.ts puts a pasted page's there); pseudo-classes stay put
  const root = rootCompound ? splitCompound(rootCompound) : null
  const body = bodyCompound ? splitCompound(bodyCompound) : null
  const onRoot = `${root?.moved ?? ''}${body?.moved ?? ''}`
  const top = root ? `${root.name}:scope:is(html)${root.kept}` : ':scope:is(html)'
  const bodyPart = body ? ` ${body.name}${body.kept}` : ''
  const rest = sel.slice(whole.length)
  // An effect moved onto the page root keeps its condition (moveWholePageEffects)
  if (rest.startsWith(PAGE_ROOT)) return `${top}${bodyPart} ${PAGE_ROOT}${onRoot}${rest.slice(PAGE_ROOT.length)}`
  if (rest) return `${top}${bodyPart} ${INSIDE_PAGE}${onRoot} ${rest}`
  // html or body itself, when the page root carries those classes
  const has = onRoot ? `:has(${INSIDE_PAGE}${onRoot})` : ''
  return `${top}${bodyPart}${has}`
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
 * visibility and opacity hide or fade it (template audit 10 #1).
 */
const WHOLE_PAGE_EFFECTS = /^(?:filter|backdrop-filter|transform|translate|rotate|scale|perspective|zoom|contain|will-change|visibility|opacity)$/i
const ROOT_OR_BODY = /^(?::root|html|body|html\s+body)$/i
/** html or body with a condition: `html:has(#dark:checked)`, `body.night`, `body:hover` */
const ROOT_OR_BODY_WHEN = /^(?::root|html|body)(?![\w-])[^\s>+~]*(?:\s*>?\s*body(?![\w-])[^\s>+~]*)?$/i

/**
 * "Do this to my whole page" on html or body (a vintage filter, a tilted
 * page, a checkbox dark-mode toggle on html:has(#dark:checked)) goes on the
 * page root instead, where it does exactly that; the rest of the rule stays
 * put. Rules with nested rules are left alone.
 */
export function moveWholePageEffects(css: string): string {
  if (!/(?:html|body|:root)/i.test(css)) return css
  const GROUP_AT_RULES = new Set(['media', 'supports', 'container', 'layer'])
  const out: CSSStatement[] = []
  for (const s of splitTopLevelStatements(css)) {
    if (s.kind === 'at' && s.body !== undefined && GROUP_AT_RULES.has(s.atName || '')) {
      out.push({ ...s, body: '\n' + moveWholePageEffects(s.body) + '\n' })
      continue
    }
    const selectors = s.kind === 'rule' ? splitSelectorList(s.prelude).map((selector) => selector.trim()) : []
    const onRoot = s.kind === 'rule' && s.body !== undefined && !s.body.includes('{') &&
      selectors.every((selector) => ROOT_OR_BODY_WHEN.test(selector))
    const declarations = onRoot ? splitDeclarations(s.body!) : []
    const effects = declarations.filter((d) => WHOLE_PAGE_EFFECTS.test(d.slice(0, d.indexOf(':')).trim()))
    if (effects.length === 0) {
      out.push(s)
      continue
    }
    const rest = declarations.filter((d) => !effects.includes(d))
    if (rest.length > 0) out.push({ ...s, body: ` ${rest.join('; ')}; ` })
    // A condition goes with it: html:has(#dark:checked) inverts the page, not the nav
    const prelude = selectors.every((selector) => ROOT_OR_BODY.test(selector))
      ? PAGE_ROOT
      : selectors.map((selector) => `${selector} ${PAGE_ROOT}`).join(', ')
    out.push({ kind: 'rule', prelude, body: ` ${effects.join('; ')}; ` })
  }
  return serializeStatements(out)
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
 * - Everything is scoped away from the site header, footer and other chrome,
 *   the way standard-layout CSS already is, so a page's `nav a {}` or
 *   `h1::after {}` can't restyle or fake the site's own navigation.
 */
export function transformAdvancedCss(
  css: string,
  options: { fontImports?: readonly string[]; bodyCss?: string; styleCss?: string } = {}
): string {
  // <body bgcolor…> rules go first so the page's own CSS wins over them
  const source = [options.bodyCss, css, options.styleCss].filter(Boolean).join('\n')
  const { imports, rest } = extractImports(renameCollidingKeyframes(prefixUserContentIds(source)))
  const allImports = [
    ...(options.fontImports ?? []).filter((line) => !imports.includes(line)),
    ...imports,
  ]
  // A page written for light and dark (light-dark(), prefers-color-scheme)
  // says so, before its own rules, so they can say otherwise: with nothing
  // declared, light-dark() and form controls stayed light (template audit 13 #9)
  const schemes = /light-dark\(|prefers-color-scheme/i.test(rest) && !/(?<![\w-])color-scheme\s*:/i.test(rest) ? ':root { color-scheme: light dark; }\n' : ''
  const scoped = wrapInChromeScope(namePageLayers(moveWholePageEffects(schemes + rest)), scopeAdvancedSelector)
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
  const out = statements.map((s) => {
    // `authorScopes`: a page's own @scope (.card) { img {} }: only its root
    // selector is mapped; the rules inside are relative to it (template audit 01 #16b)
    if (options.authorScopes && s.kind === 'at' && s.atName === 'scope') {
      const open = s.prelude.indexOf('(')
      if (open === -1) return s
      const close = skipParens(s.prelude, open)
      const root = s.prelude.slice(open + 1, close - 1)
      return { ...s, prelude: `${s.prelude.slice(0, open + 1)}${splitSelectorList(root).map(mapSelector).join(', ')}${s.prelude.slice(close - 1)}` }
    }
    if (s.kind === 'rule') {
      const mapped = splitSelectorList(s.prelude).map(mapSelector).join(', ')
      // `nested`: rules nested inside this one (CSS nesting) too
      const body = options.nested && s.body !== undefined ? mapNestedSelectors(s.body, mapSelector) : s.body
      return { ...s, prelude: mapped, body }
    }
    if (recurseGroups && s.kind === 'at' && s.body !== undefined && GROUP_AT_RULES.has(s.atName || '')) {
      return { ...s, body: '\n' + mapSelectors(s.body, mapSelector, options) + '\n' }
    }
    return s
  })
  return serializeStatements(out)
}

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
