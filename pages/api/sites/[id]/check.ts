/**
 * POST /api/sites/<id>/check: look at the site now for its strip or tag
 * (lib/rings/sites.ts). Visits only the page the owner gave, so robots.txt
 * isn't read. A few checks a minute per person, and one at a time per site.
 */
import { apiHandler, ApiError } from '@/lib/api/handler'
import { db } from '@/lib/config/database/connection'
import { getSiteBaseUrl } from '@/lib/config/site-url'
import { createMemoryRateLimiter } from '@/lib/server/http/rate-limit'
import { checkSite, siteCheckFetcher } from '@/lib/rings/sites'

const perPerson = createMemoryRateLimiter([
  { name: 'minute' as const, max: 4, windowMs: 60 * 1000 },
  { name: 'hour' as const, max: 30, windowMs: 60 * 60 * 1000 },
])
const perSite = createMemoryRateLimiter([{ name: 'gap' as const, max: 1, windowMs: 15 * 1000 }])

export default apiHandler({ methods: ['POST'], auth: 'user' }, async (req, res, { user }) => {
  const id = typeof req.query.id === 'string' ? req.query.id : ''
  const site = await db.externalSite.findFirst({ where: { id, userId: user.id } })
  if (!site) throw new ApiError(404, 'Not found')
  if (!perPerson.check(user.id).allowed || !perSite.check(site.id).allowed) {
    throw new ApiError(429, 'Give it a minute before checking again.')
  }
  const baseUrl = getSiteBaseUrl()
  const { site: after, outcome } = await checkSite(db, site, { fetcher: siteCheckFetcher(baseUrl), baseUrl })
  return res.status(200).json({ ok: outcome.ok, reason: outcome.ok ? null : outcome.reason, state: after.state, method: after.verifyMethod })
})
