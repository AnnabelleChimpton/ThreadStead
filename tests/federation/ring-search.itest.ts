/**
 * Ring search across the federation boundary (SEARCH_PLAN.md Phase 3): the
 * real RingHubClient and lib/search/rings.ts against a real hub with the
 * full-text ring search migration (applied by harness/global-setup.ts).
 *
 * Rings are inserted straight into the hub's database, so the hub's trigger
 * builds their search vectors the way it does for rings made through the API.
 * Contract validation runs in enforce mode, so the new `relevance` field is
 * checked against ringhub-contract.ts on every call.
 */
import { execSync } from 'child_process'
import { RingHubClient } from '@/lib/api/ringhub/ringhub-client'
import { clearCache } from '@/lib/api/ringhub/ringhub-cache'
import { fetchRings } from '@/lib/search/rings'
import { makeTestClient, makePublicTestClient, getRuntime } from './harness/test-client'

// fetchRings signs as the viewer through this factory; here it signs as the
// harness's main actor. Blocks are ThreadStead-side and not under test.
jest.mock('@/lib/api/ringhub/ringhub-user-operations', () => ({
  createAuthenticatedRingHubClient: jest.fn(() => jest.requireActual('./harness/test-client').makeTestClient()),
}))
jest.mock('@/lib/domain/users/blocks', () => ({
  getUserBlockedIds: jest.fn(async () => ({ blockedUserIds: [], blockedThreadRingIds: [] })),
}))
jest.mock('@/lib/config/database/connection', () => ({ db: {} }))

const OWNER = 'did:web:srch-owner.invalid'

function hubSql(sql: string): void {
  execSync(`psql "${getRuntime().databaseUrl}" -v ON_ERROR_STOP=1 -q`, { input: sql, stdio: ['pipe', 'pipe', 'pipe'] })
}

function literal(value: string | null): string {
  return value === null ? 'NULL' : `'${value.replace(/'/g, "''")}'`
}

function insertRing(slug: string, name: string, description: string | null, visibility = 'PUBLIC', members = 0): string {
  const memberRows = Array.from(
    { length: members },
    (_, i) => `INSERT INTO "Membership" (id, "ringId", "actorDid", status, "updatedAt")
      SELECT gen_random_uuid()::text, id, 'did:web:srch-m${i}.invalid', 'ACTIVE', now() FROM "Ring" WHERE slug = ${literal(slug)};`
  ).join('\n')
  return `INSERT INTO "Ring" (id, slug, name, description, visibility, "ownerDid", "updatedAt")
    VALUES (gen_random_uuid()::text, ${literal(slug)}, ${literal(name)}, ${literal(description)}, '${visibility}', '${OWNER}', now());
    ${memberRows}`
}

const slugsOf = (result: { rings: { slug: string }[] }) => result.rings.map((r) => r.slug)

let signed: RingHubClient
let anonymous: RingHubClient

beforeAll(() => {
  hubSql(
    [
      insertRing('srch-quilting-bee', 'Quilting Bee', 'Patchwork and appliqué, every Sunday', 'PUBLIC', 6),
      insertRing('srch-sourdough', 'Sourdough Starters', 'Bakers swapping starters and loaves'),
      insertRing('srch-sale', '50% Off Fabrics', 'Remnant deals'),
      insertRing('srch-hidden', 'Hidden Quilters', 'Members-only quilting', 'PRIVATE'),
      insertRing('srch-unlisted', 'Quiet Quilters', 'Slow stitching', 'UNLISTED'),
    ].join('\n')
  )
  signed = makeTestClient()
  anonymous = makePublicTestClient()
})

beforeEach(() => clearCache())

afterAll(() => {
  hubSql(`DELETE FROM "Ring" WHERE slug LIKE 'srch-%';`)
})

