import { db } from '@/lib/config/database/connection'
import { getSiteBaseUrl } from '@/lib/config/site-url'
import { getPublicRingHubClient } from '@/lib/api/ringhub/ringhub-client'
import { raceHubCall, HUB_TIMEOUT } from '@/lib/api/ringhub/ringhub-ssr'
import { extractPostIdFromUri, isOurThreadSteadInstance } from '@/lib/domain/threadrings/orphan-postrefs'
import { getBlockedUserDids, getHiddenIds } from '@/lib/domain/users/blocks'
import { ringFacts } from '@/lib/rings/walk'
import { FEED_POST_SELECT, postFeedItem } from '@/lib/feeds/post-content'
import { FEED_LENGTH, type Feed, type FeedItem } from '@/lib/feeds/rss'
import { ringFeedUrl } from '@/lib/feeds/urls'

const HUB_DEADLINE_MS = 4000

/**
 * A public ring's newest posts in the hub's order: what a signed-out visitor
 * sees on its page, read with the same unsigned hub calls. null for no such
 * public ring; 'unavailable' when the hub didn't answer.
 */
export async function ringFeed(slug: string): Promise<Feed | null | 'unavailable'> {
  const hub = getPublicRingHubClient()
  const facts = await raceHubCall(ringFacts(hub, slug), HUB_DEADLINE_MS)
  if (facts === HUB_TIMEOUT) return 'unavailable'
  if (facts?.visibility !== 'PUBLIC') return null
  const feed = await raceHubCall(hub.getRingFeed(slug, { limit: FEED_LENGTH, scope: 'ring' }), HUB_DEADLINE_MS)
  if (feed === HUB_TIMEOUT) return 'unavailable'
  const refs = feed.posts.filter((ref) => ref.metadata?.type !== 'threadring_prompt')

  // Suspended and banned residents stay off the page, so off the feed
  const { blockedUserIds } = await getHiddenIds(null)
  const hiddenDids = await getBlockedUserDids(blockedUserIds)
  const localIds = refs.filter((ref) => isOurThreadSteadInstance(ref.uri)).map((ref) => extractPostIdFromUri(ref.uri) ?? '')
  const posts = await db.post.findMany({
    where: { id: { in: localIds }, visibility: 'public', authorId: { notIn: blockedUserIds } },
    select: { ...FEED_POST_SELECT, author: { select: { primaryHandle: true, profile: { select: { displayName: true } } } } },
  })
  const byId = new Map(posts.map((post) => [post.id, post]))

  const base = getSiteBaseUrl()
  const items: FeedItem[] = []
  for (const ref of refs) {
    if (hiddenDids.has(ref.submittedBy) || hiddenDids.has(ref.actorDid ?? '')) continue
    if (isOurThreadSteadInstance(ref.uri)) {
      // Missing: not public, hidden, or deleted here
      const post = byId.get(extractPostIdFromUri(ref.uri) ?? '')
      const username = post?.author.primaryHandle?.split('@')[0]
      if (!post || !username) continue
      const url = `${base}/resident/${encodeURIComponent(username)}/post/${encodeURIComponent(post.id)}`
      items.push(postFeedItem(post, url, post.author.profile?.displayName || username))
    } else if (/^https?:\/\//i.test(ref.uri)) {
      // Shared to the ring from elsewhere: a link, as on the ring page
      const { title, actorName } = ref.metadata ?? {}
      items.push({
        title: title ? String(title) : 'A post from elsewhere',
        url: ref.uri,
        publishedAt: new Date(ref.submittedAt),
        author: actorName ? String(actorName) : undefined,
      })
    }
  }

  return {
    title: `${facts.name}, a ring on HomePageAgain`,
    link: `${base}/tr/${encodeURIComponent(slug)}`,
    selfUrl: ringFeedUrl(slug),
    description: `Posts shared to the ${facts.name} ring on HomePageAgain`,
    items,
  }
}
