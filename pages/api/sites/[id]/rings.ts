/**
 * POST /api/sites/<id>/rings { ringSlug, on }: make this site your stop in
 * one of your rings, or stop (lib/rings/stops.ts). The ring's rule decides
 * whether it's listed now or waits for a ring owner or moderator.
 */
import { z } from 'zod'
import { apiHandler, ApiError } from '@/lib/api/handler'
import { db } from '@/lib/config/database/connection'
import { asApiError } from '@/lib/rings/sites'
import { setStop } from '@/lib/rings/stops'
import { defaultHub } from '@/lib/rings/walk'

const Body = z.object({ ringSlug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,99}$/), on: z.boolean() })

export default apiHandler(
  { methods: ['POST'], auth: 'user', rateLimit: 'threadring_operations', schema: Body },
  async (req, res, { user, body }) => {
    const id = typeof req.query.id === 'string' ? req.query.id : ''
    const site = await db.externalSite.findFirst({ where: { id, userId: user.id } })
    if (!site) throw new ApiError(404, 'Not found')
    const hub = defaultHub()
    if (!hub) throw new ApiError(503, "Rings aren't reachable right now. Try again in a bit.")
    try {
      const stop = await setStop(db, { userId: user.id, site, ringSlug: body.ringSlug, on: body.on, hub })
      return res.status(200).json({ stop: stop && { ringSlug: stop.ringSlug, status: stop.status, reason: stop.reason } })
    } catch (error) {
      throw asApiError(error)
    }
  }
)
