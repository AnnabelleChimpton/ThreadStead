/**
 * Replacing one resident's signing key (lib/api/did/rotate-user-key.ts),
 * against a real Postgres: same DID, a new key stored encrypted, and the DID
 * document publishing the new public key. The hub side of the change is
 * tests/federation/key-rotation.itest.ts.
 */
import crypto from 'crypto'
import { db } from '@/lib/config/database/connection'

// server-did-client loads the ESM-only library and sets etc.sha512Sync on it
jest.mock('@noble/ed25519', () => ({ etc: {} }))

import { rotateUserKey } from '@/lib/api/did/rotate-user-key'
import { decryptUserSecretKey, generateUserDIDDocument, getUserDIDMappingByHash, publicKeyToMultibase } from '@/lib/api/did/server-did-client'

const stamp = Date.now()
let userId: string
const did = `did:web:example.test:users:rotate-${stamp}`
const userHash = `rotate-${stamp}`

/** The public key a stored seed makes, worked out with Node's own Ed25519 */
function publicKeyOf(seedBase64Url: string) {
  const der = Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), Buffer.from(seedBase64Url, 'base64url')])
  const jwk = crypto.createPublicKey(crypto.createPrivateKey({ key: der, format: 'der', type: 'pkcs8' })).export({ format: 'jwk' })
  return jwk.x!
}

beforeAll(async () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519')
  userId = (await db.user.create({ data: { did: `did:key:rotate-${stamp}` } })).id
  await db.userDID.create({
    data: { userId, did, userHash, publicKeyMultibase: publicKey.export({ format: 'jwk' }).x!, secretKeyEncrypted: `plain:${privateKey.export({ format: 'jwk' }).d}` },
  })
})

beforeEach(() => {
  process.env.THREADSTEAD_KEY_ENCRYPTION_KEY = 'r'.repeat(44)
})

afterAll(async () => {
  delete process.env.THREADSTEAD_KEY_ENCRYPTION_KEY
  await db.user.deleteMany({ where: { did: `did:key:rotate-${stamp}` } })
  await db.$disconnect()
})

const row = () => db.userDID.findUnique({ where: { userId } })

test('without the encryption key it refuses, so a new key is never stored in plaintext', async () => {
  delete process.env.THREADSTEAD_KEY_ENCRYPTION_KEY
  await expect(rotateUserKey(db, { userId, apply: true })).rejects.toThrow(/stored encrypted/)
})

test('a dry run changes nothing', async () => {
  const before = await row()
  const report = await rotateUserKey(db, { userId, apply: false })
  expect(report).toEqual({ did, oldPublicKey: before!.publicKeyMultibase })
  expect(await row()).toEqual(before)
})

test('applied: same DID, a new key that is really the pair of what is stored, encrypted, and published', async () => {
  const before = (await row())!
  const report = await rotateUserKey(db, { userId, apply: true })
  const after = (await row())!

  expect(after.did).toBe(did)
  expect(after.userHash).toBe(userHash)
  expect(after.publicKeyMultibase).toBe(report.newPublicKey)
  expect(after.publicKeyMultibase).not.toBe(before.publicKeyMultibase)
  expect(after.secretKeyEncrypted.startsWith('enc:v1:')).toBe(true)
  expect(publicKeyOf(decryptUserSecretKey(after.secretKeyEncrypted))).toBe(after.publicKeyMultibase)

  const document = await generateUserDIDDocument((await getUserDIDMappingByHash(userHash))!)
  expect(document.verificationMethod[0].publicKeyMultibase).toBe(publicKeyToMultibase(after.publicKeyMultibase))
})

test("someone with no key isn't given one here", async () => {
  await expect(rotateUserKey(db, { userId: `nobody-${stamp}`, apply: true })).rejects.toThrow(/no signing key/)
})
