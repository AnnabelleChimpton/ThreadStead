/**
 * Rate limits on the anonymous auth routes, run through the real handlers
 * against a real Postgres. Only the outbound mail client (Resend) and the
 * session lookup are mocked.
 */
import { randomBytes } from 'crypto'
import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/config/database/connection'

const mockSend = jest.fn(async (_msg: { to: string; subject: string; html: string }) => ({}))
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send: (msg: never) => mockSend(msg) } })),
}))
jest.mock('@/lib/auth/server', () => ({
  ...jest.requireActual('@/lib/auth/server'),
  getSessionUser: jest.fn(async () => null),
}))

process.env.EMAIL_ENCRYPTION_KEY = randomBytes(32).toString('hex')
process.env.RESEND_FROM_EMAIL = 'hello@threadstead.test'

import { RATE_LIMIT_CONFIGS } from '@/lib/server/http/rate-limit'
import { emailLimiterKey, encryptEmail } from '@/lib/utils/security/email-encryption'
import emailLogin from '@/pages/api/auth/email-login'
import requestPasswordReset from '@/pages/api/auth/request-password-reset'
import getEncryptedSeed from '@/pages/api/auth/get-encrypted-seed'

const RECIPIENT = RATE_LIMIT_CONFIGS.email_recipient
const RECIPIENT_DAILY = RATE_LIMIT_CONFIGS.email_recipient_daily
const SENDER = RATE_LIMIT_CONFIGS.email_send
const AUTH = RATE_LIMIT_CONFIGS.auth

type Route = (req: NextApiRequest, res: NextApiResponse) => Promise<void>

function fakeRes() {
  const headers: Record<string, string> = {}
  const r = {
    statusCode: 200,
    body: undefined as unknown,
    headers,
    headersSent: false,
    setHeader: (k: string, v: string) => ((headers[k] = v), r),
    status: (c: number) => ((r.statusCode = c), r),
    json: (b: unknown) => ((r.body = b), (r.headersSent = true), r),
    end: () => ((r.headersSent = true), r),
  }
  return r
}

async function call(route: Route, opts: { method?: string; ip?: string; body?: unknown; query?: Record<string, string> }) {
  const req = {
    method: opts.method ?? 'POST',
    url: '/api/test',
    headers: { 'x-forwarded-for': opts.ip ?? '203.0.113.7', 'user-agent': 'jest' },
    socket: {},
    body: opts.body ?? {},
    query: opts.query ?? {},
    cookies: {},
  } as unknown as NextApiRequest
  const res = fakeRes()
  await route(req, res as unknown as NextApiResponse)
  return res
}

/** The body minus resetTime, which is a timestamp and differs by milliseconds. */
function shape(res: ReturnType<typeof fakeRes>) {
  const { resetTime: _resetTime, ...rest } = (res.body ?? {}) as Record<string, unknown>
  return { status: res.statusCode, body: rest }
}

const login = (email: string, ip?: string, username = 'alice') =>
  call(emailLogin as Route, { ip, body: { email, username } })

let seq = 0
async function user(handle: string, email: string | null, extra: Record<string, unknown> = {}) {
  return db.user.create({
    data: {
      id: `u_${handle}`,
      did: `did:test:${handle}:${seq++}`,
      encryptedEmail: email ? encryptEmail(email) : null,
      emailVerifiedAt: email ? new Date() : null,
      handles: { create: { handle, host: 'local' } },
      profile: { create: { displayName: handle.toUpperCase() } },
      ...extra,
    },
  })
}

beforeEach(async () => {
  await db.rateLimit.deleteMany({})
  await db.emailLoginToken.deleteMany({})
  await db.signupAttempt.deleteMany({})
  await db.$executeRawUnsafe('TRUNCATE "User" RESTART IDENTITY CASCADE')
  mockSend.mockClear()
})

afterAll(async () => {
  await db.$disconnect()
})

describe('emailLimiterKey', () => {
  it('is a keyed hash, the same for every spelling of one inbox', () => {
    const key = emailLimiterKey('Alice@Example.com')
    expect(key).toMatch(/^[0-9a-f]{64}$/)
    expect(emailLimiterKey(' alice@example.com ')).toBe(key)
    expect(emailLimiterKey('alice+news@example.com')).toBe(key)
    expect(emailLimiterKey('a.l.ice@gmail.com')).toBe(emailLimiterKey('alice@googlemail.com'))
    expect(emailLimiterKey('a.lice@example.com')).not.toBe(key) // dots only fold on Gmail
    expect(emailLimiterKey('bob@example.com')).not.toBe(key)
  })
})

