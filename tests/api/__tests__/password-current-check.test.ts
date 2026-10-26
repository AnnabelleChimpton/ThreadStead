/**
 * @jest-environment node
 *
 * A session alone can't replace a password. save-password, change-password
 * and update-encrypted-seed (the blob password sign-in decrypts) all need the
 * current password once the account has one, checked with bcrypt against
 * passwordHash, and every check counts against a per-user `password_checks`
 * limit. A first password at signup still needs only a fresh session.
 *
 * The real rate limiter runs here; only its one SQL statement is faked by an
 * in-memory counter.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'

jest.mock('@/lib/config/database/connection', () => {
  const counts = new Map<string, number>()
  return {
    db: {
      __counts: counts,
      user: { update: jest.fn().mockResolvedValue({}) },
      session: { findUnique: jest.fn() },
      // checkRateLimit's upsert: values are (id, identifier, category, ...)
      $queryRaw: jest.fn((_strings: TemplateStringsArray, ...values: unknown[]) => {
        const key = `${values[1]}|${values[2]}`
        const n = (counts.get(key) ?? 0) + 1
        counts.set(key, n)
        return Promise.resolve([{ requestCount: n, windowStartMs: Date.now() }])
      }),
    },
  }
})
jest.mock('@/lib/auth/server', () => ({
  ...jest.requireActual('@/lib/auth/server'),
  getSessionUser: jest.fn(),
  endOtherSessions: jest.fn().mockResolvedValue(undefined),
}))

import savePassword from '@/pages/api/auth/save-password'
import changePassword from '@/pages/api/auth/change-password'
import updateEncryptedSeed from '@/pages/api/auth/update-encrypted-seed'
import { getSessionUser } from '@/lib/auth/server'
import { db } from '@/lib/config/database/connection'
import { WRONG_CURRENT_PASSWORD, RECENT_SIGN_IN_MS } from '@/lib/auth/current-password'

/** An encrypted phrase in the shape the routes take (lib/auth/password-requests.ts): base64, 88+ characters */
const blob = (tag: string) => Buffer.from(tag.padEnd(66, '.')).toString('base64')
import { RATE_LIMIT_CONFIGS } from '@/lib/server/http/rate-limit'

const mockDb = db as any
const mockGetSessionUser = getSessionUser as jest.Mock

const CURRENT = 'Current-pass1'
let currentHash: string

beforeAll(async () => {
  // Cheap rounds; bcrypt.compare reads the cost from the hash
  currentHash = await bcrypt.hash(CURRENT, 4)
})

beforeEach(() => {
  jest.clearAllMocks()
  mockDb.__counts.clear()
  sessionIssued(0)
})

function sessionIssued(msAgo: number) {
  mockDb.session.findUnique.mockResolvedValue({ issuedAt: new Date(Date.now() - msAgo) })
}

function withPassword(id = 'user-pw') {
  return { id, role: 'member', authMethod: 'PASSWORD', passwordHash: currentHash, encryptedSeedPhrase: 'old-blob' }
}

function withoutPassword(id = 'user-seed') {
  return { id, role: 'member', authMethod: 'SEED_PHRASE', passwordHash: null, encryptedSeedPhrase: null }
}

async function call(route: (req: NextApiRequest, res: NextApiResponse) => Promise<void>, body: unknown) {
  const req = {
    method: 'POST',
    body,
    url: '/api/auth/x',
    headers: { cookie: 'retro_session=user-pw.secret123; csrf_token=t', 'x-csrf-token': 't' },
    socket: { remoteAddress: '127.0.0.1' },
  } as unknown as NextApiRequest
  const res: any = {
    statusCode: 200,
    jsonBody: undefined,
    headersSent: false,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: any) {
      this.jsonBody = payload
      this.headersSent = true
      return this
    },
    setHeader: jest.fn(),
  }
  await route(req, res)
  return res as { statusCode: number; jsonBody: any }
}

const LIMIT = RATE_LIMIT_CONFIGS.password_checks.limit

