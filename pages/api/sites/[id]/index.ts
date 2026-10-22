/**
 * One of your sites (Settings → Your sites).
 *   PATCH   { stripPageUrl } the page on the site with your strip, or null for the homepage
 *   DELETE  removes it, and its stops in your rings (a ring owner's hide stays with the site, so goes too)
 */
import { z } from 'zod'
import { apiHandler, ApiError } from '@/lib/api/handler'
import { db } from '@/lib/config/database/connection'
import { asApiError, updateStripPage } from '@/lib/rings/sites'

const Patch = z.object({ stripPageUrl: z.string().trim().max(500).nullable() })

export default apiHandler(
  { methods: ['PATCH', 'DELETE'], auth: 'user', rateLimit: 'profile_metadata' },
  async (req, res, { user }) => {
    const id = typeof req.query.id === 'string' ? req.query.id : ''
    const site = await db.externalSite.findFirst({ where: { id, userId: user.id } })
    if (!site) throw new ApiError(404, 'Not found')

    if (req.method === 'DELETE') {
      await db.externalSite.delete({ where: { id: site.id } })
      return res.status(200).json({ ok: true })
    }
    try {
      await updateStripPage(db, site, Patch.parse(req.body).stripPageUrl)
    } catch (error) {
      throw asApiError(error)
    }
    return res.status(200).json({ ok: true })
  }
)
