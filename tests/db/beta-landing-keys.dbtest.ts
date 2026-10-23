/**
 * Campaign landing pages hand out beta keys (pages/api/beta-landing-pages/
 * [slug]/track.ts). That route used to mint a new key on every call, for
 * anyone. Against a real Postgres: closed campaigns mint nothing, one visitor
 * keeps getting the same key, the limits kick in, /complete only trusts the
 * signed-in account that used the key, and a real signup still goes through.
 */
import crypto from 'crypto'
import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/config/database/connection'

process.env.BETA_KEYS_ENABLED = 'true'

// @noble/ed25519 is ESM-only and jest can't parse it; Node's Ed25519 does the
// same verification, so the signature check stays real.
jest.mock('@noble/ed25519', () => {
  const nodeCrypto = jest.requireActual('crypto')
  return {
    verifyAsync: async (sig: Uint8Array, msg: Uint8Array, pub: Uint8Array) =>
      nodeCrypto.verify(
        null,
        Buffer.from(msg),
        nodeCrypto.createPublicKey({
          key: { kty: 'OKP', crv: 'Ed25519', x: Buffer.from(pub).toString('base64url') },
          format: 'jwk',
        }),
        Buffer.from(sig)
      ),
  }
})

// The CSRF token is the browser's job; these call the routes directly
jest.mock('@/lib/server/http/csrf', () => ({
  ...jest.requireActual('@/lib/server/http/csrf'),
  csrfProtection: jest.fn(async () => true),
}))

import track from '@/pages/api/beta-landing-pages/[slug]/track'
import complete from '@/pages/api/beta-landing-pages/[slug]/complete'
import verify from '@/pages/api/auth/verify'
import { TRACK_WINDOWS } from '@/lib/domain/beta/landing-keys'
import { IP_LIMITS } from '@/lib/server/http/rate-limit'
import { toBase64Url } from '@/lib/utils/encoding/base64url'

type Res = { statusCode: number; body: any; headers: Record<string, any> }

async function call(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<unknown>,
  opts: { slug: string; ip?: string; body?: unknown; cookie?: string; method?: string }
): Promise<Res> {
  const headers: Record<string, string> = { 'user-agent': 'Mozilla/5.0 test' }
  if (opts.ip) headers['x-forwarded-for'] = opts.ip
  if (opts.cookie) headers.cookie = opts.cookie
  const req = {
    method: opts.method ?? 'POST',
    query: { slug: opts.slug },
    body: opts.body ?? {},
    headers,
    cookies: {},
    socket: { remoteAddress: opts.ip },
  } as unknown as NextApiRequest
  const res: any = {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(c: number) { this.statusCode = c; return this },
    json(b: unknown) { this.body = b; return this },
    setHeader(k: string, v: unknown) { this.headers[k.toLowerCase()] = v; return this },
    end() { return this },
  }
  await handler(req, res as NextApiResponse)
  return res
}

// The in-memory track limiter lives for the whole file, so each test gets its own IPs
let ipSeq = 0
const freshIp = () => `203.0.113.${++ipSeq}`

async function campaign(slug: string, data: Record<string, unknown> = {}) {
  return db.betaLandingPage.create({
    data: { name: slug, slug, title: slug, createdBy: 'u_admin', signupLimit: 50, ...data },
  })
}

/** A new account through /api/auth/verify with `betaKey`, from `ip`. */
async function signUp(betaKey: string, ip: string) {
  const { publicKey: pub, privateKey } = crypto.generateKeyPairSync('ed25519')
  const publicKey = Buffer.from(pub.export({ format: 'jwk' }).x!, 'base64url')
  const nonce = `nonce-${crypto.randomUUID()}`
  const signature = crypto.sign(null, Buffer.from(nonce), privateKey)
  const res = await call(verify as never, {
    slug: '',
    ip,
    cookie: `retro_nonce=${nonce}.${Date.now() + 60_000}`,
    body: {
      did: `did:key:ed25519:${toBase64Url(publicKey)}`,
      publicKey: toBase64Url(publicKey),
      signature: toBase64Url(signature),
      betaKey,
    },
  })
  const cookie = ((res.headers['set-cookie'] ?? []) as string[]).map((c) => c.split(';')[0]).join('; ')
  return { res, cookie, userId: res.body?.userId as string | undefined }
}

