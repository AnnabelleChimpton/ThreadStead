/**
 * Receiving webmentions (design/webmentions/SCOPE.md §1): an outside page
 * says it links to a resident's post. We check the request, fetch the page
 * to confirm the link is really there, and tell the post's author with one
 * notification. Nothing shows on the post itself, and nothing is stored
 * beyond that notification.
 */
import type { PrismaClient } from '@prisma/client'
import { ACCEPT_HTML, type Fetcher } from '@/lib/indie-index/http'
import { extractLinks } from '@/lib/indie-index/html'
import { MODERATION_SELECT, isHidden } from '@/lib/domain/users/moderation'
import { bareHost, postIdOf } from './urls'

/** A post stops taking webmentions after this many notifications about it. */
export const MAX_MENTIONS_PER_POST = 10

/**
 * Sources we never take. brid.gy relays Bluesky and Mastodon replies and
 * likes, which the site deliberately doesn't bring in.
 */
export const DENIED_SOURCE_HOSTS: readonly string[] = ['brid.gy']

const PAGE_BYTES = 1024 * 1024

/** Links marked as one of these aren't mentions: someone liked or reposted, not wrote. */
const NOT_A_MENTION = new Set(['u-like-of', 'u-repost-of', 'u-bookmark-of'])

type Db = Pick<PrismaClient, 'post' | 'notification'>

export type MentionCheck =
  | { ok: true; source: string; sourceHost: string; postId: string }
  | { ok: false; error: string }

const hostIs = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`)

function httpUrl(value: unknown): URL | null {
  if (typeof value !== 'string' || value.length > 2048) return null
  try {
    const url = new URL(value.trim())
    // One page is one mention, whatever #fragment it's sent with
    url.hash = ''
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

export type MentionablePost = { id: string; title: string; authorId: string; authorHandle: string | null }

/** The post, when it takes webmentions: public, on a public profile, by someone not hidden. */
export async function mentionablePost(db: Pick<PrismaClient, 'post'>, postId: string): Promise<MentionablePost | null> {
  const post = await db.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      title: true,
      visibility: true,
      authorId: true,
      author: { select: { primaryHandle: true, ...MODERATION_SELECT, profile: { select: { visibility: true } } } },
    },
  })
  if (!post || post.visibility !== 'public' || post.author.profile?.visibility !== 'public' || isHidden(post.author)) return null
  return { id: post.id, title: post.title, authorId: post.authorId, authorHandle: post.author.primaryHandle }
}

/** Webmention notifications about one post (recipient + actor + type hit the notification index). */
const mentionsOf = (post: MentionablePost) => ({
  recipientId: post.authorId,
  actorId: post.authorId,
  type: 'webmention' as const,
  data: { path: ['postId'], equals: post.id },
})

/** The checks the endpoint makes before answering 202. */
export async function checkMention(db: Db, source: unknown, target: unknown, baseUrl: string): Promise<MentionCheck> {
  const sourceUrl = httpUrl(source)
  const targetUrl = httpUrl(target)
  if (!sourceUrl || !targetUrl) return { ok: false, error: 'source and target need to be http(s) URLs.' }
  if (sourceUrl.href === targetUrl.href) return { ok: false, error: 'source and target are the same URL.' }

  const sourceHost = bareHost(sourceUrl.href)
  const ours = bareHost(baseUrl)
  if (!sourceHost || (ours && hostIs(sourceHost, ours))) return { ok: false, error: 'Links from this site itself are not webmentions.' }
  if (DENIED_SOURCE_HOSTS.some((d) => hostIs(sourceHost, d))) return { ok: false, error: 'Webmentions from that site are not taken here.' }

  const postId = postIdOf(targetUrl.href, baseUrl)
  const post = postId ? await mentionablePost(db, postId) : null
  if (!post) return { ok: false, error: "target isn't a post here that takes webmentions." }
  if ((await db.notification.count({ where: mentionsOf(post) })) >= MAX_MENTIONS_PER_POST) {
    return { ok: false, error: 'That post has had all the webmentions it takes.' }
  }
  return { ok: true, source: sourceUrl.href, sourceHost, postId: post.id }
}

/**
 * Fetch the source and confirm it links to the post with an ordinary link
 * (not a like, repost or bookmark). Never throws; false for anything else.
 */
export async function sourceLinksToPost(fetcher: Fetcher, source: string, postId: string, baseUrl: string): Promise<boolean> {
  try {
    const res = await fetcher({ url: source, accept: ACCEPT_HTML, maxBytes: PAGE_BYTES, truncate: true })
    if (res.status < 200 || res.status >= 300) return false
    const type = res.headers.get('content-type')
    if (type && !/html/i.test(type)) return false
    return extractLinks(res.body, res.url).some(
      (link) => postIdOf(link.href, baseUrl) === postId && !link.classes?.some((c) => NOT_A_MENTION.has(c))
    )
  } catch {
    return false
  }
}

/**
 * Tell the post's author, once per source. The actor is the author
 * themself, as for other news that isn't from a person here (ring_site).
 * False when there was nothing to do.
 */
export async function notifyMention(db: Db, post: MentionablePost, { source, sourceHost }: { source: string; sourceHost: string }) {
  const already = await db.notification.findFirst({
    where: { AND: [mentionsOf(post), { data: { path: ['sourceUrl'], equals: source } }] },
    select: { id: true },
  })
  // The cap again: several can pass the endpoint's check while waiting in line
  if (already || (await db.notification.count({ where: mentionsOf(post) })) >= MAX_MENTIONS_PER_POST) return false
  await db.notification.create({
    data: {
      recipientId: post.authorId,
      actorId: post.authorId,
      type: 'webmention',
      data: { postId: post.id, postTitle: post.title, postAuthorHandle: post.authorHandle, sourceUrl: source, sourceHost },
    },
  })
  return true
}

/** The background half: confirm the link, check the post again, notify. */
export async function processMention(
  db: Db,
  fetcher: Fetcher,
  mention: { postId: string; source: string; sourceHost: string },
  baseUrl: string
): Promise<boolean> {
  if (!(await sourceLinksToPost(fetcher, mention.source, mention.postId, baseUrl))) return false
  const post = await mentionablePost(db, mention.postId)
  return post ? notifyMention(db, post, mention) : false
}
