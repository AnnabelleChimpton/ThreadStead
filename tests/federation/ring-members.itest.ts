/**
 * Reading a big ring's whole member list across the federation boundary: the
 * real RingHubClient and lib/api/ringhub/ring-members.ts against a real hub,
 * the way the ring street, ring members pages and invite route read it.
 *
 * Members are inserted straight into the hub's database. Contract validation
 * runs in enforce mode, so every page is checked against ringhub-contract.ts.
 */
import { execSync } from 'child_process'
import { HUB_TIMEOUT } from '@/lib/api/ringhub/ringhub-ssr'
import { RingHubClientError } from '@/lib/api/ringhub/ringhub-client'
import { readAllRingMembers } from '@/lib/api/ringhub/ring-members'
import { makeTestClient, makePublicTestClient, getRuntime } from './harness/test-client'

jest.mock('@/lib/config/database/connection', () => ({ db: {} }))

const SLUG = 'mbrs-big-ring'
const INVITE_SLUG = 'mbrs-invite-ring'
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

  // An invite-only ring the main test actor curates, joined long before the
  // newest 20; the second actor is a plain member who joined early too.
  const { testActorDid, secondActorDid } = getRuntime()
  hubSql(`INSERT INTO "Ring" (id, slug, name, visibility, "joinPolicy", "ownerDid", "updatedAt")
      VALUES (gen_random_uuid()::text, '${INVITE_SLUG}', 'Invite Ring', 'PUBLIC', 'INVITATION', '${testActorDid}', now());
    INSERT INTO "RingRole" (id, "ringId", name, permissions)
      SELECT gen_random_uuid()::text, r.id, n, '[]'::jsonb
      FROM "Ring" r, unnest(array['owner', 'member']) AS n WHERE r.slug = '${INVITE_SLUG}';
    INSERT INTO "Membership" (id, "ringId", "actorDid", "roleId", status, "joinedAt", "updatedAt")
      SELECT gen_random_uuid()::text, r.id, m.did, rr.id, 'ACTIVE', now() - m.age, now()
      FROM "Ring" r
      JOIN (VALUES ('${testActorDid}', 'owner', interval '2 days'),
                   ('${secondActorDid}', 'member', interval '1 day')) AS m(did, role, age) ON true
      JOIN "RingRole" rr ON rr."ringId" = r.id AND rr.name = m.role
      WHERE r.slug = '${INVITE_SLUG}';
    INSERT INTO "Membership" (id, "ringId", "actorDid", "roleId", status, "joinedAt", "updatedAt")
      SELECT gen_random_uuid()::text, r.id, 'did:web:mbrs-inv-m' || i || '.invalid', rr.id, 'ACTIVE',
        now() - i * interval '1 minute', now()
      FROM "Ring" r JOIN "RingRole" rr ON rr."ringId" = r.id AND rr.name = 'member',
        generate_series(1, ${MEMBERS}) AS i WHERE r.slug = '${INVITE_SLUG}';`)
})

