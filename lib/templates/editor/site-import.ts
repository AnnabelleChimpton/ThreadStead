/**
 * "Bring in my page from my site" (the HTML editor's Starter pages): a
 * verified site's homepage (Settings → Your sites, lib/rings/sites.ts), its
 * own stylesheets put in <style> tags, every address made absolute so the
 * pictures, links and fonts keep coming from the site. The editor takes it
 * the way it takes a pasted page (putInTemplate): the <style>s move to the
 * CSS tab, and scripts go when it's compiled, as any pasted page's do.
 *
 * Only the owner's own verified site, never an API key: a Neocities key can
 * write to the site.
 */
import type { ExternalSite } from '@prisma/client'
import { ACCEPT_HTML, FetchError, type Fetcher } from '@/lib/indie-index/http'
import { siteRefOf } from '@/lib/indie-index/site-key'
import { tokenizeSource, type SourceToken } from '@/lib/templates/compilation/source-scan'
import { MAX_CSS_CHARS, MAX_TEMPLATE_CHARS } from '@/lib/templates/limits'

const ACCEPT_CSS = 'text/css, */*;q=0.1'
/** Room past the caps for markup the editor takes out (the <style>s) */
const PAGE_BYTES = MAX_TEMPLATE_CHARS * 2
const MAX_STYLESHEETS = 8

/** Attributes that hold an address, by what reads them */
const URL_ATTRIBUTES = new Set(['src', 'href', 'background', 'poster', 'data', 'action', 'cite', 'longdesc'])

export type SiteImport = { ok: true; html: string } | { ok: false; reason: string }

/** `value` against `base`, unless it's already a whole address, a #fragment or data: */
function absolute(value: string, base: string): string {
  const trimmed = value.trim()
  if (!trimmed || trimmed.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return value
  try {
    return new URL(trimmed, base).href
  } catch {
    return value
  }
}

/** The addresses in CSS (url(…) and @import "…") made absolute against the stylesheet's own */
export function absoluteCss(css: string, base: string): string {
  return css
    .replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi, (whole, quote: string, url: string) => `url(${quote}${absolute(url, base)}${quote})`)
    .replace(/@import\s+(["'])([^"']+)\1/gi, (whole, quote: string, url: string) => `@import ${quote}${absolute(url, base)}${quote}`)
}

const attribute = (token: Extract<SourceToken, { type: 'open' }>, name: string) =>
  token.attributes.find((a) => a.name.toLowerCase() === name)

/** A page's HTML with its addresses made absolute against `base` (and its own <base href>) */
export function absoluteHtml(html: string, pageUrl: string): string {
  const tokens = tokenizeSource(html)
  const baseTag = tokens.find((t): t is Extract<SourceToken, { type: 'open' }> => t.type === 'open' && t.name.toLowerCase() === 'base')
  const base = baseTag && attribute(baseTag, 'href')?.value ? absolute(attribute(baseTag, 'href')!.value!, pageUrl) : pageUrl
  const edits: Array<{ start: number; end: number; text: string }> = []
  tokens.forEach((token, i) => {
    if (token.type !== 'open') return
    for (const attr of token.attributes) {
      const name = attr.name.toLowerCase()
      if (attr.value === undefined) continue
      let value = attr.value
      if (URL_ATTRIBUTES.has(name)) value = absolute(value, base)
      else if (name === 'srcset') value = value.split(',').map((part) => part.trim().replace(/^\S+/, (url) => absolute(url, base))).join(', ')
      else if (name === 'style') value = absoluteCss(value, base)
      if (value !== attr.value) {
        const at = html.indexOf(attr.value, attr.start)
        edits.push({ start: at, end: at + attr.value.length, text: value.replace(/"/g, '&quot;') })
      }
    }
    // A <style>'s CSS, against the page
    const next = tokens[i + 1]
    if (token.name.toLowerCase() === 'style' && next?.type === 'text') {
      const css = html.slice(next.start, next.end)
      const done = absoluteCss(css, base)
      if (done !== css) edits.push({ start: next.start, end: next.end, text: done })
    }
  })
  return applyEdits(html, edits)
}

function applyEdits(text: string, edits: Array<{ start: number; end: number; text: string }>): string {
  let out = text
  for (const edit of [...edits].sort((a, b) => b.start - a.start)) out = out.slice(0, edit.start) + edit.text + out.slice(edit.end)
  return out
}

/** Fetch the site's homepage and put its own stylesheets in <style>s. Never throws. */
export async function importSitePage(site: Pick<ExternalSite, 'url' | 'siteRef'>, fetcher: Fetcher): Promise<SiteImport> {
  let page
  try {
    page = await fetcher({ url: site.url, accept: ACCEPT_HTML, maxBytes: PAGE_BYTES })
  } catch (error) {
    return { ok: false, reason: error instanceof FetchError ? `I couldn't get your page (${error.message}).` : "I couldn't get your page." }
  }
  if (page.status >= 400) return { ok: false, reason: `Your page answered ${page.status}.` }
  // As when it was verified: a page that sends us elsewhere isn't this site's
  if (siteRefOf(page.url)?.key !== site.siteRef) return { ok: false, reason: "Your page sent me on to another site, so I didn't bring it in." }

  const html = absoluteHtml(page.body, page.url)
  // Its own stylesheets come with it, as <style>s with the same media; a
  // stylesheet from elsewhere stays a <link> (Google Fonts become @imports
  // in the CSS tab, others are listed under the code)
  const links = tokenizeSource(html)
    .filter((t): t is Extract<SourceToken, { type: 'open' }> =>
      t.type === 'open' && t.name.toLowerCase() === 'link' &&
      (attribute(t, 'rel')?.value ?? '').toLowerCase().split(/\s+/).includes('stylesheet') &&
      siteRefOf(attribute(t, 'href')?.value)?.key === site.siteRef)
    .slice(0, MAX_STYLESHEETS)
  const edits = await Promise.all(links.map(async (link) => {
    const href = attribute(link, 'href')!.value!
    try {
      const sheet = await fetcher({ url: href, accept: ACCEPT_CSS, maxBytes: MAX_CSS_CHARS * 2 })
      if (sheet.status >= 400 || siteRefOf(sheet.url)?.key !== site.siteRef) return null
      const media = attribute(link, 'media')?.value
      const open = media ? `<style media="${media.replace(/"/g, '&quot;')}">` : '<style>'
      return { start: link.start, end: link.end, text: `${open}\n${absoluteCss(sheet.body, sheet.url).replace(/<\/style/gi, '<\\/style')}\n</style>` }
    } catch {
      return null
    }
  }))
  return { ok: true, html: applyEdits(html, edits.filter((e): e is NonNullable<typeof e> => e !== null)) }
}
