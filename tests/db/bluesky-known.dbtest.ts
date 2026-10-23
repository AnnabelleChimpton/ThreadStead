/**
 * "People you already know here" (lib/domain/bluesky/known-follows.ts)
 * against a real Postgres, with Bluesky's getFollows faked: who counts as a
 * match, who's left out (visibility, moderation, blocks either way, people
 * already followed, yourself), paging and its cap, and Bluesky failing.
 */
import type { Visibility } from '@prisma/client'
import { db } from '@/lib/config/database/connection'
import { SITE_NAME } from '@/lib/config/site/constants'
import type { Fetcher } from '@/lib/domain/bluesky/atproto'
import {
  MAX_FOLLOW_PAGES,
  clearBlueskyFollowsCache,
  fetchBlueskyFollows,
  knownPeopleHere,
} from '@/lib/domain/bluesky/known-follows'

const BASE32 = 'abcdefghijklmnopqrstuvwxyz234567'
/** A distinct well-formed did:plc for each number */
function did(n: number): string {
  let s = ''
  let x = n
  do {
    s = BASE32[x % 32] + s
    x = Math.floor(x / 32)
  } while (x > 0)
  return `did:plc:${s.padStart(24, 'a')}`
}
const VIEWER_DID = 'did:plc:viewerviewerviewerviewer'

let seq = 0
async function resident(
  handle: string,
  opts: { visibility?: Visibility; link?: { did: string; status?: 'verified' | 'pending' | 'revoked' } } = {}
) {
  const id = `u_known_${handle}_${seq++}`
  await db.user.create({
    data: {
      id,
      did: `did:test:known:${id}`,
      primaryHandle: `${handle}@${SITE_NAME}`,
      subdomainLabel: handle.replace(/_/g, '-'),
      handles: { create: { handle, host: SITE_NAME } },
      profile: { create: { displayName: `The ${handle}`, visibility: opts.visibility ?? 'public' } },
    },
  })
  if (opts.link) {
    await db.blueskyHandleLink.create({
      data: { userId: id, did: opts.link.did, status: opts.link.status ?? 'verified', verifiedAt: new Date() },
    })
  }
  return id
}

/** getFollows for the viewer's DID, in pages of `pageSize`. */
function follows(dids: string[], { pageSize = 100, failOnPage }: { pageSize?: number; failOnPage?: number } = {}) {
  const calls: string[] = []
  const fetcher: Fetcher = async (url) => {
    calls.push(url)
    const params = new URL(url).searchParams
    const page = Number(params.get('cursor') ?? 0)
    if (failOnPage === page) return new Response('', { status: 502 })
    const slice = dids.slice(page * pageSize, (page + 1) * pageSize)
    const next = (page + 1) * pageSize < dids.length ? String(page + 1) : undefined
    return new Response(JSON.stringify({ follows: slice.map((d) => ({ did: d, handle: 'x.bsky.social' })), cursor: next }))
  }
  return { fetcher, calls }
}

let viewer: string
beforeAll(async () => {
  viewer = await resident('kn_viewer', { link: { did: VIEWER_DID } })
})
beforeEach(() => clearBlueskyFollowsCache())
afterAll(async () => {
  await db.$disconnect()
})

test('residents you follow on Bluesky, minus everyone who should not show', async () => {
  const friend = await resident('kn_friend', { link: { did: did(1) } })
  await resident('kn_pending', { link: { did: did(2), status: 'pending' } })
  await resident('kn_revoked', { link: { did: did(3), status: 'revoked' } })
  await resident('kn_notfollowed', { link: { did: did(4) } })
  const banned = await resident('kn_banned', { link: { did: did(5) } })
  await db.user.update({ where: { id: banned }, data: { moderationStatus: 'banned' } })
  await resident('kn_private', { visibility: 'private', link: { did: did(6) } })
  const blockedByViewer = await resident('kn_blocked', { link: { did: did(7) } })
  await db.userBlock.create({ data: { blockerId: viewer, blockedUserId: blockedByViewer } })
  const blocksViewer = await resident('kn_blocker', { link: { did: did(8) } })
  await db.userBlock.create({ data: { blockerId: blocksViewer, blockedUserId: viewer } })
  const alreadyFollowed = await resident('kn_followed', { link: { did: did(9) } })
  await db.follow.create({ data: { followerId: viewer, followeeId: alreadyFollowed } })
  const friendsOnlyMutual = await resident('kn_mutual', { visibility: 'friends', link: { did: did(10) } })
  await db.follow.create({ data: { followerId: friendsOnlyMutual, followeeId: viewer } })

  // They follow all of these on Bluesky, and themselves (their own DID)
  const { fetcher } = follows([1, 2, 3, 5, 6, 7, 8, 9, 10].map(did).concat(VIEWER_DID))
  const people = await knownPeopleHere(viewer, { fetcher })

  expect(people).toEqual([{ username: 'kn_friend', displayName: 'The kn_friend', avatarUrl: null }])
  expect(friend).toBeTruthy()
})

