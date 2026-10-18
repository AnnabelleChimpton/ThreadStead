/**
 * Indie Index site keys (SEARCH_PLAN.md §3.5). Pure helpers, no I/O.
 *
 * A Site is one person's site, keyed by its host without `www.`. On shared
 * servers that give each user a `/~name/` home (tilde.club, tilde.town…),
 * the key is `host/~name`, so two people there stay two sites. A few blog
 * hosts put each person under a path the same way (write.as/name).
 */

import { EXACT_ONLY } from './blocklist'

export interface SiteRef {
  /** `jvns.ca`, `tilde.club/~anna`, `example.com:8080` */
  key: string
  /** Hostname (and non-default port) without `www.`, lowercased. */
  host: string
  /** The site's homepage: origin plus `/~name/` when there is one. */
  url: string
}

const TILDE_SEGMENT = /^~[a-z0-9._-]+$/i
/** Hosts where the first path segment is the person: write.as/name. */
const PATH_TENANT_HOSTS = new Set(['write.as', 'world.hey.com'])
const TENANT_SEGMENT = /^[a-z0-9._-]+$/i
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/

/**
 * The site a URL belongs to, or null for anything that can't be a public
 * personal site: non-http(s), IP literals, single-label hosts (`localhost`,
 * `intranet`), and `.local`/`.localhost`/`.internal`/`.test` names.
 * (Fetching re-checks every address with lib/utils/security/ssrf.ts.)
 */
export function siteRefOf(raw: string | null | undefined): SiteRef | null {
  if (!raw) return null
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null

  const hostname = url.hostname.toLowerCase().replace(/\.$/, '')
  if (!hostname.includes('.') || hostname.startsWith('[') || IPV4.test(hostname)) return null
  if (/\.(local|localhost|internal|test|invalid|example)$/.test(hostname)) return null

  const bare = hostname.replace(/^www\./, '')
  const host = url.port ? `${bare}:${url.port}` : bare
  const origin = `${url.protocol}//${hostname}${url.port ? `:${url.port}` : ''}`

  const first = url.pathname.split('/')[1] ?? ''
  if (TILDE_SEGMENT.test(first) || (PATH_TENANT_HOSTS.has(bare) && TENANT_SEGMENT.test(first))) {
    const person = first.toLowerCase()
    return { key: `${host}/${person}`, host, url: `${origin}/${person}/` }
  }
  return { key: host, host, url: `${origin}/` }
}

/**
 * True when the host is on the blocklist, directly or as a subdomain
 * (`m.youtube.com` is covered by `youtube.com`), except for hosts that give
 * each person a subdomain (EXACT_ONLY). Blocklist entries are bare domains,
 * as in BlockedSite.domain.
 */
export function isBlockedHost(host: string, blocked: ReadonlySet<string>): boolean {
  const bare = host.toLowerCase().replace(/:\d+$/, '').replace(/^www\./, '')
  let name = bare
  for (;;) {
    // tumblr.com blocks tumblr.com itself, not person.tumblr.com.
    if (blocked.has(name) && (name === bare || !EXACT_ONLY.has(name))) return true
    const dot = name.indexOf('.')
    if (dot < 0 || name.indexOf('.', dot + 1) < 0) return false
    name = name.slice(dot + 1)
  }
}

/**
 * True when an opt-out covers this site: its own key, or its bare host
 * (robots.txt opt-outs are host-wide).
 */
export function isOptedOut(ref: Pick<SiteRef, 'key' | 'host'>, optOuts: ReadonlySet<string>): boolean {
  return optOuts.has(ref.key) || optOuts.has(ref.host)
}
