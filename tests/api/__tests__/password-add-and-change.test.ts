/**
 * @jest-environment node
 *
 * add-password encrypts the given seed phrase under the new password, and
 * that blob is what password sign-in decrypts. So the seed must derive the
 * account's DID every time, not only when overwriting an existing password.
 *
 * Accounts that add a password that way keep authMethod SEED_PHRASE, so
 * change-password goes by passwordHash, still behind the current password.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'
import * as bip39 from 'bip39'
import * as ed from '@noble/ed25519'
import { toBase64Url } from '@/lib/utils/encoding/base64url'

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    user: { update: jest.fn().mockResolvedValue({}) },
    // checkRateLimit's upsert; one request per test, never over the limit
    $queryRaw: jest.fn().mockResolvedValue([{ requestCount: 1, windowStartMs: Date.now() }]),
  },
}))
jest.mock('@/lib/auth/server', () => ({
  ...jest.requireActual('@/lib/auth/server'),
  getSessionUser: jest.fn(),
  endOtherSessions: jest.fn().mockResolvedValue(undefined),
}))

import addPassword from '@/pages/api/auth/add-password'
import changePassword from '@/pages/api/auth/change-password'
import { getSessionUser, endOtherSessions } from '@/lib/auth/server'
import { db } from '@/lib/config/database/connection'
import { WRONG_CURRENT_PASSWORD } from '@/lib/auth/current-password'

const mockDb = db as any
const mockGetSessionUser = getSessionUser as jest.Mock

const OWN_SEED = bip39.generateMnemonic()
const OTHER_SEED = bip39.generateMnemonic()
let ownDid: string

const CURRENT = 'Current-pass1'
let currentHash: string

/** Same derivation as did-client.ts and the route. */
async function didFor(mnemonic: string) {
  const seed = await bip39.mnemonicToSeed(mnemonic)
  const publicKey = await ed.getPublicKeyAsync(seed.slice(0, 32))
  return `did:key:ed25519:${toBase64Url(publicKey)}`
}

beforeAll(async () => {
  ownDid = await didFor(OWN_SEED)
  currentHash = await bcrypt.hash(CURRENT, 4)
})

beforeEach(() => {
  jest.clearAllMocks()
})

function seedOnly(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-seed',
    role: 'member',
    authMethod: 'SEED_PHRASE',
    passwordHash: null,
    encryptedSeedPhrase: null,
    did: ownDid,
    originalDid: null,
    ...overrides,
  }
}

async function call(route: (req: NextApiRequest, res: NextApiResponse) => unknown, body: unknown) {
  const req = {
    method: 'POST',
    body,
    url: '/api/auth/x',
    headers: { cookie: 'retro_session=user-seed.secret123; csrf_token=t', 'x-csrf-token': 't' },
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

describe('add-password, first password', () => {
  it("refuses a valid seed phrase that isn't this account's", async () => {
    mockGetSessionUser.mockResolvedValue(seedOnly())
    const res = await call(addPassword, { password: 'New-pass12', seedPhrase: OTHER_SEED })
    expect(res.statusCode).toBe(403)
    expect(mockDb.user.update).not.toHaveBeenCalled()
  })

  it('refuses something that is not a seed phrase', async () => {
    mockGetSessionUser.mockResolvedValue(seedOnly())
    const res = await call(addPassword, { password: 'New-pass12', seedPhrase: 'twelve words of nonsense' })
    expect(res.statusCode).toBe(400)
    expect(mockDb.user.update).not.toHaveBeenCalled()
  })

  it("adds the password with the account's own seed and keeps SEED_PHRASE", async () => {
    mockGetSessionUser.mockResolvedValue(seedOnly())
    const res = await call(addPassword, { password: 'New-pass12', seedPhrase: OWN_SEED })
    expect(res.statusCode).toBe(200)
    const { data } = mockDb.user.update.mock.calls[0][0]
    expect(Object.keys(data).sort()).toEqual(['encryptedSeedPhrase', 'passwordHash'])
    // nothing to reset yet, so other sessions stay
    expect(endOtherSessions).not.toHaveBeenCalled()
  })

  it('accepts the seed of the original DID after a RingHub migration', async () => {
    mockGetSessionUser.mockResolvedValue(seedOnly({ did: 'did:web:migrated', originalDid: ownDid }))
    const res = await call(addPassword, { password: 'New-pass12', seedPhrase: OWN_SEED })
    expect(res.statusCode).toBe(200)
  })
})

describe('add-password, overwriting a password', () => {
  it("still refuses a seed that isn't this account's", async () => {
    mockGetSessionUser.mockResolvedValue(seedOnly({ passwordHash: currentHash, encryptedSeedPhrase: 'old' }))
    const res = await call(addPassword, { password: 'New-pass12', seedPhrase: OTHER_SEED })
    expect(res.statusCode).toBe(403)
    expect(mockDb.user.update).not.toHaveBeenCalled()
  })

  it('resets with the right seed and signs out everywhere else', async () => {
    mockGetSessionUser.mockResolvedValue(seedOnly({ passwordHash: currentHash, encryptedSeedPhrase: 'old' }))
    const res = await call(addPassword, { password: 'New-pass12', seedPhrase: OWN_SEED })
    expect(res.statusCode).toBe(200)
    expect(endOtherSessions).toHaveBeenCalledWith(expect.anything(), 'user-seed')
  })
})

describe('change-password for an account that added a password', () => {
  const added = () => seedOnly({ passwordHash: currentHash, encryptedSeedPhrase: 'blob' })

  it('changes it with the current password, authMethod still SEED_PHRASE', async () => {
    mockGetSessionUser.mockResolvedValue(added())
    const res = await call(changePassword, { currentPassword: CURRENT, newPassword: 'New-pass12', encryptedSeedPhrase: 'b' })
    expect(res.statusCode).toBe(200)
    expect(mockDb.user.update).toHaveBeenCalledTimes(1)
    expect(endOtherSessions).toHaveBeenCalledWith(expect.anything(), 'user-seed')
  })

  it('still needs the right current password', async () => {
    mockGetSessionUser.mockResolvedValue(added())
    const res = await call(changePassword, { currentPassword: 'guess', newPassword: 'New-pass12' })
    expect(res.statusCode).toBe(400)
    expect(res.jsonBody).toEqual({ error: WRONG_CURRENT_PASSWORD })
    expect(mockDb.user.update).not.toHaveBeenCalled()
  })

  it('refuses an account with no password at all', async () => {
    mockGetSessionUser.mockResolvedValue(seedOnly())
    const res = await call(changePassword, { currentPassword: 'anything', newPassword: 'New-pass12' })
    expect(res.statusCode).toBe(400)
    expect(res.jsonBody.error).not.toBe(WRONG_CURRENT_PASSWORD)
    expect(mockDb.user.update).not.toHaveBeenCalled()
  })
})
