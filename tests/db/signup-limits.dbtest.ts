/**
 * Per-IP signup caps (IP_LIMITS) for ordinary signups through
 * /api/auth/verify, against a real Postgres. validateSignupLimits counts
 * successful SignupAttempt rows, which only the beta landing flow used to
 * write, so these caps never fired for anyone else.
 */
import crypto from 'crypto'
import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/config/database/connection'

process.env.BETA_KEYS_ENABLED = 'false'

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

import verify from '@/pages/api/auth/verify'
import requestPasswordReset from '@/pages/api/auth/request-password-reset'
import { IP_LIMITS, SIGNUP_LIMIT_MESSAGES } from '@/lib/server/http/rate-limit'
import { toBase64Url } from '@/lib/utils/encoding/base64url'

type Res = { statusCode: number; body: any; headers: Record<string, any> }
type Key = { did: string; publicKey: Buffer; privateKey: crypto.KeyObject }

async function call(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<unknown>,
  opts: { ip: string; body?: unknown; cookie?: string }
): Promise<Res> {
  const headers: Record<string, string> = { 'user-agent': 'Mozilla/5.0 test', 'x-forwarded-for': opts.ip }
  if (opts.cookie) headers.cookie = opts.cookie
  const req = {
    method: 'POST',
    url: '/api/test',
    query: {},
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

function newKey(): Key {
  const { publicKey: pub, privateKey } = crypto.generateKeyPairSync('ed25519')
  const publicKey = Buffer.from(pub.export({ format: 'jwk' }).x!, 'base64url')
  return { did: `did:key:ed25519:${toBase64Url(publicKey)}`, publicKey, privateKey }
}

/** Signs in with `key` from `ip`; a key with no account makes one. */
async function signIn(key: Key, ip: string, betaKey?: string) {
  const nonce = `nonce-${crypto.randomUUID()}`
  return call(verify as never, {
    ip,
    cookie: `retro_nonce=${nonce}.${Date.now() + 60_000}`,
    body: {
      did: key.did,
      publicKey: toBase64Url(key.publicKey),
      signature: toBase64Url(crypto.sign(null, Buffer.from(nonce), key.privateKey)),
      betaKey,
    },
  })
}

const signUp = (ip: string, betaKey?: string) => signIn(newKey(), ip, betaKey)

/** Moves every success row for `ip` back by `ms`. */
async function age(ip: string, ms: number) {
  await db.signupAttempt.updateMany({
    where: { ipAddress: ip },
    data: { attemptedAt: new Date(Date.now() - ms) },
  })
}

const HOUR = 60 * 60 * 1000
let ipSeq = 0
const freshIp = () => `198.51.100.${++ipSeq}`

beforeEach(async () => {
  await db.$executeRawUnsafe(
    'TRUNCATE "User", "BetaKey", "BetaLandingPage", "BetaLandingSignup", "SignupAttempt", "IpSignupTracking", "RateLimit" RESTART IDENTITY CASCADE'
  )
})

afterAll(async () => {
  await db.$disconnect()
})

describe('a normal signup counts against its IP', () => {
  it('writes one successful attempt for the new account', async () => {
    const ip = freshIp()
    const res = await signUp(ip)
    expect(res.statusCode).toBe(200)
    expect(await db.signupAttempt.findMany({ where: { ipAddress: ip } })).toEqual([
      expect.objectContaining({ success: true, userId: res.body.userId, landingPageId: null }),
    ])
    expect(await db.ipSignupTracking.findUnique({ where: { ipAddress: ip } })).toMatchObject({
      signupAttempts: 1,
      successfulSignups: 1,
    })
  })

  it(`stops at ${IP_LIMITS.MAX_SIGNUPS_PER_IP_PER_HOUR} an hour`, async () => {
    const ip = freshIp()
    for (let i = 0; i < IP_LIMITS.MAX_SIGNUPS_PER_IP_PER_HOUR; i++) {
      expect((await signUp(ip)).statusCode).toBe(200)
    }
    const res = await signUp(ip)
    expect(res.statusCode).toBe(429)
    expect(res.body.error).toBe(SIGNUP_LIMIT_MESSAGES.hour)
    expect(await db.user.count()).toBe(IP_LIMITS.MAX_SIGNUPS_PER_IP_PER_HOUR)
    // Another connection is unaffected
    expect((await signUp(freshIp())).statusCode).toBe(200)
  })

  it(`stops at ${IP_LIMITS.MAX_SIGNUPS_PER_IP_PER_DAY} a day`, async () => {
    const ip = freshIp()
    for (let made = 0; made < IP_LIMITS.MAX_SIGNUPS_PER_IP_PER_DAY; made++) {
      expect((await signUp(ip)).statusCode).toBe(200)
      // Out of the hourly window, still inside the day
      await age(ip, HOUR + 60_000)
    }
    const res = await signUp(ip)
    expect(res.statusCode).toBe(429)
    expect(res.body.error).toBe(SIGNUP_LIMIT_MESSAGES.day)
  })

  it(`stops at ${IP_LIMITS.MAX_SIGNUPS_PER_IP_LIFETIME} ever`, async () => {
    const ip = freshIp()
    await db.signupAttempt.createMany({
      data: Array.from({ length: IP_LIMITS.MAX_SIGNUPS_PER_IP_LIFETIME }, () => ({
        ipAddress: ip,
        success: true,
        attemptedAt: new Date(Date.now() - 30 * 24 * HOUR),
      })),
    })
    const res = await signUp(ip)
    expect(res.statusCode).toBe(429)
    expect(res.body.error).toBe(SIGNUP_LIMIT_MESSAGES.lifetime)
    expect(await db.user.count()).toBe(0)
  })

  it('parallel signups from one IP still stop at the hourly cap', async () => {
    const ip = freshIp()
    const results = await Promise.all(Array.from({ length: 5 }, () => signUp(ip)))
    const statuses = results.map((r) => r.statusCode).sort()
    expect(statuses).toEqual([200, 200, 429, 429, 429])
    expect(await db.user.count()).toBe(IP_LIMITS.MAX_SIGNUPS_PER_IP_PER_HOUR)
    expect(await db.signupAttempt.count({ where: { ipAddress: ip, success: true } })).toBe(
      IP_LIMITS.MAX_SIGNUPS_PER_IP_PER_HOUR
    )
  })
})

describe('signing in is not a signup', () => {
  it('an existing account signs in from an IP at its cap, and adds no rows', async () => {
    const ip = freshIp()
    const me = newKey()
    expect((await signIn(me, ip)).statusCode).toBe(200)
    expect((await signUp(ip)).statusCode).toBe(200)
    expect((await signUp(ip)).statusCode).toBe(429)

    const before = await db.signupAttempt.count()
    const res = await signIn(me, ip)
    expect(res.statusCode).toBe(200)
    expect(await db.signupAttempt.count()).toBe(before)
  })

  it('a password reset request is not held back by signup caps', async () => {
    const ip = freshIp()
    await db.signupAttempt.createMany({
      data: Array.from({ length: IP_LIMITS.MAX_SIGNUPS_PER_IP_PER_HOUR }, () => ({ ipAddress: ip, success: true })),
    })
    expect((await signUp(ip)).statusCode).toBe(429)
    const res = await call(requestPasswordReset as never, { ip, body: { email: 'someone@example.com' } })
    expect(res.statusCode).toBe(200)
  })
})

describe('beta landing signups', () => {
  it('mark the attempt row from claiming the key instead of adding a second one', async () => {
    const ip = freshIp()
    const admin = await db.user.create({ data: { did: 'did:test:admin', role: 'admin' } })
    const page = await db.betaLandingPage.create({
      data: { name: 'launch', slug: 'launch', title: 'launch', createdBy: admin.id },
    })
    // What claimCampaignKey leaves behind (lib/domain/beta/landing-keys.ts)
    await db.betaKey.create({ data: { key: 'BETA-AAAA-BBBB-CCCC' } })
    await db.signupAttempt.create({
      data: { ipAddress: ip, landingPageId: page.id, betaCode: 'BETA-AAAA-BBBB-CCCC', success: false },
    })

    const res = await signUp(ip, 'BETA-AAAA-BBBB-CCCC')
    expect(res.statusCode).toBe(200)
    expect(await db.signupAttempt.findMany({ where: { ipAddress: ip } })).toEqual([
      expect.objectContaining({ success: true, userId: res.body.userId, landingPageId: page.id }),
    ])
  })
})