describe('email-login', () => {
  it('stops emailing one address after the per-address limit, whatever the IP', async () => {
    for (let i = 0; i < RECIPIENT.limit; i++) {
      expect((await login('victim@example.com', `198.51.100.${i}`)).statusCode).toBe(200)
    }
    const res = await login('victim@example.com', '198.51.100.200')
    expect(res.statusCode).toBe(429)
    expect((res.body as { error: string }).error).toMatch(/that address/i)
    expect(Number(res.headers['Retry-After'])).toBeGreaterThan(0)
    expect(mockSend).toHaveBeenCalledTimes(RECIPIENT.limit)
  })

  it('folds +tags and Gmail dots into one recipient count', async () => {
    for (let i = 0; i < RECIPIENT.limit; i++) {
      await login(`vic.tim+${i}@gmail.com`, `198.51.100.${i}`)
    }
    expect((await login('victim@gmail.com', '198.51.100.200')).statusCode).toBe(429)
  })

  it('leaves other addresses alone', async () => {
    for (let i = 0; i < RECIPIENT.limit + 1; i++) await login('victim@example.com', `198.51.100.${i}`)
    const res = await login('someone-else@example.com', '198.51.100.201')
    expect(res.statusCode).toBe(200)
    expect(mockSend).toHaveBeenLastCalledWith(expect.objectContaining({ to: 'someone-else@example.com' }))
  })

  it('caps one IP across many addresses', async () => {
    for (let i = 0; i < SENDER.limit; i++) {
      expect((await login(`target${i}@example.com`, '203.0.113.66')).statusCode).toBe(200)
    }
    const res = await login('one-more@example.com', '203.0.113.66')
    expect(res.statusCode).toBe(429)
    expect(mockSend).toHaveBeenCalledTimes(SENDER.limit)
    // A different IP is still fine
    expect((await login('one-more@example.com', '203.0.113.67')).statusCode).toBe(200)
  })

  it('caps one address per day, not just per 15 minutes', async () => {
    let ip = 0
    const send = () => login('victim@example.com', `198.51.100.${ip++}`)
    for (let sent = 0; sent < RECIPIENT_DAILY.limit; sent += RECIPIENT.limit) {
      for (let i = 0; i < RECIPIENT.limit && sent + i < RECIPIENT_DAILY.limit; i++) {
        expect((await send()).statusCode).toBe(200)
      }
      // Age the short window out; the daily one keeps counting
      await db.rateLimit.updateMany({
        where: { category: 'email_recipient' },
        data: { windowStart: new Date(Date.now() - RECIPIENT.windowMs - 1000) },
      })
    }
    expect((await send()).statusCode).toBe(429)
    expect(mockSend).toHaveBeenCalledTimes(RECIPIENT_DAILY.limit)
  })

  it('never stores the address in the limiter', async () => {
    await login('victim@example.com')
    const ids = (await db.rateLimit.findMany()).map((r) => r.identifier)
    expect(ids).toContain(`email:${emailLimiterKey('victim@example.com')}`)
    expect(ids.join(' ')).not.toMatch(/victim|example/)
  })

  it('answers the same for an address with an account and one without, limited or not', async () => {
    await user('alice', 'alice@example.com')
    const withAccount: ReturnType<typeof shape>[] = []
    const without: ReturnType<typeof shape>[] = []
    for (let i = 0; i < RECIPIENT.limit + 1; i++) {
      withAccount.push(shape(await login('alice@example.com', `198.51.100.${i}`)))
      without.push(shape(await login('nobody@example.com', `198.51.100.${100 + i}`)))
    }
    expect(withAccount).toEqual(without)
    expect(withAccount.map((r) => r.status)).toEqual([...Array(RECIPIENT.limit).fill(200), 429])
  })

  it('does not count malformed requests against the address', async () => {
    for (let i = 0; i < RECIPIENT.limit + 2; i++) {
      expect((await call(emailLogin as Route, { body: { email: 'victim@example.com' } })).statusCode).toBe(400)
    }
    expect((await login('victim@example.com', '198.51.100.9')).statusCode).toBe(200)
  })
})

describe('request-password-reset', () => {
  const reset = (email: string, ip: string) => call(requestPasswordReset as Route, { ip, body: { email } })

  it('shares the per-address count with login links', async () => {
    for (let i = 0; i < RECIPIENT.limit; i++) await login('victim@example.com', `198.51.100.${i}`)
    expect((await reset('victim@example.com', '198.51.100.150')).statusCode).toBe(429)
    expect((await reset('other@example.com', '198.51.100.151')).statusCode).toBe(200)
  })

  it('answers the same whether or not the address is registered, limited or not', async () => {
    await user('alice', 'alice@example.com')
    const a: ReturnType<typeof shape>[] = []
    const b: ReturnType<typeof shape>[] = []
    for (let i = 0; i < RECIPIENT.limit + 1; i++) {
      a.push(shape(await reset('alice@example.com', `198.51.100.${i}`)))
      b.push(shape(await reset('nobody@example.com', `198.51.100.${100 + i}`)))
    }
    expect(a).toEqual(b)
    expect(a.at(-1)?.status).toBe(429)
    // Only the registered address got mail, so the check ran before the lookup
    expect(mockSend.mock.calls.every(([m]) => m.to === 'alice@example.com')).toBe(true)
  })
})

describe('get-encrypted-seed', () => {
  const lookup = (username: string, ip = '203.0.113.80') =>
    call(getEncryptedSeed as Route, { method: 'GET', ip, query: { username } })

  it('caps lookups per IP, across usernames', async () => {
    await user('alice', null, { encryptedSeedPhrase: 'blob', authMethod: 'PASSWORD' })
    for (let i = 0; i < AUTH.limit; i++) {
      expect([200, 404]).toContain((await lookup(i % 2 ? 'alice' : `nobody${i}`)).statusCode)
    }
    expect((await lookup('alice')).statusCode).toBe(429)
    const other = await lookup('alice', '203.0.113.81')
    expect(other.statusCode).toBe(200)
    expect(other.body).toEqual({ encryptedSeedPhrase: 'blob' })
  })
})
