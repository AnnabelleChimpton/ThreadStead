/**
 * Webmention addresses (design/webmentions/SCOPE.md). Client-safe: the post
 * page puts the endpoint in its <head>.
 */
import { getSiteBaseUrl } from '@/lib/config/site-url'

/** Where outside sites send webmentions. Always the main site: resident subdomains refuse POSTs. */
export const webmentionEndpoint = (baseUrl = getSiteBaseUrl()) => `${baseUrl.replace(/\/+$/, '')}/api/webmention`

const POST_PATH = /^\/resident\/[^/]+\/post\/([^/]+)\/?$/

/** "www.example.com." → "example.com", lowercased; null when it isn't a URL. */
export function bareHost(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/\.$/, '').replace(/^www\./, '')
  } catch {
    return null
  }
}

/**
 * The id of the post a URL points at, when it's a post page on this site
 * (http or https, with or without www, any query). By id alone: the
 * username in the path may be an old one.
 */
export function postIdOf(url: string, baseUrl = getSiteBaseUrl()): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
  if (bareHost(parsed.href) !== bareHost(baseUrl)) return null
  const id = parsed.pathname.match(POST_PATH)?.[1]
  if (!id) return null
  try {
    return decodeURIComponent(id)
  } catch {
    return null
  }
}
