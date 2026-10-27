/**
 * Rows planted in the hub's cached-key table, against the real hub
 * (2026-10-27: the hub's Postgres was reachable from the internet with trust
 * auth from 2025-08 to 2026-07, so anyone could have written to it).
 *
 * The hub verifies a signature against HttpSignature, a cache of keys read
 * from DID documents. A row someone wrote there by hand must not let them
 * sign as anyone else: the signer is always the DID in the keyId, and a cached
 * key is trusted for at most the cache's 24 hours, never longer.
 */
import crypto from 'crypto'
import { execSync } from 'child_process'
import { makeTestClient, getRuntime } from './harness/test-client'

jest.mock('@/lib/config/database/connection', () => ({ db: {} }))

const SLUG = 'planted-keys-ring'

function hubSql(sql: string): void {
  execSync(`psql "${getRuntime().databaseUrl}" -v ON_ERROR_STOP=1 -q`, { input: sql, stdio: ['pipe', 'pipe', 'pipe'] })
}

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

beforeAll(() => {
  // A members-only ring with the main actor as its one member
  const { testActorDid } = getRuntime()
  hubSql(`INSERT INTO "Ring" (id, slug, name, visibility, "postPolicy", "ownerDid", "updatedAt")
      VALUES (gen_random_uuid()::text, '${SLUG}', 'Planted Keys', 'PUBLIC', 'MEMBERS', '${testActorDid}', now());
    INSERT INTO "Membership" (id, "ringId", "actorDid", status, "joinedAt", "updatedAt")
      SELECT gen_random_uuid()::text, id, '${testActorDid}', 'ACTIVE', now(), now() FROM "Ring" WHERE slug = '${SLUG}';`)
})

afterAll(() => {
  hubSql(`DELETE FROM "PostRef" WHERE "ringId" IN (SELECT id FROM "Ring" WHERE slug = '${SLUG}');
    DELETE FROM "Membership" WHERE "ringId" IN (SELECT id FROM "Ring" WHERE slug = '${SLUG}');
    DELETE FROM "Ring" WHERE slug = '${SLUG}';`)
})

test('a cached key row naming another DID does not make the signer that DID', async () => {
  const { testActorDid, secondActorDid, adminActorDid } = getRuntime()
  const main = makeTestClient('main')
  await main.getMyMemberships({ limit: 1 }) // the hub has main's key cached
  // Planted: main's own key, but the row says it belongs to the hub admin
  hubSql(`UPDATE "HttpSignature" SET "actorDid" = '${adminActorDid}' WHERE "keyId" = '${testActorDid}#key-1';`)

  try {
    // Only a hub admin may name someone else as the author
    await expect(
      main.submitPost(SLUG, { uri: 'https://planted-keys.invalid/post/as-admin', digest: 'sha256:planted-admin', actorDid: secondActorDid })
    ).rejects.toMatchObject({ status: 403 })

    const own = await main.submitPost(SLUG, { uri: 'https://planted-keys.invalid/post/own', digest: 'sha256:planted-own', actorDid: testActorDid })
    expect(own.submittedBy).toBe(testActorDid)
  } finally {
    hubSql(`UPDATE "HttpSignature" SET "actorDid" = '${testActorDid}' WHERE "keyId" = '${testActorDid}#key-1';`)
  }
})

test.each([
  ['never expires', 'NULL'],
  ['expires in the year 9999', `'9999-01-01'`],
])('a planted key under a resident\'s keyId that %s does not let its holder sign as them', async (_label, expiresAt) => {
  const { secondActorDid } = getRuntime()
  const second = makeTestClient('second')
  await second.getMyMemberships({ limit: 1 }) // the hub has the real key cached

  const planted = newKeys()
  hubSql(`UPDATE "HttpSignature" SET "publicKey" = '${planted.publicKeyBase64}', "expiresAt" = ${expiresAt}
    WHERE "keyId" = '${secondActorDid}#key-1';`)

  await expect(makeTestClient('second', planted.privateKeyBase64Url).getMyMemberships({ limit: 1 })).rejects.toThrow()
  // The real key still works, and the planted one is gone from the cache
  await expect(second.getMyMemberships({ limit: 1 })).resolves.toBeDefined()
  await expect(makeTestClient('second', planted.privateKeyBase64Url).getMyMemberships({ limit: 1 })).rejects.toThrow()
})

describe('when the DID document can\'t be reached', () => {
  // A ghost whose did:web never resolves, with its own real key in the cache
  const keyId = () => `${getRuntime().unresolvableActorDid}#key-1`
  function cacheGhostKey(expiresAt: string) {
    const seed = Buffer.from(getRuntime().unresolvablePrivateKeyBase64Url, 'base64url')
    const der = Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), seed])
    const spki = crypto.createPublicKey(crypto.createPrivateKey({ key: der, format: 'der', type: 'pkcs8' })).export({ format: 'der', type: 'spki' }) as Buffer
    hubSql(`DELETE FROM "HttpSignature" WHERE "keyId" = '${keyId()}';
      INSERT INTO "HttpSignature" (id, "keyId", "publicKey", "actorDid", "updatedAt", "expiresAt")
      VALUES (gen_random_uuid()::text, '${keyId()}', '${spki.subarray(12).toString('base64')}', '${getRuntime().unresolvableActorDid}', now(), ${expiresAt});`)
  }
  afterAll(() => hubSql(`DELETE FROM "HttpSignature" WHERE "keyId" = '${keyId()}';`))

  test('a key the hub cached itself, now expired, still works (an outage doesn\'t lock anyone out)', async () => {
    cacheGhostKey(`now() - interval '1 hour'`)
    await expect(makeTestClient('unresolvable').getMyMemberships({ limit: 1 })).resolves.toBeDefined()
  })

  test('a row with no expiry is refused', async () => {
    cacheGhostKey('NULL')
    await expect(makeTestClient('unresolvable').getMyMemberships({ limit: 1 })).rejects.toThrow()
  })
})
