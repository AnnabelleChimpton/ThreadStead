/**
 * Off-site results (Indie Index + wider web), shared by the /search page.
 * Pure helpers, no I/O.
 */

/** One row in "From the indie web" or "From the wider web". */
export interface SiteResult {
  url: string
  title: string
  snippet?: string
  /** Hostname without `www.`, shown under the title. */
  domain: string
}

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

/**
 * Keep the first (best-ranked) result per domain. The index stores pages,
 * not sites, so one site used to fill a whole page of results.
 */
export function onePerDomain<T extends { url: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const domain = domainOf(item.url)
    if (!domain || seen.has(domain)) return false
    seen.add(domain)
    return true
  })
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" }

/** Engines send titles with entities and stray tags ("Tom&#39;s <b>blog</b>"). */
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

/** Normalise Indie Index or web-engine rows: http(s) only, cleaned text, one per domain. */
export function toSiteResults(
  rows: Array<{ url?: string | null; title?: string | null; description?: string | null; snippet?: string | null }>
): SiteResult[] {
  const results: SiteResult[] = []
  for (const row of rows) {
    const url = row.url ?? ''
    if (!isWebUrl(url)) continue
    const domain = domainOf(url)
    results.push({
      url,
      domain,
      title: cleanText(row.title) || domain,
      snippet: cleanText(row.snippet ?? row.description) || undefined,
    })
  }
  return onePerDomain(results)
}
