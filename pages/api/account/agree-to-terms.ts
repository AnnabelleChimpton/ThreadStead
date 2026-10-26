/**
 * POST: the signed-in resident agrees to the house rules, terms and privacy
 * policy as they are now (lib/domain/users/terms-agreement.ts). For an
 * account made before signup asked first: its Rules step records it here.
 * New accounts agree when they're made (pages/api/auth/verify.ts).
 */
import { apiHandler } from '@/lib/api/handler'
import { recordTermsAgreement } from '@/lib/domain/users/terms-agreement'

export default apiHandler({ methods: ['POST'], auth: 'user', rateLimit: 'default' }, async (_req, res, { user }) => {
  await recordTermsAgreement(user.id)
  return res.json({ agreed: true })
})
