/**
 * Reading a big ring's whole member list across the federation boundary: the
 * real RingHubClient and lib/api/ringhub/ring-members.ts against a real hub,
 * the way the ring street and ring members pages read it.
 *
 * Members are inserted straight into the hub's database. Contract validation
 * runs in enforce mode, so every page is checked against ringhub-contract.ts.
 */
import { execSync } from 'child_process'
import { HUB_TIMEOUT } from '@/lib/api/ringhub/ringhub-ssr'
import { readAllRingMembers } from '@/lib/api/ringhub/ring-members'
import { makeTestClient, makePublicTestClient, getRuntime } from './harness/test-client'

jest.mock('@/lib/config/database/connection', () => ({ db: {} }))

const SLUG = 'mbrs-big-ring'
const MEMBERS = 130

function hubSql(sql: string): void {
  execSync(`psql "${getRuntime().databaseUrl}" -v ON_ERROR_STOP=1 -q`, { input: sql, stdio: ['pipe', 'pipe', 'pipe'] })
}

beforeAll(() => {
  hubSql(`INSERT INTO "Ring" (id, slug, name, visibility, "ownerDid", "updatedAt")
      VALUES (gen_random_uuid()::text, '${SLUG}', 'Big Ring', 'PUBLIC', 'did:web:mbrs-owner.invalid', now());
    INSERT INTO "Membership" (id, "ringId", "actorDid", status, "joinedAt", "updatedAt")
      SELECT gen_random_uuid()::text, r.id, 'did:web:mbrs-m' || i || '.invalid', 'ACTIVE',
        now() - i * interval '1 minute', now()
      FROM "Ring" r, generate_series(1, ${MEMBERS}) AS i WHERE r.slug = '${SLUG}';`)
})

afterAll(() => {
  hubSql(`DELETE FROM "Ring" WHERE slug = '${SLUG}';`)
})

describe('a ring with more members than one hub page', () => {
  test('an unparameterised read only gets the hub default of 20', async () => {
    const page = await makeTestClient().getRingMembers(SLUG)
    expect(page.members).toHaveLength(20)
    expect(page.total).toBe(MEMBERS)
    expect(page.hasMore).toBe(true)
  })

  test.each([
    ['signed', makeTestClient],
    ['unsigned', makePublicTestClient],
  ])('readAllRingMembers gets every member (%s)', async (_label, makeClient) => {
    const read = await readAllRingMembers(makeClient(), SLUG, { deadlineMs: 10_000 })
    if (read === HUB_TIMEOUT) throw new Error('hub read timed out')
    expect(read.complete).toBe(true)
    expect(read.total).toBe(MEMBERS)
    const dids = new Set(read.members.map((m) => m.actorDid))
    expect(dids.size).toBe(MEMBERS)
    expect(dids).toContain('did:web:mbrs-m1.invalid')
    expect(dids).toContain(`did:web:mbrs-m${MEMBERS}.invalid`)
  })

  test('a ring the hub doesn\'t have is HUB_TIMEOUT, so pages fall back', async () => {
    expect(await readAllRingMembers(makePublicTestClient(), 'mbrs-no-such-ring')).toBe(HUB_TIMEOUT)
  })
})
