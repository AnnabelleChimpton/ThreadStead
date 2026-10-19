import { z } from 'zod'
import { db } from '@/lib/config/database/connection'
import { apiHandler } from '@/lib/api/handler'
import { getCurrentCollectionName, listCollections, setCurrentCollection } from '@/lib/pixel-homes/collections'

const bodySchema = z.object({ current: z.string().max(200).nullable() })

/**
 * Seasonal collections for admin: GET lists them with the current one;
 * POST { current: "Autumn 2026" | null } marks one current, or none.
 * The street mentions the current one while its items are out.
 */
export default apiHandler(
  { methods: ['GET', 'POST'], auth: 'admin', rateLimit: 'admin' },
  async (req, res) => {
    if (req.method === 'POST') {
      const parsed = bodySchema.safeParse(req.body)
      if (!parsed.success) return res.status(400).json({ error: 'Send { current: name or null }.' })
      const result = await setCurrentCollection(db, parsed.data.current)
      if (!result.ok) return res.status(400).json({ error: result.error })
    }
    const [collections, current] = await Promise.all([listCollections(db), getCurrentCollectionName(db)])
    return res.json({ collections, current })
  }
)
