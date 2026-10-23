import type { NextApiRequest, NextApiResponse } from 'next'
import { getSiteBaseUrl } from '@/lib/config/site-url'
import { lastModified, renderRss, type Feed } from '@/lib/feeds/rss'

/**
 * Answer a feed request, the same for everyone: the RSS (or 304 when the
 * reader already has the newest post), 404 for no feed, and 503 when the hub
 * didn't answer, so readers try again instead of seeing an empty ring.
 */
export function sendFeed(req: NextApiRequest, res: NextApiResponse, feed: Feed | null | 'unavailable') {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (feed === 'unavailable' || !feed) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    if (feed) {
      res.setHeader('Retry-After', '300')
      return res.status(503).send('This feed is resting for a moment. Try again soon.\n')
    }
    res.setHeader('Cache-Control', 'public, max-age=300')
    return res.status(404).send('No feed here.\n')
  }

  // HTTP dates have whole seconds
  const modified = Math.floor(lastModified(feed).getTime() / 1000)
  res.setHeader('Cache-Control', 'public, max-age=900')
  res.setHeader('Last-Modified', new Date(modified * 1000).toUTCString())
  const since = Date.parse(String(req.headers['if-modified-since'] ?? ''))
  if (modified <= Math.floor(since / 1000)) return res.status(304).end()

  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8')
  return res.status(200).send(renderRss(feed, getSiteBaseUrl()))
}