describe('hub ring search through the real client', () => {
  it('matches several words in any order, best match first, with relevance signals', async () => {
    const result = await anonymous.listRings({ search: 'quilting bee' })
    expect(slugsOf(result)[0]).toBe('srch-quilting-bee')
    expect(slugsOf(await anonymous.listRings({ search: 'bee quilting' }))[0]).toBe('srch-quilting-bee')
    expect(result.rings[0].relevance).toEqual({ textRank: expect.any(Number), trigram: expect.any(Number) })
    expect(result.rings[0].relevance!.textRank).toBeGreaterThan(0)
  })

  it('finds typos and partial words', async () => {
    expect(slugsOf(await anonymous.listRings({ search: 'quiltng' }))).toContain('srch-quilting-bee')
    expect(slugsOf(await anonymous.listRings({ search: 'sourdou' }))).toContain('srch-sourdough')
    expect(slugsOf(await anonymous.listRings({ search: 'ourdoug' }))).toContain('srch-sourdough') // mid-word
    expect(slugsOf(await anonymous.listRings({ search: 'baker' }))).toContain('srch-sourdough') // stemmed description
    expect(slugsOf(await anonymous.listRings({ search: 'applique' }))).toContain('srch-quilting-bee') // accents
  })

  it('treats LIKE wildcards literally', async () => {
    // As wildcards, each of these used to match every ring.
    for (const search of ['%', '__', '%_%']) {
      expect(slugsOf(await anonymous.listRings({ search }))).toEqual([])
    }
    expect(slugsOf(await anonymous.listRings({ search: '50% off' }))).toEqual(['srch-sale'])
  })

  it('shows private and unlisted rings only to their members', async () => {
    expect(slugsOf(await anonymous.listRings({ search: 'quilters' }))).toEqual([])
    // A valid signature alone used to reveal every private ring.
    expect(slugsOf(await signed.listRings({ search: 'quilters' }))).toEqual([])
    const signer = literal(getRuntime().testActorDid)
    hubSql(`INSERT INTO "Membership" (id, "ringId", "actorDid", status, "updatedAt")
      SELECT gen_random_uuid()::text, id, ${signer}, 'ACTIVE', now() FROM "Ring" WHERE slug = 'srch-hidden';`)
    try {
      expect(slugsOf(await signed.listRings({ search: 'quilters' }))).toEqual(['srch-hidden'])
    } finally {
      hubSql(`DELETE FROM "Membership" WHERE "actorDid" = ${signer}
        AND "ringId" IN (SELECT id FROM "Ring" WHERE slug = 'srch-hidden');`)
    }
  })

  it('sort=members now orders by member count', async () => {
    const result = await anonymous.listRings({ sort: 'members', order: 'desc', limit: 5 })
    expect(slugsOf(result)[0]).toBe('srch-quilting-bee')
    const counts = result.rings.map((r) => r.memberCount)
    expect(counts).toEqual([...counts].sort((a, b) => b - a))
  })

  it('an old-style search (sort=members) still works and only returns matches', async () => {
    const result = await anonymous.listRings({ search: 'quilting OR sourdough', sort: 'members', order: 'desc' })
    expect(slugsOf(result)).toEqual(['srch-quilting-bee', 'srch-sourdough'])
  })
})

describe('lib/search/rings.ts reading the hub live', () => {
  const search = (q: string, viewerId: string | null = null) =>
    fetchRings({ search: q, viewerId, limit: 50 })

  it('returns slim rows with the hub relevance, for anonymous and signed viewers', async () => {
    const anon = await search('sourdough')
    expect(anon[0]).toMatchObject({ slug: 'srch-sourdough', name: 'Sourdough Starters', memberCount: 0 })
    expect(anon[0].relevance?.textRank).toBeGreaterThan(0)
    // Signed in or not, a private ring stays hidden from non-members.
    expect((await search('hidden quilters', 'viewer-1')).map((r) => r.slug)).not.toContain('srch-hidden')
    expect((await search('hidden quilters')).map((r) => r.slug)).not.toContain('srch-hidden')
  })

  it('throws when the hub is unreachable, unless the same anonymous search was just cached', async () => {
    await search('quilting bee') // warm the cache
    const hubUrl = process.env.RING_HUB_URL
    process.env.RING_HUB_URL = 'http://127.0.0.1:9' // nothing listens on the discard port
    try {
      expect((await search('quilting bee'))[0].slug).toBe('srch-quilting-bee')
      await expect(search('sourdough starters')).rejects.toThrow()
    } finally {
      process.env.RING_HUB_URL = hubUrl
    }
  })
})
