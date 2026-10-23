/**
 * The local ThreadRing row that mirrors a Ring Hub ring outlives the account
 * that happened to post to it first.
 *
 * mirrorRingResults (lib/domain/posts/send-to-rings.ts) creates that row the
 * first time a post lands in a hub ring we haven't seen. Ring Hub owns the
 * ring (Ring.ownerDid), so the first poster isn't its curator, and deleting
 * their account (lib/domain/users/account-removal.ts) must not take the row,
 * or everyone else's PostThreadRing links, with it. Ring Hub is a stub that
 * has already dropped the posts: this site owns the ring, and removing 404s.
 */
import { db } from '@/lib/config/database/connection'
import { SITE_NAME } from '@/lib/config/site/constants'

const SITE_DID = 'did:web:threadstead.test'
jest.mock('@/lib/api/ringhub/ringhub-client', () => ({
  getPublicRingHubClient: () => ({ getRing: async () => ({ ownerDid: 'did:web:threadstead.test' }) }),
  getRingHubClient: () => ({
    curatePost: async () => {
      throw Object.assign(new Error('Not found'), { status: 404 })
    },
  }),
}))
jest.mock('@/lib/domain/notifications', () => ({
  createGuestbookNotification: jest.fn(),
  createCommentNotification: jest.fn(),
  createReplyNotification: jest.fn(),
  createMentionNotifications: jest.fn(),
}))

import { mirrorRingResults } from '@/lib/domain/posts/send-to-rings'
import { moderateUser } from '@/lib/domain/users/moderation'
import { deleteUserAccount } from '@/lib/domain/users/account-removal'

let seq = 0

async function person(handle: string, role: 'member' | 'admin' = 'member') {
  const id = `u_${handle}`
  await db.user.create({
    data: {
      id,
      did: `did:test:${handle}:${seq++}`,
      role,
      primaryHandle: `${handle}@${SITE_NAME}`,
      handles: { create: { handle, host: SITE_NAME } },
    },
  })
  return id
}

/** A post the hub accepted into `slug`, mirrored the way create.ts does it. */
async function postToHubRing(authorId: string, slug: string) {
  const postId = `post_${authorId}_${slug}`
  await db.post.create({ data: { id: postId, authorId, title: 'hello', bodyText: 'hi', visibility: 'public' } })
  await mirrorRingResults({
    postId,
    userId: authorId,
    results: [{ slug, name: 'Gardens', status: 'posted', hubPostId: `ref_${postId}` }],
  })
  return postId
}

let ADMIN: string, FIRST: string, LATER: string

beforeEach(async () => {
  await db.$executeRawUnsafe('TRUNCATE "User" RESTART IDENTITY CASCADE')
  await db.$executeRawUnsafe('TRUNCATE "ThreadRing" RESTART IDENTITY CASCADE')
  ADMIN = await person('admin', 'admin')
  FIRST = await person('first')
  LATER = await person('later')
})

beforeAll(() => {
  process.env.THREADSTEAD_DID = SITE_DID
})

afterAll(() => db.$disconnect())

describe('hub ring mirror rows', () => {
  it("aren't curated by whoever posted first", async () => {
    await postToHubRing(FIRST, 'gardens')
    const ring = await db.threadRing.findUniqueOrThrow({ where: { slug: 'gardens' } })
    expect(ring.curatorId).toBeNull()
  })

  it("survive deleting the first poster, with everyone else's posts still linked", async () => {
    await postToHubRing(FIRST, 'gardens')
    const laterPost = await postToHubRing(LATER, 'gardens')
    expect((await db.threadRing.findUniqueOrThrow({ where: { slug: 'gardens' } })).postCount).toBe(2)

    await moderateUser({ action: 'ban', reason: 'spam' }, { actorId: ADMIN, userId: FIRST })
    const result = await deleteUserAccount({ actorId: ADMIN, userId: FIRST, reason: 'spam' })
    expect(result.deleted).toBe(true)

    const ring = await db.threadRing.findUnique({ where: { slug: 'gardens' } })
    expect(ring).not.toBeNull()
    expect(ring!.postCount).toBe(1)
    const links = await db.postThreadRing.findMany({ where: { threadRingId: ring!.id }, select: { postId: true } })
    expect(links).toEqual([{ postId: laterPost }])
  })

  it('survive deleting a curator who really did own the row', async () => {
    // Older rows (and backfilled ones) still name a person; the row stays
    // without one rather than going with them.
    await postToHubRing(LATER, 'gardens')
    await db.threadRing.update({ where: { slug: 'gardens' }, data: { curatorId: FIRST } })

    await moderateUser({ action: 'ban', reason: 'spam' }, { actorId: ADMIN, userId: FIRST })
    expect((await deleteUserAccount({ actorId: ADMIN, userId: FIRST })).deleted).toBe(true)

    const ring = await db.threadRing.findUniqueOrThrow({ where: { slug: 'gardens' } })
    expect(ring.curatorId).toBeNull()
    expect(await db.postThreadRing.count({ where: { threadRingId: ring.id } })).toBe(1)
  })
})
