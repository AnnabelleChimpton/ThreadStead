/**
 * Leaving (lib/domain/users/leaving.ts), for the signed-in resident:
 *   GET     when their account goes (if leaving), and rings to hand over first
 *   POST    { username } start leaving
 *   DELETE  stay after all
 */
import { z } from 'zod'
import { apiHandler } from '@/lib/api/handler'
import { ringsToHandOver, startLeaving, stayAfterAll } from '@/lib/domain/users/leaving'

const body = z.object({ username: z.string().max(64) })

export default apiHandler(
  { methods: ['GET', 'POST', 'DELETE'], auth: 'user', rateLimit: 'default', whileLeaving: true },
  async (req, res, { user }) => {
    if (req.method === 'POST') {
      const { username } = body.parse(req.body)
      return res.json({ deletesAt: await startLeaving(user.id, username) })
    }
    if (req.method === 'DELETE') {
      await stayAfterAll(user.id)
      return res.json({ deletesAt: null })
    }
    const deletesAt = user.deletesAt ?? null
    return res.json({ deletesAt, rings: deletesAt ? [] : await ringsToHandOver(user.id) })
  }
)
