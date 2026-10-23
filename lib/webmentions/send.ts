/**
 * Sending webmentions (design/webmentions/SCOPE.md §2): when a resident
 * saves a public post that links to other sites, tell the ones that take
 * webmentions, once. Best effort: no retries, nothing stored. A removed
 * link is told too (so the site can drop it). Deleting a post or making it
 * private sends nothing; the page no longer links, and sites drop it when
 * they look again.
 */
import { isIP } from 'net'
import type { PrismaClient } from '@prisma/client'
import { ACCEPT_HTML, createHttpFetcher, type Fetcher, type FetchResponse } from '@/lib/indie-index/http'
import { absoluteUrl, attributesOf, extractLinks } from '@/lib/indie-index/html'
import { loadBlockedSet } from '@/lib/indie-index/blocklist'
import { isBlockedHost } from '@/lib/indie-index/site-key'
import { MODERATION_SELECT, isHidden } from '@/lib/domain/users/moderation'
import { getSiteBaseUrl } from '@/lib/config/site-url'
import { botUserAgent } from '@/lib/indie-index/public'
import { assertPublicUrl } from '@/lib/utils/security/ssrf'
import { checkRateLimit } from '@/lib/server/http/rate-limit'
import { sendGate } from './gate'
import { bareHost } from './urls'

/** Sites told per save. */
export const MAX_TARGETS = 20

const PAGE_BYTES = 512 * 1024

/** POSTs a form and returns the status. Throws on unsafe URLs and network errors. */
export type FormPoster = (url: string, form: Record<string, string>) => Promise<number>

/** The real FormPoster: SSRF-checked, no redirects followed, the body ignored. */
export function createFormPoster({
  userAgent,
  timeoutMs = 10_000,
  resolve,
}: {
  userAgent: string
  timeoutMs?: number
  resolve?: Parameters<typeof assertPublicUrl>[1]
}): FormPoster {
  return async (url, form) => {
    await assertPublicUrl(url, resolve)
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'User-Agent': userAgent, 'Content-Type': 'application/x-www-form-urlencoded', Accept: '*/*' },
      body: new URLSearchParams(form).toString(),
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
    })
    await res.body?.cancel().catch(() => {})
    return res.status
  }
}

/** The outside links in a post's HTML worth telling: no duplicates, not this site, not big platforms. */
export function linksToTell(html: string, postUrl: string, { baseUrl, blocked }: { baseUrl: string; blocked: ReadonlySet<string> }): string[] {
  const ours = bareHost(baseUrl)
  const out = new Set<string>()
  for (const { href } of extractLinks(html, postUrl)) {
    const host = bareHost(href)
    if (!host || !ours || host === ours || host.endsWith(`.${ours}`) || isBlockedHost(host, blocked)) continue
    out.add(href)
  }
  return [...out]
}

const isWebmentionRel = (rel: string | undefined) => (rel ?? '').toLowerCase().split(/\s+/).includes('webmention')

/**
 * A page's webmention endpoint (spec §3.1.2): the first Link header with
 * rel="webmention", else the first <link> or <a> with it. Relative to the
 * page's final URL; an empty href is the page itself.
 */
