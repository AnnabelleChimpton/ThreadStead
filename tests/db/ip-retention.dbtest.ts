/**
 * Stored IP addresses are forgotten once they've done their job
 * (lib/privacy/ip-retention.ts), against a real Postgres: abuse records after
 * 30 days unless an admin blocked the address, the address on rows we keep
 * after 30 days, post-view hashes after a day, expired rate limits at once.
 */
import { db } from '@/lib/config/database/connection'
import { SITE_NAME } from '@/lib/config/site/constants'
import { forgetOldAddresses, ADDRESS_DAYS, POST_VIEW_HASH_HOURS } from '@/lib/privacy/ip-retention'

const NOW = new Date('2026-10-26T12:00:00Z')
const DAY = 24 * 60 * 60 * 1000
const old = new Date(NOW.getTime() - (ADDRESS_DAYS + 1) * DAY)
const recent = new Date(NOW.getTime() - (ADDRESS_DAYS - 1) * DAY)

let userId: string
// Addresses of this run only: other tests use the documentation ranges too
const RUN = `iprt-${Date.now()}-`
const ip = (n: number) => `${RUN}${n}`

beforeAll(async () => {
  const handle = `iprt${Date.now()}`
  userId = (await db.user.create({ data: { did: `did:key:${handle}`, primaryHandle: `${handle}@${SITE_NAME}`, handles: { create: { handle, host: SITE_NAME } } } })).id
})

afterAll(async () => {
  await db.signupAttempt.deleteMany({ where: { ipAddress: { startsWith: RUN } } })
  await db.ipSignupTracking.deleteMany({ where: { ipAddress: { startsWith: RUN } } })
  await db.rateLimit.deleteMany({ where: { identifier: { startsWith: `ip:${RUN}` } } })
  await db.user.delete({ where: { id: userId } })
})

test('signup attempts older than 30 days are deleted; newer ones stay', async () => {
  await db.signupAttempt.createMany({
    data: [
      { ipAddress: ip(1), attemptedAt: old },
      { ipAddress: ip(2), attemptedAt: recent },
    ],
  })
  const forgotten = await forgetOldAddresses(NOW)
  expect(forgotten.signupAttempts).toBeGreaterThanOrEqual(1)
  const left = await db.signupAttempt.findMany({ where: { ipAddress: { startsWith: RUN } }, select: { ipAddress: true } })
  expect(left.map((a) => a.ipAddress)).toEqual([ip(2)])
})

test("an address's tracking goes once it's been quiet, unless an admin blocked it", async () => {
  await db.ipSignupTracking.createMany({
    data: [
      { ipAddress: ip(10), lastAttemptAt: old },
      { ipAddress: ip(11), lastAttemptAt: old, isBlocked: true, blockedReason: 'Manual block' },
      { ipAddress: ip(12), lastAttemptAt: old, isBlocked: true, autoBlocked: true, unblockAt: new Date(NOW.getTime() - DAY) },
      { ipAddress: ip(13), lastAttemptAt: recent },
    ],
  })
  await forgetOldAddresses(NOW)
  const left = await db.ipSignupTracking.findMany({ where: { ipAddress: { startsWith: ip(1) } }, select: { ipAddress: true }, orderBy: { ipAddress: 'asc' } })
  expect(left.map((t) => t.ipAddress)).toEqual([ip(11), ip(13)])
})

test('consent records stay, without the address and browser after 30 days', async () => {
  await db.userConsent.create({ data: { userId, type: 'ESSENTIAL', granted: true, timestamp: old, ipAddress: ip(20), userAgent: 'Test/1.0' } })
  await db.consentLog.createMany({
    data: [
      { userId, type: 'ESSENTIAL', action: 'GRANTED', granted: true, timestamp: old, ipAddress: ip(21), userAgent: 'Test/1.0' },
      { userId, type: 'PREFERENCES', action: 'GRANTED', granted: true, timestamp: recent, ipAddress: ip(22), userAgent: 'Test/1.0' },
    ],
  })
  await forgetOldAddresses(NOW)
  expect(await db.userConsent.findMany({ where: { userId }, select: { granted: true, ipAddress: true, userAgent: true } })).toEqual([
    { granted: true, ipAddress: null, userAgent: null },
  ])
  const logs = await db.consentLog.findMany({ where: { userId }, select: { ipAddress: true }, orderBy: { timestamp: 'asc' } })
  expect(logs.map((l) => l.ipAddress)).toEqual([null, ip(22)])
})

test('a beta signup and an invite share keep their rows, not the address', async () => {
  const page = await db.betaLandingPage.create({ data: { name: 'IP test', slug: `ip-test-${Date.now()}`, title: 'IP test', createdBy: userId } })
  const code = await db.betaInviteCode.create({ data: { code: `IPTEST${Date.now()}`, generatedBy: userId } })
  await db.betaLandingSignup.create({ data: { landingPageId: page.id, signupStartedAt: old, ipAddress: ip(30), userAgent: 'Test/1.0' } })
  await db.betaInviteShare.create({ data: { codeId: code.id, sharedBy: userId, shareMethod: 'copy_link', sharedAt: old, ipAddress: ip(31), userAgent: 'Test/1.0' } })
  await forgetOldAddresses(NOW)
  expect(await db.betaLandingSignup.findMany({ where: { landingPageId: page.id }, select: { ipAddress: true, userAgent: true } })).toEqual([{ ipAddress: null, userAgent: null }])
  expect(await db.betaInviteShare.findMany({ where: { codeId: code.id }, select: { ipAddress: true, userAgent: true } })).toEqual([{ ipAddress: null, userAgent: null }])
  await db.betaLandingPage.delete({ where: { id: page.id } })
  await db.betaInviteCode.delete({ where: { id: code.id } })
})

test("a post view keeps counting, without the reader's hash after a day", async () => {
  const post = await db.post.create({ data: { authorId: userId, bodyText: 'x', visibility: 'public' } })
  await db.postView.createMany({
    data: [
      { postId: post.id, ipHash: 'aaaaaaaaaaaaaaaa', createdAt: new Date(NOW.getTime() - (POST_VIEW_HASH_HOURS + 1) * 60 * 60 * 1000) },
      { postId: post.id, ipHash: 'bbbbbbbbbbbbbbbb', createdAt: new Date(NOW.getTime() - 60 * 60 * 1000) },
    ],
  })
  await forgetOldAddresses(NOW)
  const views = await db.postView.findMany({ where: { postId: post.id }, select: { ipHash: true }, orderBy: { createdAt: 'asc' } })
  expect(views.map((v) => v.ipHash)).toEqual([null, 'bbbbbbbbbbbbbbbb'])
  await db.post.delete({ where: { id: post.id } })
})

test('expired rate limits go; live ones stay', async () => {
  await db.rateLimit.createMany({
    data: [
      { identifier: `ip:${ip(40)}`, category: 'reads', expiresAt: new Date(NOW.getTime() - 1000) },
      { identifier: `ip:${ip(41)}`, category: 'reads', expiresAt: new Date(NOW.getTime() + 60 * 60 * 1000) },
    ],
  })
  await forgetOldAddresses(NOW)
  const left = await db.rateLimit.findMany({ where: { identifier: { startsWith: `ip:${RUN}` } }, select: { identifier: true } })
  expect(left.map((r) => r.identifier)).toEqual([`ip:${ip(41)}`])
})
