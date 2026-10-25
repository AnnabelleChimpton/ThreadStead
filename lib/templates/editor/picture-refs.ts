/**
 * The pictures a page's code points at, and putting new addresses in their
 * place: for the HTML editor's "upload several at once" (each upload takes
 * the place of a picture with the same file name: cat.gif, images/cat.gif,
 * ./cat.GIF) and "copy the pictures from my site here".
 *
 * A picture is an address ending .gif, .png, .jpg, .jpeg or .webp, in an
 * HTML address attribute (src, href, background, poster, data), a srcset,
 * a style="" or <style>, or a url() in the CSS. Only those addresses
 * change; everything else in the code stays exactly as written.
 */
import { tokenizeSource } from '@/lib/templates/compilation/source-scan'
import { siteRefOf } from '@/lib/indie-index/site-key'

export type CodeKind = 'html' | 'css'

const PICTURE_PATH = /\.(gif|png|jpe?g|webp)$/i
const URL_ATTRIBUTES = new Set(['src', 'href', 'background', 'poster', 'data'])
const CSS_URL = /url\(\s*(["']?)([^"')]+)\1\s*\)/gi

/** Its path ends like a picture's, ignoring ?query and #fragment */
export function isPicture(url: string): boolean {
  return PICTURE_PATH.test(url.trim().split(/[?#]/)[0])
}

/** "cat.gif" for cat.gif, images/Cat.GIF, ./cat.gif?v=2 or https://…/cat.gif */
export function pictureName(url: string): string {
  const path = url.trim().split(/[?#]/)[0]
  const last = path.split('/').pop() || ''
  try {
    return decodeURIComponent(last).toLowerCase()
  } catch {
    return last.toLowerCase()
  }
}

/** Written against the page itself: no scheme, not //host, not #fragment */
export function isRelative(url: string): boolean {
  const u = url.trim()
  return !!u && !/^[a-z][a-z0-9+.-]*:/i.test(u) && !u.startsWith('//') && !u.startsWith('#')
}

function rewriteCss(css: string, to: (url: string) => string | null): string {
  return css.replace(CSS_URL, (whole, quote: string, url: string) => {
    if (!isPicture(url)) return whole
    const next = to(url.trim())
    return next === null ? whole : `url(${quote}${next}${quote})`
  })
}

/**
 * The code with each picture address `to` gives a new one for replaced
 * (null leaves it). HTML's style="" and <style> are CSS inside it.
 */
export function rewritePictures(code: string, kind: CodeKind, to: (url: string) => string | null): string {
  if (kind === 'css') return rewriteCss(code, to)
  const tokens = tokenizeSource(code)
  const edits: Array<{ start: number; end: number; text: string }> = []
  const forAttribute = (url: string) => {
    const next = isPicture(url) ? to(url.trim()) : null
    return next === null ? url : next.replace(/"/g, '&quot;')
  }
  tokens.forEach((token, i) => {
    if (token.type !== 'open') return
    for (const attr of token.attributes) {
      if (attr.value === undefined) continue
      const name = attr.name.toLowerCase()
      let value = attr.value
      if (URL_ATTRIBUTES.has(name)) value = forAttribute(value)
      else if (name === 'srcset') value = value.replace(/(^|,)(\s*)(\S+)/g, (whole, comma: string, space: string, url: string) => `${comma}${space}${forAttribute(url)}`)
      else if (name === 'style') value = rewriteCss(value, to)
      if (value !== attr.value) {
        const at = code.indexOf(attr.value, attr.start)
        edits.push({ start: at, end: at + attr.value.length, text: value })
      }
    }
    const next = tokens[i + 1]
    if (token.name.toLowerCase() === 'style' && next?.type === 'text') {
      const css = code.slice(next.start, next.end)
      const done = rewriteCss(css, to)
      if (done !== css) edits.push({ start: next.start, end: next.end, text: done })
    }
  })
  let out = code
  for (const edit of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, edit.start) + edit.text + out.slice(edit.end)
  return out
}

/** Every picture address in the code, once each, in order */
export function picturesIn(code: string, kind: CodeKind): string[] {
  const found = new Set<string>()
  rewritePictures(code, kind, (url) => {
    found.add(url)
    return null
  })
  return [...found]
}

/**
 * Uploads matched to the page's pictures by file name. A relative address
 * matches (that's how a page written for Neocities points at its own
 * files), and so does one on the resident's own sites (`ownSites`, their
 * site keys: an imported page's addresses were made absolute). Anyone
 * else's picture with the same name is left alone.
 */
export function byFileName(uploads: Array<{ name: string; url: string }>, ownSites: Set<string>) {
  const named = new Map<string, string>()
  for (const upload of uploads) {
    const name = pictureName(upload.name)
    if (!named.has(name)) named.set(name, upload.url)
  }
  const used = new Set<string>()
  const to = (url: string) => {
    const name = pictureName(url)
    const next = named.get(name)
    if (!next || next === url) return null
    if (!isRelative(url) && !ownSites.has(siteRefOf(url)?.key ?? '')) return null
    used.add(name)
    return next
  }
  return { to, used }
}

/** The page's pictures that still load from one of the resident's own sites */
export function picturesOnOwnSites(html: string, css: string, ownSites: Set<string>): string[] {
  if (ownSites.size === 0) return []
  return [...new Set([...picturesIn(html, 'html'), ...picturesIn(css, 'css')])]
    .filter((url) => ownSites.has(siteRefOf(url)?.key ?? ''))
}