export function findEndpoint(res: Pick<FetchResponse, 'url' | 'headers' | 'body'>): string | null {
  for (const part of (res.headers.get('link') ?? '').split(/,(?=\s*<)/)) {
    const m = part.match(/<([^>]*)>(.*)/)
    const rel = m?.[2].match(/;\s*rel\s*=\s*(?:"([^"]*)"|([^\s;,]+))/i)
    if (m && rel && isWebmentionRel(rel[1] ?? rel[2])) return endpointUrl(m[1], res.url)
  }
  const html = res.body.replace(/<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
  for (const tag of html.match(/<(?:link|a)\b[^>]*>/gi) ?? []) {
    const attrs = attributesOf(tag)
    if ('href' in attrs && isWebmentionRel(attrs.rel)) return endpointUrl(attrs.href, res.url)
  }
  return null
}

function endpointUrl(href: string, pageUrl: string): string | null {
  return href.trim() === '' ? pageUrl : absoluteUrl(href, pageUrl)
}

/**
 * Whether we'll POST to an endpoint a page advertised: a host name on the
 * usual port, never this site. No IP addresses or other ports, so a page
 * can't aim our POSTs at loopback or another service on the server (a
 * rebinding host name could slip past the SSRF check between its lookup
 * and fetch's; this keeps what it could reach to ordinary web ports).
 */
export function isPostableEndpoint(endpoint: string, source: string): boolean {
  let url: URL
  try {
    url = new URL(endpoint)
  } catch {
    return false
  }
  const host = bareHost(endpoint)
  const ours = bareHost(source)
  if (!host || !ours || host === ours || host.endsWith(`.${ours}`)) return false
  return url.port === '' && !isIP(url.hostname.replace(/^\[|\]$/g, ''))
}

export type SendOutcome = 'sent' | 'no_endpoint' | 'failed'

/** Discover the target's endpoint and send one webmention. Never throws. */
export async function sendWebmention(fetcher: Fetcher, post: FormPoster, source: string, target: string): Promise<SendOutcome> {
  try {
    const page = await fetcher({ url: target, accept: ACCEPT_HTML, maxBytes: PAGE_BYTES, truncate: true })
    if (page.status >= 400) return 'no_endpoint'
    const endpoint = findEndpoint(page)
    if (!endpoint || !isPostableEndpoint(endpoint, source)) return 'no_endpoint'
    const status = await post(endpoint, { source, target })
    return status >= 200 && status < 300 ? 'sent' : 'failed'
  } catch {
    return 'failed'
  }
}

/**
 * Tell the sites a post links to, if it may: public, no content warning, on
 * a public profile, by someone not hidden who hasn't turned sending off.
 * `previousHtml` is the body before an edit, so removed links are told too.
 */
export async function tellLinkedSites(
  db: Pick<PrismaClient, 'post' | 'blockedSite'>,
  postId: string,
  { fetcher, post: poster, baseUrl, previousHtml }: { fetcher: Fetcher; post: FormPoster; baseUrl: string; previousHtml?: string | null }
): Promise<Partial<Record<string, SendOutcome>>> {
  const post = await db.post.findUnique({
    where: { id: postId },
    select: {
      bodyHtml: true,
      visibility: true,
      contentWarning: true,
      isSpoiler: true,
      author: {
        select: { primaryHandle: true, ...MODERATION_SELECT, profile: { select: { visibility: true, sendWebmentions: true } } },
      },
    },
  })
  const username = post?.author.primaryHandle?.split('@')[0]
  if (
    !post ||
    !username ||
    post.visibility !== 'public' ||
    post.contentWarning?.trim() ||
    post.isSpoiler ||
    post.author.profile?.visibility !== 'public' ||
    post.author.profile.sendWebmentions === false ||
    isHidden(post.author)
  ) {
    return {}
  }

  const source = `${baseUrl.replace(/\/+$/, '')}/resident/${encodeURIComponent(username)}/post/${encodeURIComponent(postId)}`
  const blocked = await loadBlockedSet(db)
  const targets = [
    ...new Set([
      ...linksToTell(post.bodyHtml ?? '', source, { baseUrl, blocked }),
      ...linksToTell(previousHtml ?? '', source, { baseUrl, blocked }),
    ]),
  ].slice(0, MAX_TARGETS)

  const outcomes: Partial<Record<string, SendOutcome>> = {}
  for (const target of targets) outcomes[target] = await sendWebmention(fetcher, poster, source, target)
  return outcomes
}

/** Whether outside sites can reach this base URL at all (not localhost, *.localhost or an IP). */
export function isPublicBase(baseUrl: string): boolean {
  const host = bareHost(baseUrl)
  return !!host && host !== 'localhost' && !host.endsWith('.localhost') && !/^[\d.]+$/.test(host) && !host.startsWith('[')
}

/**
 * After a post is saved: tell the sites it links to, in the background.
 * Does nothing in tests or when the site runs on localhost, and at most
 * 10 saves an hour per author send anything.
 */
export function queueTellLinkedSites(
  db: Pick<PrismaClient, 'post' | 'blockedSite'>,
  postId: string,
  { authorId, previousHtml }: { authorId: string; previousHtml?: string | null }
) {
  const baseUrl = getSiteBaseUrl()
  if (process.env.NODE_ENV === 'test' || !isPublicBase(baseUrl)) return
  const userAgent = `${botUserAgent(baseUrl)} Webmention`
  sendGate().tryRun(async () => {
    if (!(await checkRateLimit(`user:${authorId}`, 'webmention_send')).allowed) return
    const outcomes = Object.values(
      await tellLinkedSites(db, postId, {
        fetcher: createHttpFetcher({ userAgent, timeoutMs: 10_000 }),
        post: createFormPoster({ userAgent }),
        baseUrl,
        previousHtml,
      })
    )
    const sent = outcomes.filter((o) => o === 'sent').length
    const failed = outcomes.filter((o) => o === 'failed').length
    if (sent || failed) console.log(`[webmentions] post ${postId}: ${sent} sent, ${failed} failed, ${outcomes.length - sent - failed} without an endpoint`)
  })
}