beforeEach(async () => {
  await db.$executeRawUnsafe(
    'TRUNCATE "User", "BetaKey", "BetaInviteCode", "BetaLandingPage", "BetaLandingSignup", "SignupAttempt", "IpSignupTracking", "RateLimit" RESTART IDENTITY CASCADE'
  )
  await db.user.create({ data: { id: 'u_admin', did: 'did:test:admin', role: 'admin' } })
})

afterAll(async () => {
  await db.$disconnect()
})

describe('track only hands out keys for an open campaign', () => {
  it.each([
    ['inactive', { isActive: false }, /inactive/],
    ['paused', { isPaused: true }, /paused/],
    ['ended', { endedAt: new Date() }, /ended/],
  ])('%s campaign mints nothing', async (slug, data, message) => {
    await campaign(slug, data)
    const res = await call(track, { slug, ip: freshIp() })
    expect(res.statusCode).toBe(400)
    expect(res.body.error).toMatch(message)
    expect(await db.betaKey.count()).toBe(0)
    expect(await db.betaLandingSignup.count()).toBe(0)
  })

  it('a full campaign mints nothing, even when its limitReached flag is stale', async () => {
    const page = await campaign('full', { signupLimit: 1, limitReached: false })
    await db.betaLandingSignup.create({ data: { landingPageId: page.id, status: 'completed', ipAddress: '198.51.100.1' } })
    const res = await call(track, { slug: 'full', ip: freshIp() })
    expect(res.statusCode).toBe(400)
    expect(res.body.error).toMatch(/maximum number of signups/)
    expect(await db.betaKey.count()).toBe(0)
  })

  it('an unknown campaign is a 404', async () => {
    const res = await call(track, { slug: 'nope', ip: freshIp() })
    expect(res.statusCode).toBe(404)
    expect(await db.betaKey.count()).toBe(0)
  })
})

describe('one visitor, one key', () => {
  it('asking again returns the same unused key', async () => {
    await campaign('open')
    const ip = freshIp()
    const first = await call(track, { slug: 'open', ip })
    const second = await call(track, { slug: 'open', ip })
    expect(first.statusCode).toBe(200)
    expect(first.body.betaKey).toMatch(/^BETA-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/)
    expect(second.body).toEqual(first.body)
    expect(await db.betaKey.count()).toBe(1)
    expect(await db.betaLandingSignup.count()).toBe(1)
    expect(await db.signupAttempt.count()).toBe(1)
  })

  it('parallel clicks still make one key', async () => {
    await campaign('open')
    const ip = freshIp()
    const results = await Promise.all(Array.from({ length: 5 }, () => call(track, { slug: 'open', ip })))
    expect(results.map((r) => r.statusCode)).toEqual([200, 200, 200, 200, 200])
    expect(new Set(results.map((r) => r.body.betaKey)).size).toBe(1)
    expect(await db.betaKey.count()).toBe(1)
  })

  it('different visitors get different keys', async () => {
    await campaign('open')
    const a = await call(track, { slug: 'open', ip: freshIp() })
    const b = await call(track, { slug: 'open', ip: freshIp() })
    expect(a.body.betaKey).not.toBe(b.body.betaKey)
    expect(await db.betaKey.count()).toBe(2)
  })

  it('no IP, no key', async () => {
    await campaign('open')
    const res = await call(track, { slug: 'open' })
    expect(res.statusCode).toBe(400)
    expect(await db.betaKey.count()).toBe(0)
  })
})

describe('limits', () => {
  it(`caps track calls at ${TRACK_WINDOWS[0].max} a minute per IP`, async () => {
    await campaign('open')
    const ip = freshIp()
    const statuses: number[] = []
    for (let i = 0; i < TRACK_WINDOWS[0].max + 1; i++) statuses.push((await call(track, { slug: 'open', ip })).statusCode)
    expect(statuses).toEqual([...Array(TRACK_WINDOWS[0].max).fill(200), 429])
    expect(await db.betaKey.count()).toBe(1)
  })

  it('an IP with too many failed signup attempts this hour gets no key', async () => {
    await campaign('open')
    const ip = freshIp()
    await db.signupAttempt.createMany({
      data: Array.from({ length: IP_LIMITS.MAX_FAILED_ATTEMPTS_PER_HOUR }, () => ({ ipAddress: ip, success: false })),
    })
    const res = await call(track, { slug: 'open', ip })
    expect(res.statusCode).toBe(429)
    expect(await db.betaKey.count()).toBe(0)
  })

  it('a blocked IP gets no key', async () => {
    await campaign('open')
    const ip = freshIp()
    await db.ipSignupTracking.create({ data: { ipAddress: ip, isBlocked: true, blockedReason: 'spam' } })
    const res = await call(track, { slug: 'open', ip })
    expect(res.statusCode).toBe(429)
    expect(await db.betaKey.count()).toBe(0)
  })

  it('once its key has made an account, the IP gets no new key, even if /complete never came', async () => {
    await campaign('open')
    const ip = freshIp()
    const claimed = await call(track, { slug: 'open', ip })
    const { res } = await signUp(claimed.body.betaKey, ip)
    expect(res.statusCode).toBe(200)

    const again = await call(track, { slug: 'open', ip })
    expect(again.statusCode).toBe(429)
    expect(again.body.error).toMatch(/once per campaign/)
    expect(await db.betaKey.count()).toBe(1)
  })
})

