/**
 * A resident's signing key changing, against the real hub (2026-10-27: one
 * resident's key had been in the public repo's history, so it was replaced).
 *
 * ThreadStead keeps the DID and publishes the new public key in the DID
 * document. The hub verifies a did:web signature against its cached key and,
 * when that fails, re-reads the DID document once and retries
 * (ThreadRingHub security/http-signature.ts). So the new key works on its
 * first request, and from then on the old key is refused.
 */
import crypto from 'crypto'
import { makeTestClient, getRuntime } from './harness/test-client'

/** A new Ed25519 key in the encodings the harness uses (raw seed, raw public key) */
function newKeys() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519')
  const pkcs8 = privateKey.export({ format: 'der', type: 'pkcs8' }) as Buffer
  const spki = publicKey.export({ format: 'der', type: 'spki' }) as Buffer
  return {
    privateKeyBase64Url: pkcs8.subarray(pkcs8.length - 32).toString('base64url'),
    publicKeyBase64: spki.subarray(spki.length - 32).toString('base64'),
  }
}

test('after the key changes, the new key signs straight away and the old one is refused', async () => {
  const rt = getRuntime()
  const oldKey = makeTestClient('rotating')
  // The hub has the old key cached, as it would on prod
  await expect(oldKey.getMyMemberships({ limit: 1 })).resolves.toBeDefined()

  // A key nobody published is refused (so what follows isn't the hub taking any key)
  await expect(makeTestClient('rotating', newKeys().privateKeyBase64Url).getMyMemberships({ limit: 1 })).rejects.toThrow()

  const next = newKeys()
  const published = await fetch(`${rt.didServerUrl}/control/itest4/key`, {
    method: 'POST',
    body: JSON.stringify({ publicKeyBase64: next.publicKeyBase64 }),
  })
  expect(published.ok).toBe(true)

  const newKey = makeTestClient('rotating', next.privateKeyBase64Url)
  await expect(newKey.getMyMemberships({ limit: 1 })).resolves.toBeDefined()
  await expect(oldKey.getMyMemberships({ limit: 1 })).rejects.toThrow()
  // And it stays that way: the new key keeps working
  await expect(newKey.getMyMemberships({ limit: 1 })).resolves.toBeDefined()
})
