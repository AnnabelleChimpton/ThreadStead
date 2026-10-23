/**
 * Whether the signed-in resident's public posts tell the sites they link to
 * (Profile.sendWebmentions, lib/webmentions/send.ts):
 *   GET   { send }
 *   POST  { send } to change it
 */
import { z } from 'zod'
import { apiHandler } from '@/lib/api/handler'
import { db } from '@/lib/config/database/connection'

const body = z.object({ send: z.boolean() })

export default apiHandler(
  { methods: ['GET', 'POST'], auth: 'user', rateLimit: 'profile_toggles' },
  async (req, res, { user }) => {
    if (req.method === 'POST') {
      const { send } = body.parse(req.body)
      await db.profile.updateMany({ where: { userId: user.id }, data: { sendWebmentions: send } })
      return res.json({ send })
    }
    const profile = await db.profile.findUnique({ where: { userId: user.id }, select: { sendWebmentions: true } })
    return res.json({ send: profile?.sendWebmentions ?? true })
  }
)
