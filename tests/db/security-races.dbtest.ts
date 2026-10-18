/**
 * Races and injection in the rate limiter and email tokens, against a real
 * Postgres. Parallel requests used to read the same row, all pass the check,
 * then all write.
 */
import { randomBytes } from 'crypto'
import { db } from '@/lib/config/database/connection'

const mockSend = jest.fn(async (_msg: { html: string }) => ({}))
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send: (msg: never) => mockSend(msg) } })),
}))

process.env.EMAIL_ENCRYPTION_KEY = randomBytes(32).toString('hex')
process.env.RESEND_FROM_EMAIL = 'hello@threadstead.test'

import { RATE_LIMIT_CONFIGS, checkRateLimit } from '@/lib/server/http/rate-limit'
import {
  createEmailLoginToken,
  createEmailVerificationToken,
  createPasswordResetToken,
  sendLoginEmail,
  sendVerificationEmail,
  verifyEmailLoginToken,
  verifyEmailVerificationToken,
  verifyPasswordResetToken,
} from '@/lib/email-login'
import { encryptEmail } from '@/lib/utils/security/email-encryption'

const UPLOADS = RATE_LIMIT_CONFIGS.uploads

async function makeUser(handle: string, email: string) {
  return db.user.create({
    data: {
      id: `u_${handle}`,
      did: `did:test:${handle}`,
      encryptedEmail: encryptEmail(email),
      emailVerifiedAt: new Date(),
      handles: { create: { handle, host: 'local' } },
      profile: { create: { displayName: handle } },
    },
  })
}

beforeEach(async () => {
  await db.rateLimit.deleteMany({})
  await db.emailLoginToken.deleteMany({})
  await db.$executeRawUnsafe('TRUNCATE "User" RESTART IDENTITY CASCADE')
  mockSend.mockClear()
})

afterAll(async () => {
  await db.$disconnect()
})

describe('rate limiter under concurrency', () => {
  it('allows exactly `limit` out of a burst on a brand-new window', async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => checkRateLimit('ip:burst', 'uploads')))
    expect(results.filter((r) => r.allowed)).toHaveLength(UPLOADS.limit)
  })

  it('lets only one through when one slot is left', async () => {
    for (let i = 0; i < UPLOADS.limit - 1; i++) await checkRateLimit('ip:last', 'uploads')
    const results = await Promise.all(Array.from({ length: 5 }, () => checkRateLimit('ip:last', 'uploads')))
    expect(results.filter((r) => r.allowed)).toHaveLength(1)
  })

  it('does not count past limit + 1 while blocked', async () => {
    for (let i = 0; i < UPLOADS.limit + 10; i++) await checkRateLimit('ip:hammer', 'uploads')
    const row = await db.rateLimit.findFirstOrThrow({ where: { identifier: 'ip:hammer' } })
    expect(row.requestCount).toBe(UPLOADS.limit + 1)
  })
})

describe('email tokens are single-use under concurrency', () => {
  const settle = <T>(ps: Promise<T>[]) => Promise.allSettled(ps)
  const wins = (rs: PromiseSettledResult<unknown>[]) => rs.filter((r) => r.status === 'fulfilled').length

  it('login', async () => {
    await makeUser('alice', 'alice@example.com')
    const token = await createEmailLoginToken('alice@example.com')
    expect(wins(await settle([1, 2, 3, 4].map(() => verifyEmailLoginToken(token))))).toBe(1)
  })

  it('email verification', async () => {
    const u = await makeUser('bob', 'bob@example.com')
    const token = await createEmailVerificationToken(u.id, 'bob@example.com')
    expect(wins(await settle([1, 2, 3, 4].map(() => verifyEmailVerificationToken(token))))).toBe(1)
  })

  it('password reset', async () => {
    const u = await makeUser('cara', 'cara@example.com')
    const token = await createPasswordResetToken(u.id, 'cara@example.com')
    expect(wins(await settle([1, 2, 3, 4].map(() => verifyPasswordResetToken(token))))).toBe(1)
  })
})

describe('emails escape user-chosen names', () => {
  const evil = '<a href="https://evil.test">Secure your account</a>'

  it('verification email', async () => {
    await sendVerificationEmail('victim@example.com', evil, 'tok')
    const html = mockSend.mock.calls[0][0].html
    expect(html).not.toContain('<a href="https://evil.test">')
    expect(html).toContain('&lt;a href=&quot;https://evil.test&quot;&gt;')
  })

  it('login email, one account and several', async () => {
    const acct = { id: '1', did: 'd1', displayName: evil, handle: 'h<b>' }
    await sendLoginEmail('victim@example.com', [acct], 'tok')
    await sendLoginEmail('victim@example.com', [acct, { ...acct, id: '2' }], 'tok')
    for (const [msg] of mockSend.mock.calls) {
      expect(msg.html).not.toContain('<a href="https://evil.test">')
      expect(msg.html).not.toContain('h<b>')
    }
  })
})
