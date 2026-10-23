/**
 * POST /api/webmention: the Webmention endpoint (lib/webmentions/receive.ts).
 * Form-encoded `source` and `target`. Quick checks here, then 202, and the
 * page is fetched in the background. Never reads a session: the rate limit
 * is per IP, and server-to-server senders pass the same-origin check
 * because they send no Origin.
 */
import { apiHandler } from '@/lib/api/handler'
import { db } from '@/lib/config/database/connection'
import { getSiteBaseUrl } from '@/lib/config/site-url'
import { createHttpFetcher } from '@/lib/indie-index/http'
import { botUserAgent } from '@/lib/indie-index/public'
import { getClientIp } from '@/lib/server/http/client-ip'
import { limitIdentifier } from '@/lib/server/http/rate-limit'
import { receiveGate } from '@/lib/webmentions/gate'
import { checkMention, processMention } from '@/lib/webmentions/receive'

export default apiHandler({ methods: ['POST'], auth: 'none', csrf: false }, async (req, res) => {
  if (!(await limitIdentifier(res, `ip:${getClientIp(req) ?? 'unknown'}`, 'webmention'))) return

  const baseUrl = getSiteBaseUrl()
  const checked = await checkMention(db, req.body?.source, req.body?.target, baseUrl)
  if (!checked.ok) return res.status(400).json({ error: checked.error })

  if (!(await limitIdentifier(res, `host:${checked.sourceHost}`, 'webmention_source'))) return

  const fetcher = createHttpFetcher({ userAgent: `${botUserAgent(baseUrl)} Webmention`, timeoutMs: 10_000 })
  const queued = receiveGate().tryRun(async () => {
    await processMention(db, fetcher, checked, baseUrl)
  })
  if (!queued) {
    res.setHeader('Retry-After', '600')
    return res.status(429).json({ error: 'Busy right now. Try again in a few minutes.' })
  }
  res.status(202).json({ message: "Got it. I'll check the link shortly." })
})
