/**
 * GET /api/share/ring/<slug>.png: a ring's link-preview image
 * (lib/rings/share-card.ts), the og:image of /tr/<slug>. Same answer for
 * everyone, no session read. A public ring gets its own badge; anything else
 * (unlisted, private, unknown, or the hub not answering) gets a badge drawn
 * from the slug, so a preview never breaks and never says more than the URL.
 * robots.txt allows /api/share/ so link-preview fetchers can read it.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { raceHubCall, HUB_TIMEOUT } from '@/lib/api/ringhub/ringhub-ssr'
import { defaultHub, ringFacts } from '@/lib/rings/walk'
import { ringShareCard } from '@/lib/rings/share-card'

const FILE = /^([a-z0-9][a-z0-9-]{0,99})\.png$/
const HUB_DEADLINE_MS = 2000

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    return res.status(405).end()
  }
  const match = typeof req.query.file === 'string' ? FILE.exec(req.query.file) : null
  if (!match) return res.status(404).end()
  const slug = match[1]

  try {
    const hub = defaultHub()
    const facts = await raceHubCall(ringFacts(hub, slug), HUB_DEADLINE_MS)
    const isPublic = facts !== HUB_TIMEOUT && facts?.visibility === 'PUBLIC'
    const name = isPublic ? facts.name : slug.replace(/-/g, ' ')
    const card = await ringShareCard(name, slug, isPublic ? facts.badgeImageUrl : null, isPublic ? facts.themeColor : null)
    res.setHeader('Content-Type', 'image/png')
    // Short when the hub didn't answer, so the real badge shows up soon
    res.setHeader('Cache-Control', facts === HUB_TIMEOUT ? 'public, max-age=60' : 'public, max-age=3600')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    return res.status(200).send(card)
  } catch (error) {
    console.error('Ring share card failed:', error)
    return res.status(500).end()
  }
}
