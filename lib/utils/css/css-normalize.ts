/**
 * A page's CSS, rewritten so that css-transform.ts's scanners read it the
 * way a browser does. Where they read it differently, a page's CSS escaped
 * its page: what the transform took for the inside of a string, a url() or
 * an escape, the browser took for the end of a rule, and the next "rule"
 * reached the site's nav unscoped (bug bash 2026-10-26, P0 #2). So:
 *
 * - Comments go.
 * - A string ends at a line break, as in a browser (a "bad string"), and
 *   is closed there; one left open at the end is closed too.
 * - Escapes outside strings: letters, `_`, and `-` and digits where they
 *   can't change what kind of name it is, are written plainly, so `@\6d edia`
 *   is `@media` and `z-inde\78` is `z-index` to every check after this. The
 *   rest become `\hex ` (with the space), so no `\` is ever followed by a
 *   brace, quote or bracket.
 * - An unquoted url(…) is read as one token, as the browser reads it; one
 *   the browser would refuse becomes url(about:invalid).
 * - A ), ] or } that closes nothing (the browser reads it as plain text) is
 *   escaped, so the brackets left all pair up; what's still open at the
 *   end is closed, as the browser closes it.
 *
 * What comes out means the same to a browser, apart from what it would
 * have thrown away anyway. Running it twice changes nothing.
 */
