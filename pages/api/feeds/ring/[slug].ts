/** GET /tr/<slug>/feed.xml (rewritten in next.config.ts): lib/feeds/ring-feed.ts */
import { apiHandler } from '@/lib/api/handler'
import { ringFeed } from '@/lib/feeds/ring-feed'
import { sendFeed } from '@/lib/feeds/serve'

// The slug goes into a hub URL
const SLUG = /^[a-z0-9][a-z0-9-]{0,99}$/

export default apiHandler({ methods: ['GET', 'HEAD'], auth: 'none' }, async (req, res) => {
  const slug = String(req.query.slug)
  sendFeed(req, res, SLUG.test(slug) ? await ringFeed(slug) : null)
})
