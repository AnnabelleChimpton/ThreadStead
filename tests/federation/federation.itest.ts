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
import { makeTestClient, getRuntime } from './harness/test-client'

// One membership lifecycle threads through this whole file, in order.
let client: RingHubClient
let ringSlug: string
let actorDid: string

const POST_URI = 'https://threadstead-itest.invalid/posts/itest-post-1'
const POST_DIGEST = 'sha256:itest-digest-1'

beforeAll(() => {
  const rt = getRuntime()
  client = makeTestClient()
  ringSlug = rt.ringSlug
  actorDid = rt.testActorDid
})

describe('ring discovery', () => {
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
    const post = feed.posts.find((p) => p.uri === POST_URI)!
    const result = await client.curatePost(post.id, 'remove', { reason: 'itest cleanup' })
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