describe('happy path', () => {
  it('claim a key, sign up with it, complete the campaign signup', async () => {
    const page = await campaign('launch', { signupLimit: 2 })
    const ip = freshIp()

    const claimed = await call(track, { slug: 'launch', ip })
    expect(claimed.statusCode).toBe(200)

    const { res, cookie, userId } = await signUp(claimed.body.betaKey, ip)
    expect(res.statusCode).toBe(200)
    expect(await db.betaKey.findUnique({ where: { key: claimed.body.betaKey } })).toMatchObject({ usedBy: userId })

    const done = await call(complete, { slug: 'launch', ip, cookie, body: { signupId: claimed.body.signupId, userId } })
    expect(done.statusCode).toBe(200)
    expect(done.body).toMatchObject({ totalSignups: 1, limitReached: false })
    expect(await db.betaLandingSignup.findUnique({ where: { id: claimed.body.signupId } })).toMatchObject({
      status: 'completed',
      userId,
    })
    expect(await db.signupAttempt.findFirst({ where: { betaCode: claimed.body.betaKey } })).toMatchObject({
      success: true,
      userId,
    })
    expect(await db.betaLandingPage.findUnique({ where: { id: page.id } })).toMatchObject({ signupCount: 1 })

    // Calling it twice doesn't count twice
    const repeat = await call(complete, { slug: 'launch', ip, cookie, body: { signupId: claimed.body.signupId } })
    expect(repeat.body.totalSignups).toBe(1)
    expect(await db.ipSignupTracking.findUnique({ where: { ipAddress: ip } })).toMatchObject({ successfulSignups: 1 })
  })

  it('an admin-made key from before still signs up', async () => {
    await db.betaKey.create({ data: { key: 'BETA-AAAA-BBBB-CCCC' } })
    const { res } = await signUp('BETA-AAAA-BBBB-CCCC', freshIp())
    expect(res.statusCode).toBe(200)
  })
})

describe('complete only trusts the account that used the key', () => {
  it('signed out is a 401 and changes nothing', async () => {
    await campaign('open')
    const claimed = await call(track, { slug: 'open', ip: freshIp() })
    const res = await call(complete, { slug: 'open', body: { signupId: claimed.body.signupId, userId: 'u_admin' } })
    expect(res.statusCode).toBe(401)
    expect(await db.betaLandingSignup.count({ where: { status: 'completed' } })).toBe(0)
  })

  it("another account can't complete a signup whose key it didn't use", async () => {
    await campaign('open')
    const mine = await call(track, { slug: 'open', ip: freshIp() })
    const someoneElse = await call(track, { slug: 'open', ip: freshIp() })
    const { cookie } = await signUp(mine.body.betaKey, freshIp())

    const res = await call(complete, { slug: 'open', cookie, body: { signupId: someoneElse.body.signupId } })
    expect(res.statusCode).toBe(404)
    expect(await db.betaLandingSignup.count({ where: { status: 'completed' } })).toBe(0)
  })

  it("a started signup can't be completed before its key is used", async () => {
    await campaign('open')
    const claimed = await call(track, { slug: 'open', ip: freshIp() })
    await db.betaKey.create({ data: { key: 'BETA-AAAA-BBBB-CCCC' } })
    const { cookie } = await signUp('BETA-AAAA-BBBB-CCCC', freshIp())
    const res = await call(complete, { slug: 'open', cookie, body: { signupId: claimed.body.signupId } })
    expect(res.statusCode).toBe(404)
    expect(await db.betaLandingSignup.count({ where: { status: 'completed' } })).toBe(0)
  })
})
