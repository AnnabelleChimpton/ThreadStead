import { db } from '@/lib/config/database/connection'
import { getSiteBaseUrl } from '@/lib/config/site-url'
import { SITE_NAME } from '@/lib/config/site/constants'
import { residentAccess } from '@/lib/domain/users/profile-access'
import { residentSiteUrl } from '@/lib/subdomains/host'
import { FEED_POST_SELECT, postFeedItem } from '@/lib/feeds/post-content'
import { FEED_LENGTH, type Feed } from '@/lib/feeds/rss'
import { residentFeedUrl } from '@/lib/feeds/urls'

/**
 * A resident's public posts, newest first: what a signed-out visitor can read
 * on their page, since a feed reaches anyone. null (no feed) unless the
 * profile is public and the account active.
 */
export async function residentFeed(username: string): Promise<Feed | null> {
  const name = username.toLowerCase()
  const handle = await db.handle.findFirst({
    where: { handle: name, host: SITE_NAME },
    select: {
      userId: true,
      user: { select: { subdomainLabel: true, profile: { select: { displayName: true, bio: true, visibility: true } } } },
    },
  })
  if (!handle) return null
  const profile = handle.user.profile
  if (!(await residentAccess(null, handle.userId, profile?.visibility ?? null)).visible) return null

  const posts = await db.post.findMany({
    where: { authorId: handle.userId, visibility: 'public' },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: FEED_LENGTH,
    select: FEED_POST_SELECT,
  })

  const page = `${getSiteBaseUrl()}/resident/${encodeURIComponent(name)}`
  const author = profile?.displayName || name
  return {
    title: `${author} on HomePageAgain`,
    link: residentSiteUrl(handle.user.subdomainLabel) ?? page,
    selfUrl: residentFeedUrl(name),
    description: profile?.bio?.replace(/\s+/g, ' ').trim() || `Posts by ${author} on HomePageAgain`,
    items: posts.map((post) => postFeedItem(post, `${page}/post/${encodeURIComponent(post.id)}`, author)),
  }
}
