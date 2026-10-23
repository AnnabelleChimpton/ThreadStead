/**
 * What a ring strip on a member's own site links to (design/rings-for-any-
 * site/SCOPE.md §3), served at /ring/<slug>/... (rewritten here in
 * next.config.ts):
 *
 *   next | prev | random ?from=<site id>   302 to the next stop (lib/rings/walk.ts)
 *   badge.png                              302 to the ring's badge, or a drawn one
 *
 * Always 302, never a permanent redirect (browsers keep those). No session
 * is read and no cookie is set: everyone gets the same walk, a stranger's.
 * Targets come from the database only, never from the request. A visitor
 * never gets a 404: no such ring goes to /tr, a hub hiccup or a busy IP to
 * the ring's page.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/config/database/connection'
import { SITE_NAME } from '@/lib/config/site/constants'
import { createMemoryRateLimiter } from '@/lib/server/http/rate-limit'
import { getClientIp } from '@/lib/server/http/client-ip'
import { raceHubCall, HUB_TIMEOUT } from '@/lib/api/ringhub/ringhub-ssr'
import { countDoorway } from '@/lib/rings/counts'
import { ringBadgePng } from '@/lib/rings/badge'
import { defaultHub, ringFacts, walkFromSite } from '@/lib/rings/walk'
import type { WalkDirection } from '@/lib/pixel-homes/ring-walk'

const SLUG = /^[a-z0-9][a-z0-9-]{0,99}$/
const SITE_ID = /^[A-Za-z0-9_-]{1,32}$/
const DIRECTIONS: WalkDirection[] = ['next', 'prev', 'random']
const BADGE_DEADLINE_MS = 2000

export const RING_WALK_WINDOWS = [{ name: 'minute' as const, max: 60, windowMs: 60 * 1000 }]
const limiter = createMemoryRateLimiter(RING_WALK_WINDOWS)

function go(res: NextApiResponse, destination: string, cache = 'no-store') {
  res.setHeader('Cache-Control', cache)
  res.redirect(302, destination)
}

async function badge(res: NextApiResponse, slug: string) {
  const hub = defaultHub()
  const facts = await raceHubCall(ringFacts(hub, slug), BADGE_DEADLINE_MS)
  // The R2 key changes on every badge edit, so pasted strips point here
  if (facts !== HUB_TIMEOUT && facts?.visibility === 'PUBLIC' && facts.badgeImageUrl) {
    return go(res, facts.badgeImageUrl, 'public, max-age=3600')
  }
  // No badge of its own, no such public ring, or no answer: draw one rather than break the <img>
  const known = facts !== HUB_TIMEOUT && facts?.visibility === 'PUBLIC' ? facts : null
  const name = known ? known.name : slug.replace(/-/g, ' ')
  res.setHeader('Content-Type', 'image/png')
  res.setHeader('Cache-Control', facts === HUB_TIMEOUT ? 'public, max-age=60' : 'public, max-age=3600')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.status(200).send(await ringBadgePng(name, slug, known?.themeColor))
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    return res.status(405).end()
  }
  const slug = typeof req.query.slug === 'string' ? req.query.slug : ''
  const action = typeof req.query.action === 'string' ? req.query.action : ''
  if (!SLUG.test(slug)) return go(res, '/tr')
  const ringPage = `/tr/${encodeURIComponent(slug)}`

  if (action === 'badge.png') {
    try {
      return await badge(res, slug)
    } catch (error) {
      console.error('Ring badge failed:', error)
      return res.status(500).end()
    }
  }

  const direction = DIRECTIONS.find((d) => d === action)
  if (!direction) return go(res, ringPage)
  if (!limiter.check(getClientIp(req) ?? 'unknown').allowed) return go(res, ringPage)

  const fromParam = typeof req.query.from === 'string' ? req.query.from : ''
  const from = SITE_ID.test(fromParam) ? fromParam : null
  try {
    const result = await walkFromSite(db, { slug, from, go: direction, host: SITE_NAME })
    if (result.kind === 'none') return go(res, '/tr')
    if (result.kind === 'unavailable') return go(res, ringPage)
    if (result.fromSite) await countDoorway(db, slug, result.fromSite.id, direction)
    if (result.kind === 'empty') return go(res, ringPage)
    const { stop } = result
    return go(res, stop.site ? stop.site.url : `/home/${encodeURIComponent(stop.handle)}`)
  } catch (error) {
    console.error('Ring walk from a site failed:', error)
    return go(res, ringPage)
  }
}
