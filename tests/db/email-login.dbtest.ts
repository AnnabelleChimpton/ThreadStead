/**
 * Email login / verification / password-reset tokens against a real Postgres.
 * Only the outbound mail client (Resend) is mocked.
 */
import { randomBytes } from 'crypto'
import { db } from '@/lib/config/database/connection'

const mockSend = jest.fn(async (_msg: { from: string; to: string; subject: string; html: string }) => ({}))
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send: (msg: never) => mockSend(msg) } })),
}))

process.env.EMAIL_ENCRYPTION_KEY = randomBytes(32).toString('hex')
process.env.RESEND_FROM_EMAIL = 'hello@threadstead.test'

import {
  checkEmailLoginToken,
  cleanupExpiredTokens,
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

let seq = 0
async function user(handle: string, email: string | null, verified = true) {
  return db.user.create({
    data: {
      id: `u_${handle}`,
      did: `did:test:${handle}:${seq++}`,
      encryptedEmail: email ? encryptEmail(email) : null,
      emailVerifiedAt: email && verified ? new Date() : null,
      handles: { create: { handle, host: 'local' } },
      profile: { create: { displayName: handle.toUpperCase() } },
    },
  })
}

async function expireToken(token: string) {
  await db.emailLoginToken.update({ where: { token }, data: { expiresAt: new Date(Date.now() - 1000) } })
}

beforeEach(async () => {
  await db.emailLoginToken.deleteMany({})
  await db.$executeRawUnsafe('TRUNCATE "User" RESTART IDENTITY CASCADE')
  mockSend.mockClear()
})

afterAll(async () => {
  await db.$disconnect()
})

describe('login tokens', () => {
  it('stores a random 256-bit token with the email encrypted, expiring in 15 minutes', async () => {
    const before = Date.now()
    const token = await createEmailLoginToken('Alice@Example.com')
    expect(token).toMatch(/^[0-9a-f]{64}$/)
    const row = await db.emailLoginToken.findUniqueOrThrow({ where: { token } })
    expect(row.type).toBe('login')
    expect(row.encryptedEmail).not.toContain('alice')
    const ttl = row.expiresAt.getTime() - before
    expect(ttl).toBeGreaterThan(14 * 60 * 1000)
    expect(ttl).toBeLessThanOrEqual(15 * 60 * 1000 + 1000)
  })

  it('finds only accounts whose email matches (case-insensitive) AND is verified', async () => {
    await user('alice', 'alice@example.com')
    await user('alt', 'ALICE@example.com ')
    await user('unverified', 'alice@example.com', false)
    await user('bob', 'bob@example.com')
    const token = await createEmailLoginToken('alice@example.com')
    const users = await checkEmailLoginToken(token)
    expect(users.map((u) => u.handle).sort()).toEqual(['alice', 'alt'])
    expect(users[0]).toMatchObject({ host: 'local', displayName: expect.any(String) })
  })

  it('check does not consume the token; verify does, exactly once', async () => {
    await user('alice', 'alice@example.com')
    const token = await createEmailLoginToken('alice@example.com')
    await checkEmailLoginToken(token)
    await checkEmailLoginToken(token)
    expect(await verifyEmailLoginToken(token)).toHaveLength(1)
    await expect(verifyEmailLoginToken(token)).rejects.toThrow('Token has already been used')
    await expect(checkEmailLoginToken(token)).rejects.toThrow('Token has already been used')
  })

  it('rejects unknown, expired, and wrong-type tokens', async () => {
    await expect(checkEmailLoginToken('nope')).rejects.toThrow('Invalid token')
    const token = await createEmailLoginToken('alice@example.com')
    await expireToken(token)
    await expect(verifyEmailLoginToken(token)).rejects.toThrow('Token has expired')
    const u = await user('alice', 'alice@example.com')
    const reset = await createPasswordResetToken(u.id, 'alice@example.com')
    await expect(verifyEmailLoginToken(reset)).rejects.toThrow('Invalid token type')
  })

  // Concurrent single use (login, verification, reset): security-races.dbtest.ts

  it('cleanup removes only expired tokens', async () => {
    const live = await createEmailLoginToken('a@example.com')
    const dead = await createEmailLoginToken('b@example.com')
    await expireToken(dead)
    await cleanupExpiredTokens()
    expect((await db.emailLoginToken.findMany()).map((t) => t.token)).toEqual([live])
  })
})

describe('verification tokens', () => {
  it('marks the email verified, consumes the token, and returns the address', async () => {
    const u = await user('alice', 'alice@example.com', false)
    const token = await createEmailVerificationToken(u.id, 'alice@example.com')
    const row = await db.emailLoginToken.findUniqueOrThrow({ where: { token } })
    expect(row.expiresAt.getTime() - Date.now()).toBeGreaterThan(23 * 60 * 60 * 1000)

    expect(await verifyEmailVerificationToken(token)).toEqual({ userId: u.id, email: 'alice@example.com' })
    expect((await db.user.findUniqueOrThrow({ where: { id: u.id } })).emailVerifiedAt).not.toBeNull()
    await expect(verifyEmailVerificationToken(token)).rejects.toThrow('already been used')
  })

  it('rejects a login token and an expired one', async () => {
    const login = await createEmailLoginToken('alice@example.com')
    await expect(verifyEmailVerificationToken(login)).rejects.toThrow('Invalid token type')
    const u = await user('alice', 'alice@example.com', false)
    const token = await createEmailVerificationToken(u.id, 'alice@example.com')
    await expireToken(token)
    await expect(verifyEmailVerificationToken(token)).rejects.toThrow('expired')
    expect((await db.user.findUniqueOrThrow({ where: { id: u.id } })).emailVerifiedAt).toBeNull()
  })
})

describe('password reset tokens', () => {
  it('expires in an hour, works once, and returns the user', async () => {
    const u = await user('alice', 'alice@example.com')
    const token = await createPasswordResetToken(u.id, 'alice@example.com')
    const row = await db.emailLoginToken.findUniqueOrThrow({ where: { token } })
    expect(row.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(60 * 60 * 1000)
    expect(await verifyPasswordResetToken(token)).toEqual({ userId: u.id, email: 'alice@example.com' })
    await expect(verifyPasswordResetToken(token)).rejects.toThrow('already been used')
  })
})

describe('emails', () => {
  it('login email links to /auth/email-verify with the token', async () => {
    await sendLoginEmail('alice@example.com', [{ id: 'u1', did: 'd', displayName: 'Alice', handle: 'alice' }], 'tok123')
    const msg = mockSend.mock.calls[0][0]
    expect(msg.to).toBe('alice@example.com')
    expect(msg.html).toContain('/auth/email-verify?token=tok123')
  })

  it('login email for an unknown address has no sign-in link (no account enumeration)', async () => {
    await sendLoginEmail('nobody@example.com', [], 'tok123')
    expect(mockSend.mock.calls[0][0].html).not.toContain('tok123')
  })

  // Escaping of user-chosen names in every email: security-races.dbtest.ts
})
