/** GET /resident/<username>/feed.xml (rewritten in next.config.ts): lib/feeds/resident-feed.ts */
import { apiHandler } from '@/lib/api/handler'
import { residentFeed } from '@/lib/feeds/resident-feed'
import { sendFeed } from '@/lib/feeds/serve'

export default apiHandler({ methods: ['GET', 'HEAD'], auth: 'none' }, async (req, res) => {
  sendFeed(req, res, await residentFeed(String(req.query.username)))
})