describe('save-password', () => {
  it('refuses to replace a password without the current one', async () => {
    mockGetSessionUser.mockResolvedValue(withPassword())
    const res = await call(savePassword, { password: 'Attacker-pass1', encryptedSeedPhrase: blob('evil') })
    expect(res.statusCode).toBe(400)
    expect(res.jsonBody).toEqual({ error: WRONG_CURRENT_PASSWORD })
    expect(mockDb.user.update).not.toHaveBeenCalled()
  })

  it('refuses a wrong current password with the same message', async () => {
    mockGetSessionUser.mockResolvedValue(withPassword())
    const res = await call(savePassword, { password: 'Attacker-pass1', currentPassword: 'guess' })
    expect(res.statusCode).toBe(400)
    expect(res.jsonBody).toEqual({ error: WRONG_CURRENT_PASSWORD })
    expect(mockDb.user.update).not.toHaveBeenCalled()
  })

  it('replaces the password when the current one is right', async () => {
    mockGetSessionUser.mockResolvedValue(withPassword())
    const res = await call(savePassword, { password: 'New-pass12', currentPassword: CURRENT, encryptedSeedPhrase: blob('new-blob') })
    expect(res.statusCode).toBe(200)
    expect(mockDb.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-pw' }, data: expect.objectContaining({ encryptedSeedPhrase: blob('new-blob') }) })
    )
  })

  it('treats an encrypted seed with no hash as an existing password', async () => {
    mockGetSessionUser.mockResolvedValue({ ...withoutPassword(), encryptedSeedPhrase: 'blob' })
    const res = await call(savePassword, { password: 'New-pass12', currentPassword: 'anything' })
    expect(res.statusCode).toBe(400)
    expect(mockDb.user.update).not.toHaveBeenCalled()
  })

  it('sets a first password right after sign-in, no current password needed', async () => {
    mockGetSessionUser.mockResolvedValue(withoutPassword())
    sessionIssued(5_000)
    const res = await call(savePassword, { password: 'First-pass1', encryptedSeedPhrase: blob('blob') })
    expect(res.statusCode).toBe(200)
    expect(mockDb.session.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { secret: 'secret123' } })
    )
    expect(mockDb.user.update).toHaveBeenCalledTimes(1)
  })

  it('refuses a first password from an old session', async () => {
    mockGetSessionUser.mockResolvedValue(withoutPassword())
    sessionIssued(RECENT_SIGN_IN_MS + 60_000)
    const res = await call(savePassword, { password: 'First-pass1', encryptedSeedPhrase: blob('blob') })
    expect(res.statusCode).toBe(403)
    expect(mockDb.user.update).not.toHaveBeenCalled()
  })

  it('rate-limits repeated guesses, even a right one after the limit', async () => {
    mockGetSessionUser.mockResolvedValue(withPassword())
    for (let i = 0; i < LIMIT; i++) {
      const res = await call(savePassword, { password: 'New-pass12', currentPassword: `guess-${i}` })
      expect(res.statusCode).toBe(400)
    }
    const blocked = await call(savePassword, { password: 'New-pass12', currentPassword: CURRENT })
    expect(blocked.statusCode).toBe(429)
    expect(mockDb.user.update).not.toHaveBeenCalled()
  })

  it('counts guesses per user', async () => {
    mockGetSessionUser.mockResolvedValue(withPassword('user-a'))
    for (let i = 0; i < LIMIT; i++) await call(savePassword, { password: 'x', currentPassword: 'guess' })
    mockGetSessionUser.mockResolvedValue(withPassword('user-b'))
    const res = await call(savePassword, { password: 'New-pass12', currentPassword: CURRENT })
    expect(res.statusCode).toBe(200)
  })
})

describe('change-password', () => {
  it('refuses a wrong current password', async () => {
    mockGetSessionUser.mockResolvedValue(withPassword())
    const res = await call(changePassword, { currentPassword: 'guess', newPassword: 'New-pass12' })
    expect(res.statusCode).toBe(400)
    expect(res.jsonBody).toEqual({ error: WRONG_CURRENT_PASSWORD })
    expect(mockDb.user.update).not.toHaveBeenCalled()
  })

  it('changes the password with the right one', async () => {
    mockGetSessionUser.mockResolvedValue(withPassword())
    const res = await call(changePassword, { currentPassword: CURRENT, newPassword: 'New-pass12', encryptedSeedPhrase: blob('b') })
    expect(res.statusCode).toBe(200)
    expect(mockDb.user.update).toHaveBeenCalledTimes(1)
  })

  it('rate-limits repeated wrong attempts', async () => {
    mockGetSessionUser.mockResolvedValue(withPassword())
    for (let i = 0; i < LIMIT; i++) {
      expect((await call(changePassword, { currentPassword: 'guess', newPassword: 'New-pass12' })).statusCode).toBe(400)
    }
    const blocked = await call(changePassword, { currentPassword: CURRENT, newPassword: 'New-pass12' })
    expect(blocked.statusCode).toBe(429)
    expect(mockDb.user.update).not.toHaveBeenCalled()
  })
})

describe('update-encrypted-seed', () => {
  it('refuses to overwrite the encrypted seed without the current password', async () => {
    mockGetSessionUser.mockResolvedValue(withPassword())
    const res = await call(updateEncryptedSeed, { encryptedSeedPhrase: blob('evil') })
    expect(res.statusCode).toBe(400)
    expect(mockDb.user.update).not.toHaveBeenCalled()
  })

  it('updates it with the current password', async () => {
    mockGetSessionUser.mockResolvedValue(withPassword())
    const res = await call(updateEncryptedSeed, { encryptedSeedPhrase: blob('new'), currentPassword: CURRENT })
    expect(res.statusCode).toBe(200)
    expect(mockDb.user.update).toHaveBeenCalledWith({ where: { id: 'user-pw' }, data: { encryptedSeedPhrase: blob('new') } })
  })
})

describe('the strength rule is checked on the server too', () => {
  test('a first password that breaks it is refused, in its words', async () => {
    mockGetSessionUser.mockResolvedValue({ id: 'user-new', passwordHash: null, encryptedSeedPhrase: null })
    const res = await call(savePassword, { password: 'a', encryptedSeedPhrase: blob('blob') })
    expect(res.statusCode).toBe(400)
    expect(res.jsonBody.error).toBe('Password must be at least 8 characters long')
    expect(mockDb.user.update).not.toHaveBeenCalled()
  })

  test("a saved phrase that isn't one is refused: sign-in decrypts it", async () => {
    mockGetSessionUser.mockResolvedValue({ id: 'user-new', passwordHash: null, encryptedSeedPhrase: null })
    const res = await call(savePassword, { password: 'First-pass1', encryptedSeedPhrase: 'not base64!' })
    expect(res.statusCode).toBe(400)
    expect(mockDb.user.update).not.toHaveBeenCalled()
  })
})
