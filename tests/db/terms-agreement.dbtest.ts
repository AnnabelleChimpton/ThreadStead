/**
 * Agreeing to the house rules, terms and privacy policy, against a real
 * Postgres (lib/domain/users/terms-agreement.ts): /api/auth/verify makes no
 * account without it and records it with the account; an account made before
 * signup asked first records it from the Rules step (/api/account/agree-to-terms).
 */
import crypto from 'crypto'
import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/config/database/connection'

process.env.BETA_KEYS_ENABLED = 'false'

// As in signup-limits.dbtest.ts: Node's Ed25519 for the ESM-only library
jest.mock('@noble/ed25519', () => {
  const nodeCrypto = jest.requireActual('crypto')
  return {
    verifyAsync: async (sig: Uint8Array, msg: Uint8Array, pub: Uint8Array) =>
      nodeCrypto.verify(
        null,
        Buffer.from(msg),
        nodeCrypto.createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: Buffer.from(pub).toString('base64url') }, format: 'jwk' }),
        Buffer.from(sig)
      ),
  }
})
jest.mock('@/lib/server/http/csrf', () => ({
  ...jest.requireActual('@/lib/server/http/csrf'),
  csrfProtection: jest.fn(async () => true),
}))

import verify from '@/pages/api/auth/verify'
import agreeToTerms from '@/pages/api/account/agree-to-terms'
import { createSession } from '@/lib/auth/server'
import { currentPolicyVersion } from '@/lib/domain/users/terms-agreement'
import { toBase64Url } from '@/lib/utils/encoding/base64url'

type Res = { statusCode: number; body: any; headers: Record<string, any> }

async function call(handler: (req: NextApiRequest, res: NextApiResponse) => Promise<unknown>, opts: { body?: unknown; cookie?: string; ip: string }): Promise<Res> {
  const headers: Record<string, string> = { 'user-agent': 'Mozilla/5.0 test', 'x-forwarded-for': opts.ip }
  if (opts.cookie) headers.cookie = opts.cookie
  const req = { method: 'POST', url: '/api/test', query: {}, body: opts.body ?? {}, headers, cookies: {}, socket: { remoteAddress: opts.ip } } as unknown as NextApiRequest
  const res: any = {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(c: number) { this.statusCode = c; return this },
    json(b: unknown) { this.body = b; return this },
    setHeader(k: string, v: unknown) { this.headers[k.toLowerCase()] = v; return this },
    getHeader(k: string) { return this.headers[k.toLowerCase()] },
    end() { return this },
  }
  await handler(req, res as NextApiResponse)
  return res
}

let ipSeq = 0
const freshIp = () => `terms-${Date.now()}-${++ipSeq}`

/** A new key signing in, as signup's first step does */
async function signUp(agreedToTerms?: boolean) {
  const { publicKey: pub, privateKey } = crypto.generateKeyPairSync('ed25519')
  const publicKey = Buffer.from(pub.export({ format: 'jwk' }).x!, 'base64url')
  const did = `did:key:ed25519:${toBase64Url(publicKey)}`
  const nonce = `nonce-${crypto.randomUUID()}`
  const res = await call(verify as never, {
    ip: freshIp(),
    cookie: `retro_nonce=${nonce}.${Date.now() + 60_000}`,
    body: { did, publicKey: toBase64Url(publicKey), signature: toBase64Url(crypto.sign(null, Buffer.from(nonce), privateKey)), ...(agreedToTerms === undefined ? {} : { agreedToTerms }) },
  })
  return { res, did }
}

beforeEach(async () => {
  await db.$executeRawUnsafe('TRUNCATE "User", "SignupAttempt", "IpSignupTracking", "RateLimit" RESTART IDENTITY CASCADE')
  await db.siteConfig.deleteMany({ where: { key: { in: ['terms_simple', 'terms_full', 'privacy_simple', 'privacy_full'] } } })
})

afterAll(async () => {
  await db.$disconnect()
})

test('no account without agreement: verify says why, and nothing is made', async () => {
  for (const agreed of [undefined, false]) {
    const { res, did } = await signUp(agreed)
    expect(res.statusCode).toBe(400)
    expect(res.body).toEqual({ error: 'Agree to the house rules, terms and privacy policy first.', code: 'agreement_required' })
    expect(await db.user.findUnique({ where: { did } })).toBeNull()
  }
  expect(await db.signupAttempt.count()).toBe(0)
})

test('an account made with agreement has it on record, with the texts it agreed to', async () => {
  const saved = await db.siteConfig.create({ data: { key: 'terms_full', value: 'The terms.' } })
  const { res, did } = await signUp(true)
  expect(res.statusCode).toBe(200)
  const user = await db.user.findUniqueOrThrow({ where: { did }, include: { termsAgreements: true } })
  expect(user.termsAgreements).toEqual([
    expect.objectContaining({ version: `policies ${saved.updatedAt.toISOString().slice(0, 16)}Z`, agreedAt: expect.any(Date) }),
  ])
})

test('before any texts are saved in Admin, the built-in ones', async () => {
  expect(await currentPolicyVersion()).toBe('built-in')
})

test('signing in again needs no agreement and records none', async () => {
  const { publicKey: pub, privateKey } = crypto.generateKeyPairSync('ed25519')
  const publicKey = Buffer.from(pub.export({ format: 'jwk' }).x!, 'base64url')
  const did = `did:key:ed25519:${toBase64Url(publicKey)}`
  await db.user.create({ data: { did } })
  const nonce = `nonce-${crypto.randomUUID()}`
  const res = await call(verify as never, {
    ip: freshIp(),
    cookie: `retro_nonce=${nonce}.${Date.now() + 60_000}`,
    body: { did, publicKey: toBase64Url(publicKey), signature: toBase64Url(crypto.sign(null, Buffer.from(nonce), privateKey)) },
  })
  expect(res.statusCode).toBe(200)
  expect(await db.termsAgreement.count()).toBe(0)
})

test('an account from before records it from the Rules step', async () => {
  const user = await db.user.create({ data: { did: `did:key:old-${Date.now()}` } })
  const session: any = { headers: {}, setHeader(k: string, v: unknown) { this.headers[k.toLowerCase()] = v } }
  await createSession(session as NextApiResponse, user.id)
  const cookie = (session.headers['set-cookie'] as string[]).map((c) => c.split(';')[0]).join('; ')
  const res = await call(agreeToTerms as never, { ip: freshIp(), cookie, body: {} })
  expect(res.statusCode).toBe(200)
  expect(res.body).toEqual({ agreed: true })
  expect(await db.termsAgreement.findMany({ where: { userId: user.id }, select: { version: true } })).toEqual([{ version: 'built-in' }])
})

test('the record goes with the account', async () => {
  const { did } = await signUp(true)
  await db.user.delete({ where: { did } })
  expect(await db.termsAgreement.count()).toBe(0)
})