test('a friends-only resident shows once they can see them, unless they already follow', async () => {
  const mutual = await resident('kn_mutual2', { visibility: 'friends', link: { did: did(11) } })
  await db.follow.create({ data: { followerId: mutual, followeeId: viewer } })
  const { fetcher } = follows([did(11)])
  // Friends-only needs a follow both ways, and a follow from the viewer means "already followed"
  expect(await knownPeopleHere(viewer, { fetcher })).toEqual([])
})

test("nothing when the viewer's own link isn't verified, and no call to Bluesky", async () => {
  const pending = await resident('kn_viewer_pending', { link: { did: did(12), status: 'pending' } })
  const unlinked = await resident('kn_viewer_none')
  const { fetcher, calls } = follows([did(1)])
  expect(await knownPeopleHere(pending, { fetcher })).toEqual([])
  expect(await knownPeopleHere(unlinked, { fetcher })).toEqual([])
  expect(calls).toEqual([])
})

test('Bluesky failing hides it (and is remembered briefly); a good answer is cached', async () => {
  const someone = await resident('kn_cached', { link: { did: did(13) } })
  const viewer2 = await resident('kn_viewer2', { link: { did: 'did:plc:viewertwoviewertwoviewert' } })
  expect(someone).toBeTruthy()

  const failing = follows([did(13)], { failOnPage: 0 })
  expect(await knownPeopleHere(viewer2, { fetcher: failing.fetcher })).toEqual([])
  const retry = follows([did(13)])
  expect(await knownPeopleHere(viewer2, { fetcher: retry.fetcher })).toEqual([])
  expect(retry.calls).toEqual([]) // still remembering the failure

  const later = Date.now() + 2 * 60 * 1000
  expect(await knownPeopleHere(viewer2, { fetcher: retry.fetcher, now: later })).toHaveLength(1)
  expect(await knownPeopleHere(viewer2, { fetcher: retry.fetcher, now: later + 1000 })).toHaveLength(1)
  expect(retry.calls).toHaveLength(1)
})

describe('fetchBlueskyFollows', () => {
  test('follows the cursor across pages, deduped and lowercased', async () => {
    const dids = Array.from({ length: 250 }, (_, i) => did(100 + i))
    const { fetcher, calls } = follows([...dids, dids[0].toUpperCase()], { pageSize: 100 })
    const result = await fetchBlueskyFollows(VIEWER_DID, fetcher)
    expect(result).toHaveLength(250)
    expect(calls).toHaveLength(3)
    expect(calls[0]).toContain('app.bsky.graph.getFollows?actor=did%3Aplc%3Aviewer')
  })

  test(`stops at ${MAX_FOLLOW_PAGES} pages`, async () => {
    const dids = Array.from({ length: 2000 }, (_, i) => did(1000 + i))
    const { fetcher, calls } = follows(dids, { pageSize: 100 })
    expect(await fetchBlueskyFollows(VIEWER_DID, fetcher)).toHaveLength(MAX_FOLLOW_PAGES * 100)
    expect(calls).toHaveLength(MAX_FOLLOW_PAGES)
  })

  test('any page failing, or a malformed answer, is a failure', async () => {
    expect(await fetchBlueskyFollows(VIEWER_DID, follows(Array.from({ length: 150 }, (_, i) => did(i)), { failOnPage: 1 }).fetcher)).toBeNull()
    expect(await fetchBlueskyFollows(VIEWER_DID, async () => new Response('{"nope":1}'))).toBeNull()
    expect(await fetchBlueskyFollows(VIEWER_DID, async () => { throw new Error('timeout') })).toBeNull()
  })
})
