import { z } from 'zod'
import { apiHandler, ApiError } from '@/lib/api/handler'
import { generateBadge } from '@/lib/badge-generator'
import { uploadBadgeImage } from '@/lib/badge-uploader'
import { requireRingAs } from '@/lib/domain/threadrings/ring-access'

const schema = z.object({
  title: z.string().trim().min(1, 'Badge title is required'),
  subtitle: z.string().optional(),
  templateId: z.string().optional(),
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
})

/**
 * Draw a ring badge and upload it, for the badge manager to save with
 * update-badge. Only for whoever the hub lets change the ring's badge: its
 * Host, or a site admin (ring-access.ts).
 */
export default apiHandler(
  { methods: ['POST'], auth: 'user', rateLimit: 'threadring_operations', schema },
  async (req, res, { user, body }) => {
    const slug = req.query.slug
    if (typeof slug !== 'string') throw new ApiError(400, 'Invalid ring slug')

    const access = await requireRingAs(user, slug)
    if (!access.manageAs) throw new ApiError(403, "Only the ring's Host can change its badge.")

    const { title, subtitle, templateId, backgroundColor, textColor } = body
    const generatedBadge = await generateBadge({ title, subtitle: subtitle?.trim(), templateId, backgroundColor, textColor })
    if (!generatedBadge.imageDataUrl) throw new ApiError(500, "Couldn't draw the badge. Try again.")

    let uploadResult
    try {
      uploadResult = await uploadBadgeImage(generatedBadge.imageDataUrl, slug)
    } catch (error) {
      console.error('Badge upload failed:', error)
      throw new ApiError(500, "Couldn't upload the badge. Try again.")
    }

    res.json({
      badgeImageUrl: uploadResult.badgeImageUrl,
      badgeImageHighResUrl: uploadResult.badgeImageHighResUrl,
      generatedBadge: {
        title: generatedBadge.title,
        subtitle: generatedBadge.subtitle,
        templateId: generatedBadge.templateId,
        backgroundColor: generatedBadge.backgroundColor,
        textColor: generatedBadge.textColor,
      },
    })
  }
)
