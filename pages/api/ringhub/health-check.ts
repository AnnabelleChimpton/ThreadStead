import { UserRole } from '@prisma/client'
import { apiHandler } from '@/lib/api/handler'
import { checkRingHubHealth, validateRingHubConfig, benchmarkRingHubPerformance } from '@/lib/api/ringhub/ringhub-test-utils'

const CHECK_MS = 30_000

let lastCheck: { at: number; result: Promise<{ config: ReturnType<typeof validateRingHubConfig>; health: Awaited<ReturnType<typeof checkRingHubHealth>> }> } | null = null

/**
 * One check every 30 seconds, shared by everyone asking (requests at the
 * same moment share the one in flight). Each check is 3 hub calls, one
 * signed as this site, and anyone could ask as often as they liked.
 */
function currentCheck() {
  if (!lastCheck || Date.now() - lastCheck.at > CHECK_MS) {
    lastCheck = {
      at: Date.now(),
      result: checkRingHubHealth().then((health) => ({ config: validateRingHubConfig(), health })),
    }
  }
  return lastCheck.result
}

/**
 * Whether Ring Hub answers and takes this site's signature. Public: deploy.sh
 * reads `"authenticated":true` from it on 127.0.0.1 after a deploy (a new
 * process, so a fresh check). `?benchmark=true` times three more hub reads,
 * for an admin only.
 */
export default apiHandler({ methods: ['GET'], auth: 'optional' }, async (req, res, { user }) => {
  const { config, health } = await currentCheck()

  let benchmark = undefined
  if (req.query.benchmark === 'true' && user?.role === UserRole.admin && health.ring_hub_available) {
    benchmark = await benchmarkRingHubPerformance()
  }

  res.status(200).json({ timestamp: new Date().toISOString(), config, health, benchmark })
})
