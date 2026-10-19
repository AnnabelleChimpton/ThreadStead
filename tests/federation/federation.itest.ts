/**
 * Federation integration tests (E2): the real RingHubClient against a real
 * RingHub booted by the harness (see harness/global-setup.ts).
 *
 * Every response also passes through the contract schemas (A2) inside the
 * client — NODE_ENV=test puts validation in enforce mode, so any hub↔client
 * shape drift fails these tests loudly. The regression cases from the 2026-07
 * incident (submit returning `{}`, badges returning `badge: {}`) are asserted
 * explicitly below on top of that.
 *
 * Run with: npm run test:federation
 */
import { RingHubClient, RingHubClientError } from '@/lib/api/ringhub/ringhub-client'
import { RingHubAuthError } from '@/lib/api/ringhub/ringhub-errors'
import { makeTestClient, makePublicTestClient, getRuntime } from './harness/test-client'
import {
  executeOrphanRemoval,
  planOrphanRemoval,
  scanForOrphanPostRefs,
} from '@/lib/domain/threadrings/orphan-postrefs'
import * as ringHubClientModule from '@/lib/api/ringhub/ringhub-client'
import { createAuthenticatedRingHubClient } from '@/lib/api/ringhub/ringhub-user-operations'
import { removePostFromRingHub } from '@/lib/domain/posts/ringhub-removal'
import { buildPostUri } from '@/lib/domain/posts/ringhub-metadata'
import { NOT_A_MEMBER_REASON, PUBLIC_ONLY_REASON, REMOVED_BEFORE_REASON, postToRings } from '@/lib/domain/posts/ring-submission'
import { sendPostToRings } from '@/lib/domain/posts/send-to-rings'
import { clearCache } from '@/lib/api/ringhub/ringhub-cache'
import { publicRingsOf } from '@/lib/pixel-homes/street-rings'
import { ringMemberDids } from '@/lib/pixel-homes/ring-walk'

// removePostFromRingHub signs as the post's author through this factory, which
// in the app maps a ThreadStead user id to their DID keypair (DB-backed).
// Here the "user id" names a harness actor; the hub side stays real.
jest.mock('@/lib/api/ringhub/ringhub-user-operations', () => ({
  createAuthenticatedRingHubClient: jest.fn(),
}))

