/**
 * "Bring in my page from my site", for the HTML editor
 * (lib/templates/editor/site-import.ts).
 *   GET   your verified sites, to bring in from
 *   POST  { id } that site's homepage, ready to go in like a pasted page
 * Your own verified sites only, fetched when you ask, through the ring
 * checks' guarded fetcher: a few a minute per person, one at a time per site.
 */
import { z } from 'zod'
import { apiHandler, ApiError } from '@/lib/api/handler'
import { db } from '@/lib/config/database/connection'
import { getSiteBaseUrl } from '@/lib/config/site-url'
import { createMemoryRateLimiter } from '@/lib/server/http/rate-limit'
import { siteAddress, siteCheckFetcher } from '@/lib/rings/sites'
import { importSitePage } from '@/lib/templates/editor/site-import'

const perPerson = createMemoryRateLimiter([
  { name: 'minute' as const, max: 4, windowMs: 60 * 1000 },
  { name: 'hour' as const, max: 30, windowMs: 60 * 60 * 1000 },
])
const perSite = createMemoryRateLimiter([{ name: 'gap' as const, max: 1, windowMs: 10 * 1000 }])

const Body = z.object({ id: z.string().min(1).max(100) })

export default apiHandler({ methods: ['GET', 'POST'], auth: 'user' }, async (req, res, { user }) => {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'GET') {
    const sites = await db.externalSite.findMany({
      where: { userId: user.id, state: 'verified' },
      orderBy: { createdAt: 'asc' },
      select: { id: true, url: true },
    })
    return res.status(200).json({ sites: sites.map((s) => ({ id: s.id, address: siteAddress(s.url) })) })
  }

  const { id } = Body.parse(req.body)
  const site = await db.externalSite.findFirst({ where: { id, userId: user.id, state: 'verified' } })
  if (!site) throw new ApiError(404, 'That isn’t one of your verified sites.')
  if (!perPerson.check(user.id).allowed || !perSite.check(site.id).allowed) {
    throw new ApiError(429, 'Give it a minute before bringing it in again.')
  }
  const result = await importSitePage(site, siteCheckFetcher(getSiteBaseUrl()))
  if (!result.ok) throw new ApiError(502, result.reason)
  return res.status(200).json({ html: result.html })
})
