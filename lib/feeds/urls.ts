import { getSiteBaseUrl } from '@/lib/config/site-url'

/** A resident's public posts as RSS (pages/api/feeds/resident/[username].ts). */
export const residentFeedUrl = (username: string) =>
  `${getSiteBaseUrl()}/resident/${encodeURIComponent(username)}/feed.xml`

/** A public ring's posts as RSS (pages/api/feeds/ring/[slug].ts). */
export const ringFeedUrl = (slug: string) => `${getSiteBaseUrl()}/tr/${encodeURIComponent(slug)}/feed.xml`
