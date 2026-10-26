/**
 * /api/auth/verify signs in the account whose key signed, and no other,
 * against a real Postgres. The signature was checked against the key the
 * caller sent, then the account was looked up by the DID they sent, so any
 * key plus someone else's DID signed in as them; and legacyDid moved
 * anyone's account onto the caller's key.
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

import verify from '@/pages/api/auth/verify'
import { createSession } from '@/lib/auth/server'
import { toBase64Url } from '@/lib/utils/encoding/base64url'

type Key = { did: string; publicKey: string; privateKey: crypto.KeyObject }
type Res = { statusCode: number; body: any; headers: Record<string, any> }

function newKey(): Key {
  const { publicKey: pub, privateKey } = crypto.generateKeyPairSync('ed25519')
  const publicKey = toBase64Url(Buffer.from(pub.export({ format: 'jwk' }).x!, 'base64url'))
  return { did: `did:key:ed25519:${publicKey}`, publicKey, privateKey }
}

let ipSeq = 0
async function post(key: Key, body: Record<string, unknown> = {}, cookie = ''): Promise<Res> {
  const nonce = `nonce-${crypto.randomUUID()}`
  const ip = `verify-${Date.now()}-${++ipSeq}`
  const req = {
    method: 'POST',
    url: '/api/auth/verify',
    query: {},
    body: {
      did: key.did,
      publicKey: key.publicKey,
      signature: toBase64Url(crypto.sign(null, Buffer.from(nonce), key.privateKey)),
      ...body,
    },
    headers: { 'user-agent': 'Mozilla/5.0 test', 'x-forwarded-for': ip, cookie: [`retro_nonce=${nonce}.${Date.now() + 60_000}`, cookie].filter(Boolean).join('; ') },
    cookies: {},
    socket: { remoteAddress: ip },
  } as unknown as NextApiRequest
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
  await verify(req, res as NextApiResponse)
  return res
}

async function sessionCookieFor(userId: string): Promise<string> {
  const res: any = { headers: {}, setHeader(k: string, v: unknown) { this.headers[k.toLowerCase()] = v } }
  await createSession(res as NextApiResponse, userId)
  return (res.headers['set-cookie'] as string[]).map((c) => c.split(';')[0]).join('; ')
}

beforeEach(async () => {
  await db.$executeRawUnsafe('TRUNCATE "User", "SignupAttempt", "IpSignupTracking", "RateLimit" RESTART IDENTITY CASCADE')
})

afterAll(async () => {
  await db.$disconnect()
})

test("someone else's DID with your own key signs in nobody", async () => {
  const victim = newKey()
  await db.user.create({ data: { did: victim.did } })
  const attacker = newKey()
  const res = await post({ ...attacker, did: victim.did })
  expect(res.statusCode).toBe(401)
  expect(res.headers['set-cookie']).toBeUndefined()
})

test('your own key signs you in', async () => {
  const me = newKey()
  const user = await db.user.create({ data: { did: me.did } })
  const res = await post(me)
  expect(res.statusCode).toBe(200)
  expect(res.body).toEqual({ ok: true, userId: user.id })
})

test("an account moved to a hub DID still signs in with its key's DID", async () => {
  const me = newKey()
  const user = await db.user.create({ data: { did: 'did:web:example.test:users:abc', originalDid: me.did } })
  const res = await post(me)
  expect(res.statusCode).toBe(200)
  expect(res.body.userId).toBe(user.id)
})

test("legacyDid can't move someone else's account onto your key", async () => {
  const victim = newKey()
  await db.user.create({ data: { did: victim.did } })
  const attacker = newKey()
  const res = await post(attacker, { legacyDid: victim.did })
  expect(res.statusCode).toBe(403)
  expect(await db.user.findUnique({ where: { did: victim.did } })).not.toBeNull()
  expect(await db.user.findUnique({ where: { did: attacker.did } })).toBeNull()
})

test('signed in, you can move your own account onto a new key (Settings, new phrase)', async () => {
  const old = newKey()
  const user = await db.user.create({ data: { did: old.did } })
  const cookie = await sessionCookieFor(user.id)
  const fresh = newKey()
  const res = await post(fresh, { legacyDid: old.did }, cookie)
  expect(res.statusCode).toBe(200)
  expect(await db.user.findUnique({ where: { id: user.id }, select: { did: true, originalDid: true } })).toEqual({ did: fresh.did, originalDid: old.did })
})

test('signed in as one account, you can\'t move another', async () => {
  const mine = newKey()
  const me = await db.user.create({ data: { did: mine.did } })
  const victim = newKey()
  await db.user.create({ data: { did: victim.did } })
  const res = await post(newKey(), { legacyDid: victim.did }, await sessionCookieFor(me.id))
  expect(res.statusCode).toBe(403)
})

test('a body that is not strings is refused, not a 500', async () => {
  const me = newKey()
  const res = await post(me, { publicKey: { x: 1 } })
  expect(res.statusCode).toBe(400)
})
