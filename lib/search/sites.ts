/**
 * Small helpers for off-site URLs and text (Surprise Me, Indie Index).
 * Pure, no I/O.
 */

/** Hostname without a leading `www.`, or '' for a URL that doesn't parse. */
export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase()
  } catch {
    return ''
  }
}

/** Only http(s) links are ever rendered as hrefs. */
export function isWebUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" }

/** Titles from other sites come with entities and stray tags ("Tom&#39;s <b>blog</b>"). */
export function cleanText(text: string | null | undefined): string {
  return (text ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (match, name: string) => {
      if (name in ENTITIES) return ENTITIES[name]
      if (name[0] === '#') {
        const code = name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10)
        return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : match
      }
      return match
    })
    .replace(/\s+/g, ' ')
    .trim()
}