export function normalizeCss(input: string): string {
  // The browser's own first step: one kind of line break, no NULs
  const css = input.replace(/\r\n?|\f/g, '\n').replace(/\0/g, '�')
  const parts: string[] = []
  /** The last TAIL characters written, for the name checks */
  const tail = () => {
    let text = ''
    for (let k = parts.length - 1; k >= 0 && text.length < TAIL; k--) text = parts[k].slice(-TAIL) + text
    return text.slice(-TAIL)
  }
  const open: string[] = [] // the closer each open bracket waits for
  const special = /[/"'\\()[\]{}]/g
  let i = 0
  while (i < css.length) {
    // Plain text up to the next character that matters, in one piece
    special.lastIndex = i
    const next = special.exec(css)?.index ?? css.length
    if (next > i) {
      parts.push(css.slice(i, next))
      i = next
      continue
    }
    const ch = css[i]
    if (ch === '/') {
      if (css[i + 1] === '*') {
        const close = css.indexOf('*/', i + 2)
        i = close === -1 ? css.length : close + 2
      } else {
        parts.push(ch)
        i++
      }
    } else if (ch === '"' || ch === "'") {
      const string = readString(css, i)
      parts.push(string.text)
      i = string.end
    } else if (ch === '\\') {
      const escape = readEscape(css, i)
      parts.push(escape ? plainOrEscaped(escape.codePoint, tail(), css[escape.end] ?? '') : '\\5c ')
      i = escape ? escape.end : i + 1
    } else if (ch === '(' && isUrlFunction(tail())) {
      const url = readUnquotedUrl(css, i + 1)
      if (url) {
        parts.push(url.text)
        i = url.end
      } else {
        parts.push('(')
        open.push(')')
        i++
      }
    } else if (ch === '(' || ch === '[' || ch === '{') {
      parts.push(ch)
      open.push(CLOSER[ch])
      i++
    } else {
      // ), ] or }
      if (open[open.length - 1] === ch) {
        open.pop()
        parts.push(ch)
      } else {
        parts.push(hexEscape(ch.codePointAt(0)!))
      }
      i++
    }
  }
  return parts.join('') + open.reverse().join('')
}

const CLOSER: Record<string, string> = { '(': ')', '[': ']', '{': '}' }

/** How much of what's written the name checks look back at: a regex over all of it made a big file take seconds */
const TAIL = 256

const hexEscape = (codePoint: number) => `\\${codePoint.toString(16)} `

/** A string from its opening quote: closed at a line break or the end, as the browser ends it */
function readString(css: string, start: number): { text: string; end: number } {
  const quote = css[start]
  let i = start + 1
  while (i < css.length) {
    const ch = css[i]
    if (ch === quote) return { text: css.slice(start, i + 1), end: i + 1 }
    if (ch === '\n') break
    // An escaped line break carries the string on; a \ at the very end is nothing
    if (ch === '\\') {
      if (i + 1 >= css.length) return { text: css.slice(start, i) + quote, end: css.length }
      i += 2
      continue
    }
    i++
  }
  return { text: css.slice(start, i) + quote, end: i }
}

/** The code point a \ escape outside a string stands for, or null for a \ before a line break or the end */
function readEscape(css: string, start: number): { codePoint: number; end: number } | null {
  const next = css[start + 1]
  if (next === undefined || next === '\n') return null
  const hex = /^[0-9a-fA-F]{1,6}/.exec(css.slice(start + 1, start + 7))
  if (!hex) {
    const codePoint = css.codePointAt(start + 1)!
    return { codePoint, end: start + 1 + (codePoint > 0xffff ? 2 : 1) }
  }
  let end = start + 1 + hex[0].length
  if (/[ \t\n]/.test(css[end] ?? '')) end++
  const value = parseInt(hex[0], 16)
  const valid = value !== 0 && value <= 0x10ffff && !(value >= 0xd800 && value <= 0xdfff)
  return { codePoint: valid ? value : 0xfffd, end }
}

/** The name (identifier) `out` ends in, plain characters and \hex escapes */
const NAME_SO_FAR = /(?:[\w\-\u0080-￿]|\\[0-9a-f]{1,6} )+$/

/**
 * An escaped character written plainly where that can't change what the
 * browser reads: a letter or `_` anywhere, `-` inside a name or where a
 * name starts with it (`\2d \2d x` is `--x`; `\2d 5` is not `-5`), a digit
 * inside a name that has started with something other than `-`.
 */
function plainOrEscaped(codePoint: number, out: string, after: string): string {
  const ch = String.fromCodePoint(codePoint)
  const name = NAME_SO_FAR.exec(out)?.[0] ?? ''
  if (/^[A-Za-z_]$/.test(ch)) return ch
  if (ch === '-' && (name !== '' || /^[A-Za-z_\-\\\u0080-￿]$/.test(after))) return ch
  if (/^[0-9]$/.test(ch) && name !== '' && !/^-+$/.test(name)) return ch
  return hexEscape(codePoint)
}

/** `url` just written, as a name of its own (not `myurl`, not after an escape) */
function isUrlFunction(out: string): boolean {
  return /(?:^|[^\w\-\u0080-￿\\])url$/i.test(out) && !/\\[0-9a-f]{1,6} url$/i.test(out)
}

/**
 * An unquoted url(…) from just past its "(": the browser's one url token,
 * to its ")". A quote, "(" or space inside, or a control character, makes
 * it a bad url, which the browser skips to its ")" (escapes and all) and
 * then throws away. Null when it's url("…"), a function holding a string.
 */
function readUnquotedUrl(css: string, start: number): { text: string; end: number } | null {
  let i = start
  while (/[ \t\n]/.test(css[i] ?? '')) i++
  if (css[i] === '"' || css[i] === "'") return null
  let value = ''
  let bad = false
  while (i < css.length && css[i] !== ')') {
    const ch = css[i]
    if (ch === '\\') {
      const escape = readEscape(css, i)
      if (escape) {
        value += hexEscape(escape.codePoint)
        i = escape.end
        continue
      }
      bad = true
      i++
    } else if (/[ \t\n]/.test(ch)) {
      while (/[ \t\n]/.test(css[i] ?? '')) i++
      if (i < css.length && css[i] !== ')') bad = true
    } else {
      if (ch === '"' || ch === "'" || ch === '(' || /[\u0000-\u0008\u000b\u000e-\u001f\u007f]/.test(ch)) bad = true
      value += ch
      i++
    }
  }
  return { text: `(${bad ? 'about:invalid' : value})`, end: Math.min(i + 1, css.length) }
}