afterAll(() => {
  hubSql(`DELETE FROM "Ring" WHERE slug IN ('${SLUG}', '${INVITE_SLUG}');`)
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

describe("inviting to a ring whose curator isn't among the newest 20", () => {
  // The flow /api/threadrings/[slug]/invite uses: find the viewer's role in
  // every page, then invite signed as the viewer.
  test("the curator's role is only found past the first page", async () => {
    const { testActorDid } = getRuntime()
    const firstPage = await makeTestClient().getRingMembers(INVITE_SLUG)
    expect(firstPage.members.map((m) => m.actorDid)).not.toContain(testActorDid)

    const read = await readAllRingMembers(makeTestClient(), INVITE_SLUG, { deadlineMs: 10_000 })
    if (read === HUB_TIMEOUT) throw new Error('hub read timed out')
    expect(read.complete).toBe(true)
    expect(read.members.find((m) => m.actorDid === testActorDid)?.role).toBe('owner')
  })

  test('the hub takes an invite signed as the curator', async () => {
    const { testActorDid } = getRuntime()
    const result = await makeTestClient('main').inviteMember(INVITE_SLUG, 'did:web:mbrs-invitee.invalid')
    expect(result.success).toBe(true)
    expect(result.invitation.inviterDid).toBe(testActorDid)
  })

  test('the hub refuses an invite signed as a plain member', async () => {
    const attempt = makeTestClient('second').inviteMember(INVITE_SLUG, 'did:web:mbrs-invitee-2.invalid')
    await expect(attempt).rejects.toBeInstanceOf(RingHubClientError)
    await expect(attempt).rejects.toMatchObject({
      status: 403,
      data: { message: 'Only owners and moderators can send invites' },
    })
  })
})

describe('accepting a hub invite is joining the ring', () => {
  // The flow ThreadStead's invite notification leads to: the ring page's
  // Accept button posts /api/threadrings/[slug]/join, which signs /trp/join
  // as the invitee. The hub has no route to list or accept invitations.
  const ACCEPT_SLUG = 'mbrs-accept-ring'

  beforeAll(() => {
    const { testActorDid } = getRuntime()
    hubSql(`INSERT INTO "Ring" (id, slug, name, visibility, "joinPolicy", "ownerDid", "updatedAt")
        VALUES (gen_random_uuid()::text, '${ACCEPT_SLUG}', 'Accept Ring', 'PUBLIC', 'INVITATION', '${testActorDid}', now());
      INSERT INTO "RingRole" (id, "ringId", name, permissions)
        SELECT gen_random_uuid()::text, r.id, n, '[]'::jsonb
        FROM "Ring" r, unnest(array['owner', 'member']) AS n WHERE r.slug = '${ACCEPT_SLUG}';
      INSERT INTO "Membership" (id, "ringId", "actorDid", "roleId", status, "joinedAt", "updatedAt")
        SELECT gen_random_uuid()::text, r.id, '${testActorDid}', rr.id, 'ACTIVE', now(), now()
        FROM "Ring" r JOIN "RingRole" rr ON rr."ringId" = r.id AND rr.name = 'owner'
        WHERE r.slug = '${ACCEPT_SLUG}';`)
  })

  afterAll(() => {
    hubSql(`DELETE FROM "Ring" WHERE slug = '${ACCEPT_SLUG}';`)
  })

  const invitationRequired = {
    status: 403,
    data: { error: 'Invitation required', message: 'This ring requires an invitation to join' },
  }

  test('without an invite the hub says one is required', async () => {
    await expect(makeTestClient('second').joinRing(ACCEPT_SLUG)).rejects.toMatchObject(invitationRequired)
  })

  test('the invite reply carries the expiry the notification shows', async () => {
    const { testActorDid, secondActorDid } = getRuntime()
    const result = await makeTestClient('main').inviteMember(ACCEPT_SLUG, secondActorDid)
    expect(result.invitation).toMatchObject({
      ringSlug: ACCEPT_SLUG,
      inviteeDid: secondActorDid,
      inviterDid: testActorDid,
      status: 'PENDING',
    })
    const week = Date.parse(result.invitation.expiresAt) - Date.parse(result.invitation.createdAt)
    expect(week).toBeGreaterThan(6.9 * 24 * 3600_000)
    expect(week).toBeLessThan(7.1 * 24 * 3600_000)
  })

  test('the invitee joins, as an active member', async () => {
    const { secondActorDid } = getRuntime()
    const joined = await makeTestClient('second').joinRing(ACCEPT_SLUG)
    expect(joined.membership).toMatchObject({ status: 'ACTIVE', role: 'member', requiresApproval: false })

    const read = await readAllRingMembers(makeTestClient(), ACCEPT_SLUG, { deadlineMs: 10_000 })
    if (read === HUB_TIMEOUT) throw new Error('hub read timed out')
    expect(read.members.find((m) => m.actorDid === secondActorDid)?.role).toBe('member')
  })

  test('joining again while a member is a 409', async () => {
    await expect(makeTestClient('second').joinRing(ACCEPT_SLUG)).rejects.toMatchObject({ status: 409 })
  })

  test('an invite is used up: after leaving, it no longer lets them in', async () => {
    await makeTestClient('second').leaveRing(ACCEPT_SLUG)
    await expect(makeTestClient('second').joinRing(ACCEPT_SLUG)).rejects.toMatchObject(invitationRequired)
  })
})
