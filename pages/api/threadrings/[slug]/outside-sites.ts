/**
 * The ring host's say on members' own sites in their ring
 * (lib/rings/stops.ts), Manage › Stops. Who hosts comes from the hub.
 *   POST  { stopId, action: approve | hide | unhide, reason? }
 *   PUT   { rule: allow | ask | off }
 */
import { z } from 'zod'
import { apiHandler, ApiError } from '@/lib/api/handler'
import { db } from '@/lib/config/database/connection'
import { asApiError } from '@/lib/rings/sites'
import { setOutsideSitesRule, stewardStop } from '@/lib/rings/stops'
import { defaultHub, ringFacts } from '@/lib/rings/walk'

const Action = z.object({
  stopId: z.string().min(1).max(64),
  action: z.enum(['approve', 'hide', 'unhide']),
  reason: z.string().trim().max(300).nullish(),
})
const Rule = z.object({ rule: z.enum(['allow', 'ask', 'off']) })

export default apiHandler(
  { methods: ['POST', 'PUT'], auth: 'user', rateLimit: 'threadring_operations' },
  async (req, res, { user }) => {
    const slug = typeof req.query.slug === 'string' ? req.query.slug : ''
    const hub = defaultHub()
    const ring = await ringFacts(hub, slug)
    if (!ring) throw new ApiError(404, 'Not found')
    try {
      if (req.method === 'PUT') {
        const { rule } = Rule.parse(req.body)
        await setOutsideSitesRule(db, { stewardId: user.id, ringSlug: slug, rule, hub })
        return res.status(200).json({ rule })
      }
      const body = Action.parse(req.body)
      const stop = await stewardStop(db, { stewardId: user.id, ringSlug: slug, hub, ring, ...body })
      return res.status(200).json({ stop: { id: stop.id, status: stop.status } })
    } catch (error) {
      throw asApiError(error)
    }
  }
)
