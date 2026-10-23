import { apiHandler, ApiError } from '@/lib/api/handler'
import { badgeChoiceSchema, drawAndUploadRingBadge } from '@/lib/rings/badge'
import { requireRingAs } from '@/lib/domain/threadrings/ring-access'

/**
 * Draw a ring badge from a template, glyph and its words, in the ring's
 * theme colour, and upload it with its 4× HD, for the badge designer to save
 * with update-badge. Only for whoever the hub lets change the ring's badge:
 * its Host, or a site admin (ring-access.ts).
 */
export default apiHandler(
  { methods: ['POST'], auth: 'user', rateLimit: 'threadring_operations', schema: badgeChoiceSchema },
  async (req, res, { user, body }) => {
    const slug = req.query.slug
    if (typeof slug !== 'string') throw new ApiError(400, 'Invalid ring slug')

    const access = await requireRingAs(user, slug)
    if (!access.manageAs) throw new ApiError(403, "Only the ring's Host can change its badge.")

    const urls = await drawAndUploadRingBadge(access.ring, body).catch((error) => {
      console.error('Badge upload failed:', error)
      throw new ApiError(500, "Couldn't upload the badge. Try again.")
    })
    res.json(urls)
  }
)
