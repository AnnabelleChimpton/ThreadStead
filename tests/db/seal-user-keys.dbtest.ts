/**
 * Encrypting residents' DID secret keys at rest (lib/api/did/seal-user-keys.ts,
 * run by scripts/encrypt-user-did-keys.ts), against a real Postgres. On prod
 * every key was "plain:", so a copy of the database could sign as anyone.
 */
import crypto from 'crypto'
import { db } from '@/lib/config/database/connection'

// As in auth-verify-binding.dbtest.ts: Node's Ed25519 for the ESM-only library
jest.mock('@noble/ed25519', () => {
  const nodeCrypto = jest.requireActual('crypto')
  return {
    // server-did-client sets etc.sha512Sync when it loads
    etc: {},
    getPublicKeyAsync: async (seed: Uint8Array) => {
      const der = Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), Buffer.from(seed)])
      const jwk = nodeCrypto.createPublicKey(nodeCrypto.createPrivateKey({ key: der, format: 'der', type: 'pkcs8' })).export({ format: 'jwk' })
      return new Uint8Array(Buffer.from(jwk.x, 'base64url'))
    },
  }
})

import { sealUserKeys, unsealUserKeys } from '@/lib/api/did/seal-user-keys'
import { decryptUserSecretKey, getUserDID, getUserDIDMappingByHash, generateUserDIDDocument } from '@/lib/api/did/server-did-client'

const stamp = Date.now()
const KEY = 'a'.repeat(44)

/** A real Ed25519 key, stored the way prod has them */
function keypair() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519')
  return {
    secret: privateKey.export({ format: 'jwk' }).d!,
    publicKey: publicKey.export({ format: 'jwk' }).x!,
  }
}

const people: Array<{ userId: string; secret: string; stored: string }> = []
let mismatchedId: string

async function resident(n: number, stored: (secret: string) => string, publicKey?: string) {
  const key = keypair()
  const user = await db.user.create({ data: { did: `did:key:seal-${stamp}-${n}` } })
  await db.userDID.create({
    data: { userId: user.id, did: `did:web:example.test:users:seal-${stamp}-${n}`, userHash: `seal-${stamp}-${n}`, publicKeyMultibase: publicKey ?? key.publicKey, secretKeyEncrypted: stored(key.secret) },
  })
  return { userId: user.id, secret: key.secret, stored: stored(key.secret) }
}

const rowOf = (userId: string) => db.userDID.findUnique({ where: { userId }, select: { secretKeyEncrypted: true } })

beforeAll(async () => {
  await db.userDID.deleteMany({})
  people.push(await resident(1, (s) => `plain:${s}`))
  people.push(await resident(2, (s) => `plain:${s}`))
  // Legacy rows have no prefix at all
  people.push(await resident(3, (s) => s))
  mismatchedId = (await resident(4, (s) => `plain:${s}`, keypair().publicKey)).userId
})

afterEach(() => {
  process.env.THREADSTEAD_KEY_ENCRYPTION_KEY = KEY
})

afterAll(async () => {
  delete process.env.THREADSTEAD_KEY_ENCRYPTION_KEY
  await db.user.deleteMany({ where: { did: { startsWith: `did:key:seal-${stamp}` } } })
  await db.$disconnect()
})

test('without a strong key it refuses, and writes nothing', async () => {
  process.env.THREADSTEAD_KEY_ENCRYPTION_KEY = 'short'
  await expect(sealUserKeys(db, { apply: true })).rejects.toThrow(/32 characters at least/)
  expect((await rowOf(people[0].userId))?.secretKeyEncrypted).toBe(people[0].stored)
})

test('a dry run counts and writes nothing', async () => {
  process.env.THREADSTEAD_KEY_ENCRYPTION_KEY = KEY
  const report = await sealUserKeys(db, { apply: false })
  expect(report).toEqual({ alreadyEncrypted: 0, changed: 3, mismatched: [mismatchedId], skipped: [] })
  for (const person of people) expect((await rowOf(person.userId))?.secretKeyEncrypted).toBe(person.stored)
})

test('applied: each key is encrypted and opens to the same secret; a key that doesn\'t match its public key is left', async () => {
  process.env.THREADSTEAD_KEY_ENCRYPTION_KEY = KEY
  const report = await sealUserKeys(db, { apply: true })
  expect(report).toEqual({ alreadyEncrypted: 0, changed: 3, mismatched: [mismatchedId], skipped: [] })
  for (const person of people) {
    const stored = (await rowOf(person.userId))!.secretKeyEncrypted
    expect(stored.startsWith('enc:v1:')).toBe(true)
    expect(stored).not.toContain(person.secret)
    expect(decryptUserSecretKey(stored)).toBe(person.secret)
  }
  expect((await rowOf(mismatchedId))!.secretKeyEncrypted.startsWith('plain:')).toBe(true)
})

test('running it again changes nothing', async () => {
  process.env.THREADSTEAD_KEY_ENCRYPTION_KEY = KEY
  const before = await Promise.all(people.map((p) => rowOf(p.userId)))
  const report = await sealUserKeys(db, { apply: true })
  expect(report).toEqual({ alreadyEncrypted: 3, changed: 0, mismatched: [mismatchedId], skipped: [] })
  expect(await Promise.all(people.map((p) => rowOf(p.userId)))).toEqual(before)
})

test('without the key, the DID, public key and DID document still read; only signing needs it', async () => {
  const [person] = people
  const row = await db.userDID.findUnique({ where: { userId: person.userId } })
  delete process.env.THREADSTEAD_KEY_ENCRYPTION_KEY
  expect(await getUserDID(person.userId)).toBe(row!.did)
  const mapping = (await getUserDIDMappingByHash(row!.userHash))!
  expect((await generateUserDIDDocument(mapping)).id).toBe(row!.did)
  expect(() => mapping.secretKey).toThrow(/No encryption key/)
})

test('with a different key than the one already used, it stops before writing anything', async () => {
  const late = await resident(5, (s) => `plain:${s}`)
  process.env.THREADSTEAD_KEY_ENCRYPTION_KEY = 'b'.repeat(44)
  await expect(sealUserKeys(db, { apply: true })).rejects.toThrow(/doesn't open it/)
  expect((await rowOf(late.userId))?.secretKeyEncrypted).toBe(late.stored)
})

test('the undo puts every encrypted key back as plaintext, with the same secret', async () => {
  process.env.THREADSTEAD_KEY_ENCRYPTION_KEY = KEY
  expect((await unsealUserKeys(db, { apply: false })).changed).toBe(3)
  const report = await unsealUserKeys(db, { apply: true })
  expect(report).toEqual({ alreadyEncrypted: 0, changed: 3, mismatched: [], skipped: [] })
  for (const person of people) expect((await rowOf(person.userId))?.secretKeyEncrypted).toBe(`plain:${person.secret}`)
})
