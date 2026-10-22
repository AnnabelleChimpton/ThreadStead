/**
 * Settings → Your sites (lib/rings/sites.ts).
 *   GET   your sites, their ring stops, clicks this month, and your public rings
 *   POST  { url, stripPageUrl? } adds a site, waiting to be proved
 */
import { z } from 'zod'
import { apiHandler } from '@/lib/api/handler'
import { db } from '@/lib/config/database/connection'
import { getSiteBaseUrl } from '@/lib/config/site-url'
import { clicksBySite } from '@/lib/rings/counts'
import { addSite, asApiError, MAX_SITES, profileUrlsOf, VERIFY_META_NAME } from '@/lib/rings/sites'
import { myRings } from '@/lib/rings/stops'

const AddSite = z.object({
  url: z.string().trim().min(1).max(500),
  stripPageUrl: z.string().trim().max(500).nullish(),
})

export default apiHandler(
  { methods: ['GET', 'POST'], auth: 'user', rateLimit: 'profile_metadata' },
  async (req, res, { user }) => {
    const baseUrl = getSiteBaseUrl()
    if (req.method === 'POST') {
      try {
        const site = await addSite(db, user.id, AddSite.parse(req.body), baseUrl)
        return res.status(201).json({ site: { id: site.id } })
      } catch (error) {
        throw asApiError(error)
      }
    }

    const sites = await db.externalSite.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
      include: { stops: { select: { ringSlug: true, status: true, reason: true } } },
    })
    const now = new Date()
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const clicks = await clicksBySite(db, sites.map((s) => s.id), monthStart)
    const rings = await myRings(user.id).catch(() => null)
    const [profileUrl] = await profileUrlsOf(db, user.id, baseUrl)

    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({
      max: MAX_SITES,
      metaName: VERIFY_META_NAME,
      profileUrl: profileUrl ?? null,
      // Strips are for public rings only
      rings: rings && rings.filter((r) => r.visibility === 'PUBLIC').map((r) => ({ slug: r.slug, name: r.name })),
      sites: sites.map((s) => ({
        id: s.id,
        url: s.url,
        stripPageUrl: s.stripPageUrl,
        title: s.title,
        state: s.state,
        verifyMethod: s.verifyMethod,
        lastCheckedAt: s.lastCheckedAt?.toISOString() ?? null,
        lastError: s.lastError,
        restingSince: s.restingSince?.toISOString() ?? null,
        clicksThisMonth: clicks.get(s.id) ?? 0,
        stops: s.stops,
      })),
    })
  }
)
