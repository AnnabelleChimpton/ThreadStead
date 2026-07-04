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
 * Transform every qualified rule's selector list, recursing into conditional
 * group at-rules (@media, @supports, @container, @layer blocks) and leaving
 * everything else (@keyframes, @font-face, @page, statement at-rules)
 * untouched.
 */
export function mapSelectors(
  css: string,
  mapSelector: (selector: string) => string,
  options: { recurseGroups?: boolean } = {}
): string {
  const recurseGroups = options.recurseGroups !== false
  const GROUP_AT_RULES = new Set(['media', 'supports', 'container', 'layer', 'scope'])
  const statements = splitTopLevelStatements(css)
  const out = statements.map((s) => {
    if (s.kind === 'rule') {
      const mapped = splitSelectorList(s.prelude).map(mapSelector).join(', ')
      return { ...s, prelude: mapped }
    }
    if (recurseGroups && s.kind === 'at' && s.body !== undefined && GROUP_AT_RULES.has(s.atName || '')) {
      return { ...s, body: '\n' + mapSelectors(s.body, mapSelector, options) + '\n' }
    }
    return s
  })
  return serializeStatements(out)
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