// sendPostToRings also writes ThreadStead's mirrors (Post.threadRingPostIds,
// PostThreadRing). This in-memory stand-in records them; the hub stays real.
const mockLocalDb = {
  postRingIds: new Map<string, Record<string, string>>(),
  rings: [] as { id: string; slug: string; name: string }[],
  links: [] as { postId: string; threadRingId: string }[],
}
jest.mock('@/lib/config/database/connection', () => ({
  db: {
    post: {
      findUnique: jest.fn(async ({ where }: any) => ({ threadRingPostIds: mockLocalDb.postRingIds.get(where.id) ?? null })),
      update: jest.fn(async ({ where, data }: any) => mockLocalDb.postRingIds.set(where.id, data.threadRingPostIds)),
    },
    threadRing: {
      findMany: jest.fn(async ({ where }: any) => mockLocalDb.rings.filter((r) => where.slug.in.includes(r.slug))),
      create: jest.fn(async ({ data }: any) => {
        const ring = { id: `local-${data.slug}`, slug: data.slug, name: data.name }
        mockLocalDb.rings.push(ring)
        return ring
      }),
      updateMany: jest.fn(async () => ({ count: 1 })),
    },
    postThreadRing: {
      findMany: jest.fn(async ({ where }: any) =>
        mockLocalDb.links.filter((l) => l.postId === where.postId && where.threadRingId.in.includes(l.threadRingId))
      ),
      createMany: jest.fn(async ({ data }: any) => mockLocalDb.links.push(...data)),
    },
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}))

// One membership lifecycle threads through this whole file, in order.
let client: RingHubClient
let ringSlug: string
let actorDid: string

const POST_URI = 'https://threadstead-itest.invalid/posts/itest-post-1'
const POST_DIGEST = 'sha256:itest-digest-1'
// Owned by the main actor; forked in the 0.5 block, managed in the 0.8 block
// (the hub's fork quality gate allows one empty fork per actor).
const FORK_SLUG = 'itest-fork-nodesc'

beforeAll(() => {
  const rt = getRuntime()
  client = makeTestClient()
  ringSlug = rt.ringSlug
  actorDid = rt.testActorDid
})

describe('ring discovery', () => {
  test('listRings with search + sort finds the ring (the /api/search ring path)', async () => {
    // This is the EXACT call pages/api/search.ts makes for ThreadRing search —
    // in production it fails silently while the same query works unsigned.
    const result = await client.listRings({
      search: 'Integration',
      limit: 7,
      sort: 'members',
      order: 'desc',
    })
    expect(result.rings.some((r) => r.slug === ringSlug)).toBe(true)
  })

  test('getRing returns the seeded ring with the full descriptor shape', async () => {
    const ring = await client.getRing(ringSlug)
    expect(ring).not.toBeNull()
    expect(ring!.slug).toBe(ringSlug)
    expect(ring!.postPolicy).toBe('MEMBERS')
    expect(typeof ring!.memberCount).toBe('number')
    expect(typeof ring!.postCount).toBe('number')
  })

  test('getRing returns null for a missing ring', async () => {
    await expect(client.getRing('does-not-exist')).resolves.toBeNull()
  })
})

describe('anonymous ring listing (2026-10-17 outage)', () => {
  test('a signer the hub cannot resolve gets an auth error even on public listings', async () => {
    // Prod failure mode: "Unknown key: did:web:homepageagain.com#key-1". The
    // hub still answers 200 but flags X-RingHub-Auth-Error, which the client
    // raises — so signing an anonymous listing makes it depend on key health.
    await expect(makeTestClient('unresolvable').listRings({ limit: 5 })).rejects.toBeInstanceOf(RingHubAuthError)
  })

  test('the public client lists rings unsigned and ignores the expected auth header', async () => {
    const result = await makePublicTestClient().listRings({ sort: 'created', order: 'desc', limit: 20 })
    expect(result.rings.some((r) => r.slug === ringSlug)).toBe(true)
    // Unsigned, so no viewer membership can leak into a shared response.
    expect(result.rings.every((r: any) => r.currentUserMembership === undefined)).toBe(true)
  })
})

describe('membership lifecycle', () => {
  test('submitPost before joining is rejected (members-only ring)', async () => {
    await expect(
      client.submitPost(ringSlug, { uri: POST_URI, digest: POST_DIGEST })
    ).rejects.toMatchObject({ status: 403 })
  })

  test('joinRing returns the nested membership + badge shape', async () => {
    const result = await client.joinRing(ringSlug)
    expect(result.membership.status).toBe('ACTIVE')
    expect(result.membership.role).toBe('member')
    expect(result.membership.requiresApproval).toBe(false)
    // The hub nests the badge — the old flat `.badgeId` read was always
    // undefined on the wire. This pins the real shape.
    expect(result.badge).not.toBeNull()
    expect(typeof result.badge!.id).toBe('string')
    expect(result.badge!.url).toContain('/badges/')
  })

  test('getMyMemberships reflects the join', async () => {
    const result = await client.getMyMemberships({ status: 'ACTIVE' })
    const mine = result.memberships.find((m) => m.ringSlug === ringSlug)
    expect(mine).toBeDefined()
    expect(mine!.status).toBe('ACTIVE')
    expect(result.total).toBeGreaterThanOrEqual(1)
  })
})

// Pixel homes Phase 5: the street reads a resident's rings and a ring's
// members from the hub, unsigned, and never copies them.
describe('ring signposts on the street (lib/pixel-homes/street-rings, ring-walk)', () => {
  beforeEach(() => clearCache())

  test('a resident\'s public rings come from their badges, read unsigned', async () => {
    const rings = await publicRingsOf(makePublicTestClient(), actorDid)
    expect(rings).toContainEqual({ slug: ringSlug, name: expect.any(String) })
  })

  test('getRingMembers pages with limit and offset, and the walk reads every page', async () => {
    const pub = makePublicTestClient()
    const first = await pub.getRingMembers(ringSlug, { limit: 1, offset: 0 })
    expect(first.members).toHaveLength(1)
    expect(first.limit).toBe(1)
    expect(first.hasMore).toBe(first.total > 1)
    expect(typeof first.members[0].actorDid).toBe('string')

    const dids = await ringMemberDids(pub, ringSlug)
    expect(dids).toContain(actorDid)
    expect(dids!.length).toBe(first.total)
  })

  test('a ring the hub doesn\'t have has no members to walk (404 → null)', async () => {
    expect(await ringMemberDids(makePublicTestClient(), 'no-such-ring-itest')).toBeNull()
  })
})

describe('post submission (the `{}` regression)', () => {
  test('submitPost returns a usable PostRef id — not a stripped {}', async () => {
    const result = await client.submitPost(ringSlug, {
      uri: POST_URI,
      digest: POST_DIGEST,
      metadata: { title: 'Integration test post', tags: ['itest'] },
    })
    // These exact reads are what pages/api/posts/create.ts depends on to save
    // the local→hub post-ID mapping. From 2025-08 to 2026-07 the hub returned
    // `{}` here and every one of these was silently undefined.
    expect(typeof result.id).toBe('string')
    expect(result.id.length).toBeGreaterThan(0)
    expect(result.status).toBe('ACCEPTED')
    expect(result.ringSlug).toBe(ringSlug)
    expect(result.uri).toBe(POST_URI)
  })

  test('duplicate submission is rejected with 409', async () => {
    await expect(
      client.submitPost(ringSlug, { uri: POST_URI, digest: POST_DIGEST })
    ).rejects.toMatchObject({ status: 409 })
  })

  test('the post appears in the ring feed', async () => {
    const feed = await client.getRingFeed(ringSlug)
    const post = feed.posts.find((p) => p.uri === POST_URI)
    expect(post).toBeDefined()
    expect(post!.status).toBe('ACCEPTED')
  })
})

describe('posting into rings from the composer (create.ts → postToRings)', () => {
  // A host the A3 orphan scan below ignores, so these refs can't skew it.
  const HOST = 'https://ring-posting-itest.invalid'
  const submission = (id: string) => ({
    uri: `${HOST}/resident/itest/post/${id}`,
    digest: `sha256:${id}`,
    metadata: { title: `Ring posting ${id}`, textPreview: 'hello', publishedAt: new Date().toISOString(), platform: 'blog' },
  })
  const postedRefIds: string[] = []

  afterAll(async () => {
    for (const id of postedRefIds) await client.curatePost(id, 'remove')
  })

  test('a member posts: the ring gets it, a ring they never joined is reported, not dropped', async () => {
    const results = await postToRings(client, [ringSlug, 'itest-never-joined'], {
      visibility: 'public',
      buildSubmission: () => submission('composer-1'),
    })
    expect(results).toHaveLength(2)
    expect(results[0]).toMatchObject({ slug: ringSlug, status: 'posted' })
    expect(typeof results[0].hubPostId).toBe('string')
    expect(results[1]).toMatchObject({ slug: 'itest-never-joined', status: 'failed', reason: NOT_A_MEMBER_REASON })
    postedRefIds.push(results[0].hubPostId!)

    const feed = await client.getRingFeed(ringSlug)
    expect(feed.posts.find((p) => p.id === results[0].hubPostId)?.uri).toBe(`${HOST}/resident/itest/post/composer-1`)
  })

  test('a non-public post never reaches the hub', async () => {
    const results = await postToRings(client, [ringSlug], {
      visibility: 'friends',
      buildSubmission: () => submission('composer-friends-only'),
    })
    expect(results).toEqual([{ slug: ringSlug, name: ringSlug, status: 'failed', reason: PUBLIC_ONLY_REASON }])
    const feed = await client.getRingFeed(ringSlug)
    expect(feed.posts.some((p) => p.uri.endsWith('/composer-friends-only'))).toBe(false)
  })

  test('the hub refuses a non-member, and the reason says so', async () => {
    // Skipping our own membership check sends it anyway, so the hub decides.
    const [result] = await postToRings(makeTestClient('second'), [ringSlug], {
      visibility: 'public',
      buildSubmission: () => submission('composer-stranger'),
      skipMembershipCheck: true,
    })
    expect(result).toMatchObject({ status: 'failed', reason: NOT_A_MEMBER_REASON })
  })

  test('a malformed post URI (local .env with a stray `;`, 2026-10-17) comes back with the hub reason', async () => {
    const [result] = await postToRings(client, [ringSlug], {
      visibility: 'public',
      buildSubmission: () => ({ ...submission('composer-bad-uri'), uri: '"http://localhost:3000";/resident/itest/post/x' }),
    })
    expect(result.status).toBe('failed')
    expect(result.reason).toContain('must match format "uri"')
  })

  test('an unreachable hub fails every ring with a reason instead of throwing', async () => {
    const rt = getRuntime()
    const offline = new RingHubClient({
      baseUrl: 'http://127.0.0.1:9',
      instanceDID: rt.testActorDid,
      privateKeyBase64Url: rt.privateKeyBase64Url,
      publicKeyMultibase: rt.publicKeyMultibase,
    })
    const results = await postToRings(offline, [ringSlug], { visibility: 'public', buildSubmission: () => submission('composer-offline') })
    expect(results).toEqual([
      { slug: ringSlug, name: ringSlug, status: 'failed', reason: "Ring Hub didn't respond. Try again later." },
    ])
  })
})

describe('sending an existing post to a ring it missed (POST /api/posts/rings → sendPostToRings)', () => {
  // Signed as the second actor, who isn't in the ring yet: the post misses it,
  // they join, "Try again" lands it, and a second retry changes nothing.
  const post = {
    id: 'retry-1',
    title: 'A post that missed its ring',
    bodyText: 'second try',
    bodyHtml: null,
    bodyMarkdown: null,
    visibility: 'public',
    isSpoiler: false,
    contentWarning: null,
    metadata: null,
    publishedAt: new Date('2026-10-17T12:00:00Z'),
  }
  const send = () =>
    sendPostToRings({ post, authorHandle: 'itest2@threadstead-itest.invalid', userId: 'second', ringSlugs: [ringSlug] })
  let second: RingHubClient
  let hubPostId: string

  beforeAll(() => {
    second = makeTestClient('second')
    ;(createAuthenticatedRingHubClient as jest.Mock).mockImplementation((userId: 'main' | 'second') =>
      userId === 'main' ? client : makeTestClient(userId)
    )
  })

  afterAll(async () => {
    await second.leaveRing(ringSlug).catch(() => {})
  })

  test('not a member yet: the ring is reported as missed and nothing is mirrored', async () => {
    expect(await send()).toEqual([{ slug: ringSlug, name: ringSlug, status: 'failed', reason: NOT_A_MEMBER_REASON }])
    expect(mockLocalDb.postRingIds.get(post.id)).toBeUndefined()
    expect(mockLocalDb.links).toEqual([])
  })

  test('after joining, trying again posts it and writes both mirrors', async () => {
    await second.joinRing(ringSlug)
    const [result] = await send()
    expect(result).toMatchObject({ slug: ringSlug, status: 'posted' })
    hubPostId = result.hubPostId!
    expect(typeof hubPostId).toBe('string')

    expect(mockLocalDb.postRingIds.get(post.id)).toEqual({ [ringSlug]: hubPostId })
    expect(mockLocalDb.links).toEqual([expect.objectContaining({ postId: post.id, threadRingId: `local-${ringSlug}` })])

    // The ring feed shows it with the metadata built from the post.
    const feed = await client.getRingFeed(ringSlug)
    const ref = feed.posts.find((p) => p.id === hubPostId)
    expect(ref?.uri).toMatch(/\/resident\/itest2\/post\/retry-1$/)
    expect(ref?.metadata).toMatchObject({ title: post.title, publishedAt: '2026-10-17T12:00:00.000Z' })
  })

  test('trying again once it is in the ring returns the same PostRef and adds nothing', async () => {
    expect(await send()).toEqual([
      expect.objectContaining({ slug: ringSlug, status: 'posted', hubPostId }),
    ])
    expect(mockLocalDb.links).toHaveLength(1)
  })

  test('once taken out of the ring, it can\'t be sent back, and the reason says so', async () => {
    await second.curatePost(hubPostId, 'remove')
    expect(await send()).toEqual([
      expect.objectContaining({ slug: ringSlug, status: 'failed', reason: REMOVED_BEFORE_REASON }),
    ])
  })
})

describe('aggregated feeds + memberships (audit 0.5: stripped metadata, null → "")', () => {
  // Same metadata pages/api/threadrings/[slug]/fork.ts submits to the parent ring.
  const FORK_NOTE_URI = 'threadring://threadstead-itest.invalid/rings/itest-fork-note'
  const forkNoteMetadata = {
    type: 'fork_notification',
    title: 'A new ring forked from this one',
    forkedRing: { id: 'itest-fork-id', slug: 'itest-forked', name: 'Forked Ring', description: null },
  }

  test('submitPost keeps metadata keys outside the declared whitelist', async () => {
    const result = await client.submitPost(ringSlug, {
      uri: FORK_NOTE_URI,
      digest: 'sha256:itest-fork-note',
      metadata: forkNoteMetadata,
    })
    expect(result.metadata).toMatchObject(forkNoteMetadata)
  })

  test('getMyFeed returns full post metadata, not {}', async () => {
    const feed = await client.getMyFeed({ limit: 50 })
    const post = feed.posts.find((p) => p.uri === POST_URI)
    expect(post?.metadata).toMatchObject({ title: 'Integration test post', tags: ['itest'] })

    const note = feed.posts.find((p) => p.uri === FORK_NOTE_URI)
    expect(note?.isNotification).toBe(true)
    expect(note?.notificationType).toBe('fork_notification')
    // RingHubFeed.tsx renders fork notifications only when BOTH agree.
    expect(note?.metadata).toMatchObject(forkNoteMetadata)
  })

  test('getTrendingFeed returns full post metadata, not {}', async () => {
    const feed = await client.getTrendingFeed({ timeWindow: 'hour', limit: 50 })
    const post = feed.posts.find((p) => p.uri === POST_URI)
    expect(post?.metadata).toMatchObject({ title: 'Integration test post' })
    expect(feed.posts.find((p) => p.uri === FORK_NOTE_URI)?.metadata).toMatchObject(forkNoteMetadata)
  })

  test('getMyMemberships sends real values and null — never "" for missing ones', async () => {
    // A ring with no description, owned by the test actor (rings are created
    // by forking the spool, as ringhub-user-operations.createRing does).
    await client.forkRing('spool', { name: 'Fork Without Description', slug: FORK_SLUG })

    const result = await client.getMyMemberships({ status: 'ACTIVE' })
    const joined = result.memberships.find((m) => m.ringSlug === ringSlug)
    expect(joined?.ringDescription).toBe('Ring used by the federation integration suite')
    expect(joined?.role).toBe('member')
    expect(typeof joined?.badgeId).toBe('string')
    expect(joined?.badgeId).not.toBe('')
    expect(Number.isNaN(Date.parse(joined!.joinedAt!))).toBe(false)

    const owned = result.memberships.find((m) => m.ringSlug === FORK_SLUG)
    expect(owned?.role).toBe('owner')
    // fast-json-stringify coerces null to "" unless the field is nullable.
    expect(owned?.ringDescription).toBeNull()
  })
})

describe('owner member management (audit 0.8)', () => {
  let second: RingHubClient
  let secondDid: string

  beforeAll(() => {
    second = makeTestClient('second')
    secondDid = getRuntime().secondActorDid
  })

  test('a non-member cannot change roles (why server-DID-signed calls failed)', async () => {
    // pages/api/threadrings/[slug]/members/[userId].ts used to sign as the
    // server DID, which is not a member of user-owned rings.
    await expect(second.updateMemberRole(FORK_SLUG, actorDid, 'member')).rejects.toMatchObject({ status: 403 })
  })

  test('the owner can promote a member to moderator on an API-created ring', async () => {
    await second.joinRing(FORK_SLUG)
    // Rings from /trp/fork used to get only owner + member → 400 "Role not found".
    const result = await client.updateMemberRole(FORK_SLUG, secondDid, 'moderator')
    expect(result.member.role).toBe('moderator')

    const memberships = await second.getMyMemberships({ status: 'ACTIVE' })
    expect(memberships.memberships.find((m) => m.ringSlug === FORK_SLUG)?.role).toBe('moderator')
  })

  test('a moderator cannot assign roles (moderator lacks manage_members)', async () => {
    await expect(second.updateMemberRole(FORK_SLUG, actorDid, 'member')).rejects.toMatchObject({ status: 403 })
  })

  test('the owner can demote and then remove a member', async () => {
    const demoted = await client.updateMemberRole(FORK_SLUG, secondDid, 'member')
    expect(demoted.member.role).toBe('member')

    const removed = await client.removeMember(FORK_SLUG, secondDid)
    expect(removed.success).toBe(true)
    const memberships = await second.getMyMemberships({ status: 'ACTIVE' })
    expect(memberships.memberships.find((m) => m.ringSlug === FORK_SLUG)).toBeUndefined()
  })
})

describe('orphaned PostRefs reconcile (A3)', () => {
  // URIs on a host the scan treats as "this instance"; the local DB is
  // stubbed by existingPostIds. Everything hub-side is real.
  const OUR_HOST = 'https://threadstead-itest.invalid'
  const isOurUri = (uri: string) => uri.startsWith(OUR_HOST)
  const LIVE_URI = `${OUR_HOST}/resident/itest/post/a3-live`
  const ORPHAN_URI = `${OUR_HOST}/resident/itest/post/a3-gone`
  const FOREIGN_ORPHAN_URI = `${OUR_HOST}/resident/someone/post/a3-gone-foreign`
  const existingPostIds = async (ids: string[]) => new Set(ids.filter((id) => id === 'a3-live'))
  const scan = () =>
    scanForOrphanPostRefs({ hub: client, ringSlugs: [ringSlug, FORK_SLUG], existingPostIds, isOurUri })
  let second: RingHubClient

  beforeAll(async () => {
    second = makeTestClient('second')
    await client.submitPost(ringSlug, { uri: LIVE_URI, digest: 'sha256:a3-live' })
    // The same deleted post in two rings: one author call must remove both.
    await client.submitPost(ringSlug, { uri: ORPHAN_URI, digest: 'sha256:a3-gone' })
    await client.submitPost(FORK_SLUG, { uri: ORPHAN_URI, digest: 'sha256:a3-gone' })
    // Authored by an actor with no key "here" (deleted account) in a ring the main actor owns.
    await second.submitPost(FORK_SLUG, { uri: FOREIGN_ORPHAN_URI, digest: 'sha256:a3-foreign' })
  })

  test('the scan finds exactly the refs whose local post is gone', async () => {
    const result = await scan()
    expect(result.ringsFailed).toEqual([])
    expect(result.orphans.map((o) => [o.ringSlug, o.postId]).sort()).toEqual([
      [FORK_SLUG, 'a3-gone'],
      [FORK_SLUG, 'a3-gone-foreign'],
      [ringSlug, 'a3-gone'],
    ].sort())
  })

  test('--apply: author removal clears every ring; owner fallback clears the rest; the live post stays', async () => {
    const { orphans } = await scan()
    const ringOwners = new Map([[FORK_SLUG, actorDid]])
    const plan = await planOrphanRemoval(orphans, {
      localUsersByDid: async (dids) => new Map(dids.filter((d) => d === actorDid).map((d) => [d, 'main'])),
      ringOwners,
      ownerFallback: true,
    })
    expect(plan.filter((p) => p.signer?.kind === 'author')).toHaveLength(1)
    expect(plan.filter((p) => p.coveredBy)).toHaveLength(1)
    expect(plan.filter((p) => p.signer?.kind === 'owner').map((p) => p.orphan.postId)).toEqual(['a3-gone-foreign'])

    const outcomes = await executeOrphanRemoval(plan, { curateAs: () => client })
    expect(outcomes.every((o) => o.ok)).toBe(true)
    expect(outcomes.map((o) => o.totalRemoved).sort()).toEqual([1, 2])

    const after = await scan()
    expect(after.orphans).toEqual([])
    const feed = await client.getRingFeed(ringSlug)
    expect(feed.posts.find((p) => p.uri === LIVE_URI)).toBeDefined()
  })
})

describe('post deletion removes hub PostRefs (admin delete-post)', () => {
  // pages/api/admin/delete-post.ts used to curate with the LOCAL post id signed
  // as the server DID. Both routes now share removePostFromRingHub.
  const STORED_POST_ID = 'del-stored'
  const LEGACY_POST_ID = 'del-legacy'
  const storedUri = buildPostUri('itest', STORED_POST_ID)
  const legacyUri = buildPostUri('itest', LEGACY_POST_ID)
  let storedRefId: string
  let second: RingHubClient
  let gate: jest.SpyInstance

  const asPost = (id: string, threadRingPostIds: Record<string, string> | null, slugs: string[]) => ({
    id,
    authorId: 'main',
    author: { primaryHandle: 'itest@threadstead-itest.invalid' },
    threadRingPostIds,
    threadRings: slugs.map((slug) => ({ threadRing: { slug } })),
  })

  beforeAll(async () => {
    second = makeTestClient('second')
    gate = jest.spyOn(ringHubClientModule, 'shouldUseRingHub').mockReturnValue(true)
    ;(createAuthenticatedRingHubClient as jest.Mock).mockImplementation((userId: 'main' | 'second') =>
      userId === 'main' ? client : makeTestClient(userId)
    )
    // The same post in two rings, as create.ts submits it (signed as the author).
    storedRefId = (await client.submitPost(ringSlug, { uri: storedUri, digest: 'sha256:del-stored' })).id
    await client.submitPost(FORK_SLUG, { uri: storedUri, digest: 'sha256:del-stored' })
    // A post from before threadRingPostIds existed: found only by its URI.
    await client.submitPost(ringSlug, { uri: legacyUri, digest: 'sha256:del-legacy' })
  })

  afterAll(() => {
    gate.mockRestore()
  })

  test('the old call shape could never work: a local post id 404s, a non-author signer 403s', async () => {
    await expect(client.curatePost(STORED_POST_ID, 'remove')).rejects.toMatchObject({ status: 404 })
    await expect(second.curatePost(storedRefId, 'remove')).rejects.toMatchObject({ status: 403 })
  })

  test('one author-signed removal by the stored PostRef id clears every ring', async () => {
    const curate = jest.spyOn(client, 'curatePost')
    try {
      const result = await removePostFromRingHub(
        asPost(STORED_POST_ID, { [ringSlug]: storedRefId }, [ringSlug, FORK_SLUG]),
        'Post deleted by admin: itest'
      )
      expect(result.synced).toBe(true)
      expect(result.affectedRings.sort()).toEqual([FORK_SLUG, ringSlug].sort())
      expect(curate).toHaveBeenCalledTimes(1)
    } finally {
      curate.mockRestore()
    }

    for (const slug of [ringSlug, FORK_SLUG]) {
      const feed = await client.getRingFeed(slug, { limit: 100 })
      expect(feed.posts.find((p) => p.uri === storedUri)).toBeUndefined()
    }
  })

  test('without a stored id, the canonical URI in the ring feed is matched and removed', async () => {
    const result = await removePostFromRingHub(asPost(LEGACY_POST_ID, null, [ringSlug]), 'itest')
    expect(result).toEqual({ synced: true, affectedRings: [ringSlug] })
    const feed = await client.getRingFeed(ringSlug, { limit: 100 })
    expect(feed.posts.find((p) => p.uri === legacyUri)).toBeUndefined()
  })
})

describe('badges (the `badge: {}` regression)', () => {
  test('getActorBadges returns non-empty badge JSON-LD', async () => {
    const result = await client.getActorBadges(actorDid)
    expect(result.badges.length).toBeGreaterThanOrEqual(1)
    const entry = result.badges.find((b) => b.ring.slug === ringSlug)
    expect(entry).toBeDefined()
    // The hub once serialized every badge to {} via a bare `type: 'object'`
    // response schema. The contract schema also refuses empty objects; this
    // asserts the actual credential content came through.
    expect(Object.keys(entry!.badge).length).toBeGreaterThan(0)
    expect(entry!.badge).toHaveProperty('credentialSubject')
    expect(entry!.membership.status).toBe('ACTIVE')
  })
})

describe('post removal and leave', () => {
  test('curatePost(remove) as author removes the post', async () => {
    const feed = await client.getRingFeed(ringSlug)
    const post = feed.posts.find((p) => p.uri === POST_URI)
    // PostRef.id is optional in the client type (some local transformers build
    // PostRefs without it), but the hub always sends it — assert before using.
    expect(post?.id).toBeDefined()
    const result = await client.curatePost(post!.id!, 'remove', { reason: 'itest cleanup' })
    expect(result.post.status).toBe('REMOVED')
    expect(result.action).toBe('remove')
  })

  test('the removed post disappears from the feed', async () => {
    // The feed route has no authenticateActor preHandler, so every request is
    // anonymous and only ACCEPTED posts are visible — REMOVED posts vanish
    // for members and non-members alike.
    const feed = await client.getRingFeed(ringSlug)
    expect(feed.posts.find((p) => p.uri === POST_URI)).toBeUndefined()
  })

  test('leaveRing succeeds and memberships empty out', async () => {
    await expect(client.leaveRing(ringSlug)).resolves.toBeUndefined()
    const result = await client.getMyMemberships({ status: 'ACTIVE' })
    expect(result.memberships.find((m) => m.ringSlug === ringSlug)).toBeUndefined()
  })
})
