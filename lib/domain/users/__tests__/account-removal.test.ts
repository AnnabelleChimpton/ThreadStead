/**
 * @jest-environment node
 *
 * Deleting an account takes its ring posts off Ring Hub first (S-2), with
 * mocked hub clients. The hub's POST /trp/curate looks PostRefs up by id and
 * lets the author (actorDid / submittedBy) or a ring moderator remove them;
 * an author removal covers every ring with the same uri + actorDid. Without
 * the author's key, the ring owner removes it instead. Then the account
 * leaves its rings (POST /trp/leave as the member, DELETE
 * /trp/rings/:slug/members/:did as the ring owner when that fails), and
 * owning a ring blocks the delete unless forced.
 */
jest.mock('@/lib/config/database/connection', () => ({
  db: {
    post: { findMany: jest.fn() },
    user: { findUnique: jest.fn(), delete: jest.fn() },
    userDID: { findUnique: jest.fn() },
    moderationAction: { create: jest.fn() },
    handleTombstone: { createMany: jest.fn() },
    guestbookEntry: { deleteMany: jest.fn() },
    emailLoginToken: { deleteMany: jest.fn() },
    media: { findMany: jest.fn(async () => []) },
    profile: { findUnique: jest.fn(async () => null) },
    userHomeConfig: { findUnique: jest.fn(async () => null) },
    $executeRaw: jest.fn(),
    $transaction: jest.fn(),
  },
}))
jest.mock('@/lib/api/ringhub/ringhub-client', () => ({
  shouldUseRingHub: jest.fn(() => true),
  getPublicRingHubClient: jest.fn(),
  getRingHubClient: jest.fn(),
}))
jest.mock('@/lib/api/ringhub/ringhub-user-operations', () => ({
  createAuthenticatedRingHubClient: jest.fn(),
}))
jest.mock('@/lib/storage/r2', () => ({
  keyFromPublicUrl: (url: string) => (url.startsWith('https://cdn.test/') ? url.slice('https://cdn.test/'.length) : null),
  deleteObjects: jest.fn(async () => ({ deleted: [], failed: [] })),
}))
jest.mock('@/lib/indie-index/tiers', () => ({
  recomputeSites: jest.fn(async () => 0),
  sitesTouchedBy: jest.fn(async () => ['site-1']),
}))

import { db } from '@/lib/config/database/connection'
import { getPublicRingHubClient, getRingHubClient, shouldUseRingHub } from '@/lib/api/ringhub/ringhub-client'
import { createAuthenticatedRingHubClient } from '@/lib/api/ringhub/ringhub-user-operations'
import { buildPostUri } from '@/lib/domain/posts/ringhub-metadata'
import { deleteObjects } from '@/lib/storage/r2'
import {
  deleteUserAccount,
  leaveUserRingsOnHub,
  listUserRingMemberships,
  removeUserPostsFromRingHub,
  type RingMembership,
} from '@/lib/domain/users/account-removal'
import { recomputeSites } from '@/lib/indie-index/tiers'

const mockDb = db as any
const events: string[] = []

function hubError(status: number, message = 'nope') {
  return Object.assign(new Error(message), { status })
}

/**
 * A signed hub client that records who signed: curate answers per PostRef
 * id, leave and removeMember per ring slug, and getMyMemberships pages
 * through `memberships` (none by default).
 */
function curator(
  name: string,
  answer: (refId: string) => any = () => ({}),
  { memberships = [] as RingMembership[], leave = (_slug: string): any => undefined } = {}
) {
  const settle = (result: any) => {
    if (result instanceof Error) throw result
    return result
  }
  return {
    curatePost: jest.fn(async (refId: string, action: string, options?: { reason?: string }) => {
      events.push(`${name}:${action}:${refId}`)
      return settle(answer(refId))
    }),
    getMyMemberships: jest.fn(async ({ status, limit = 20, offset = 0 }: any = {}) => {
      const matching = memberships.filter((m) => m.status === (status ?? 'ACTIVE'))
      const page = matching.slice(offset, offset + limit)
      return { memberships: page, total: matching.length, hasMore: offset + limit < matching.length }
    }),
    leaveRing: jest.fn(async (slug: string) => {
      events.push(`${name}:leave:${slug}`)
      return settle(leave(slug))
    }),
    removeMember: jest.fn(async (slug: string, did: string) => {
      events.push(`${name}:remove-member:${slug}:${did}`)
      return settle(leave(slug))
    }),
  }
}

const ring = (ringSlug: string, role: string = 'member', status = 'ACTIVE'): RingMembership => ({
  ringSlug,
  ringName: ringSlug.toUpperCase(),
  role,
  status,
})

const reader = {
  getRing: jest.fn(),
  getRingFeed: jest.fn(),
}

function post(id: string, rings: Record<string, string | null>) {
  const stored = Object.fromEntries(Object.entries(rings).filter(([, ref]) => ref)) as Record<string, string>
  return {
    id,
    authorId: 'spammer',
    threadRingPostIds: Object.keys(stored).length ? stored : null,
    author: { primaryHandle: 'spammer@local' },
    threadRings: Object.keys(rings).map((slug) => ({ threadRing: { slug } })),
  }
}

let author: ReturnType<typeof curator>
let owners: Record<string, ReturnType<typeof curator>>

beforeEach(() => {
  jest.clearAllMocks()
  events.length = 0
  ;(shouldUseRingHub as jest.Mock).mockReturnValue(true)
  ;(getPublicRingHubClient as jest.Mock).mockReturnValue(reader)
  author = curator('author', () => ({ affectedRings: [] }))
  owners = {}
  ;(createAuthenticatedRingHubClient as jest.Mock).mockImplementation((userId: string) =>
    userId === 'spammer' ? author : (owners[userId] ??= curator(`owner-${userId}`))
  )
  reader.getRing.mockImplementation(async (slug: string) => ({ slug, ownerDid: `did:owner:${slug}` }))
  reader.getRingFeed.mockResolvedValue({ posts: [], total: 0 })
  mockDb.userDID.findUnique.mockImplementation(async ({ where }: any) => {
    if (where.userId === 'spammer') return { userId: 'spammer', did: 'did:spammer' }
    const owner = where.did?.match(/^did:owner:(.+)$/)
    return owner ? { userId: `owner-of-${owner[1]}` } : null
  })
  mockDb.$transaction.mockImplementation(async (ops: any[]) => {
    events.push('transaction')
    return ops
  })
  mockDb.user.delete.mockImplementation(() => 'delete-op')
})

describe('removeUserPostsFromRingHub', () => {
  it('removes each post as its author, and one author call covers every ring it reports', async () => {
    mockDb.post.findMany.mockResolvedValue([post('p1', { art: 'ref-art', zines: 'ref-zines' }), post('p2', { art: 'ref-p2' })])
    author = curator('author', (refId) => ({ affectedRings: refId === 'ref-art' ? [{ slug: 'art' }, { slug: 'zines' }] : [] }))

    const result = await removeUserPostsFromRingHub('spammer', 'Account removed by an admin: spam')

    expect(events).toEqual(['author:remove:ref-art', 'author:remove:ref-p2'])
    expect(author.curatePost).toHaveBeenCalledWith('ref-art', 'remove', { reason: 'Account removed by an admin: spam' })
    expect(result.removals).toEqual([
      { postId: 'p1', ringSlug: 'art', outcome: 'removed', signer: 'author' },
      { postId: 'p1', ringSlug: 'zines', outcome: 'covered', signer: 'author' },
      { postId: 'p2', ringSlug: 'art', outcome: 'removed', signer: 'author' },
    ])
    expect(result.failed).toEqual([])
    expect(result.hadKey).toBe(true)
    // Never signed as the instance for an author's post
    expect(getRingHubClient).not.toHaveBeenCalled()
  })

  it('finds the PostRef by URI in the ring feed when no id was stored', async () => {
    mockDb.post.findMany.mockResolvedValue([post('old', { art: null })])
    reader.getRingFeed.mockResolvedValue({
      posts: [{ id: 'someone-else', uri: 'x' }, { id: 'ref-old', uri: buildPostUri('spammer@local', 'old') }],
      total: 2,
    })

    const result = await removeUserPostsFromRingHub('spammer', 'r')

    expect(reader.getRingFeed).toHaveBeenCalledWith('art', expect.objectContaining({ offset: 0 }))
    expect(events).toEqual(['author:remove:ref-old'])
    expect(result.removals[0].outcome).toBe('removed')
  })

  it('reports not_on_hub when the ring feed has no such post, or the hub 404s a stored id', async () => {
    mockDb.post.findMany.mockResolvedValue([post('gone', { art: null, zines: 'ref-stale' })])
    author = curator('author', () => hubError(404))

    const result = await removeUserPostsFromRingHub('spammer', 'r')

    expect(result.removals.map((r) => [r.ringSlug, r.outcome])).toEqual([
      ['art', 'not_on_hub'],
      ['zines', 'not_on_hub'],
    ])
    expect(result.failed).toEqual([])
  })

  it('without a key here, removes as each ring owner instead (never mints a new key)', async () => {
    mockDb.userDID.findUnique.mockImplementation(async ({ where }: any) =>
      where.userId === 'spammer' ? null : { userId: `owner-of-${where.did.split(':').pop()}` }
    )
    mockDb.post.findMany.mockResolvedValue([post('p1', { art: 'ref-art', zines: 'ref-zines' })])

    const result = await removeUserPostsFromRingHub('spammer', 'r')

    expect(createAuthenticatedRingHubClient).not.toHaveBeenCalledWith('spammer')
    expect(events).toEqual(['owner-owner-of-art:remove:ref-art', 'owner-owner-of-zines:remove:ref-zines'])
    expect(result.hadKey).toBe(false)
    expect(result.removals.every((r) => r.outcome === 'removed' && r.signer === 'owner')).toBe(true)
  })

  it('falls back to the ring owner when the author call fails', async () => {
    mockDb.post.findMany.mockResolvedValue([post('p1', { art: 'ref-art' })])
    author = curator('author', () => hubError(403, 'not the author'))

    const result = await removeUserPostsFromRingHub('spammer', 'r')

    expect(events).toEqual(['author:remove:ref-art', 'owner-owner-of-art:remove:ref-art'])
    expect(result.removals).toEqual([{ postId: 'p1', ringSlug: 'art', outcome: 'removed', signer: 'owner' }])
  })

  it('signs as the instance for rings the server owns', async () => {
    process.env.THREADSTEAD_DID = 'did:web:instance'
    const server = curator('server')
    ;(getRingHubClient as jest.Mock).mockReturnValue(server)
    reader.getRing.mockResolvedValue({ slug: 'welcome', ownerDid: 'did:web:instance' })
    mockDb.userDID.findUnique.mockImplementation(async ({ where }: any) => (where.userId ? null : null))
    mockDb.post.findMany.mockResolvedValue([post('p1', { welcome: 'ref-w' })])

    const result = await removeUserPostsFromRingHub('spammer', 'r')

    expect(events).toEqual(['server:remove:ref-w'])
    expect(result.failed).toEqual([])
    delete process.env.THREADSTEAD_DID
  })

  it('reports what nobody here can remove, and keeps going', async () => {
    mockDb.userDID.findUnique.mockResolvedValue(null) // no author key, no owner key
    mockDb.post.findMany.mockResolvedValue([post('p1', { art: 'ref-art' }), post('p2', { zines: 'ref-z' })])
    reader.getRingFeed.mockRejectedValue(new Error('unused'))

    const result = await removeUserPostsFromRingHub('spammer', 'r')

    expect(result.failed).toEqual([
      { postId: 'p1', ringSlug: 'art', outcome: 'failed', error: 'the ring owner has no key here' },
      { postId: 'p2', ringSlug: 'zines', outcome: 'failed', error: 'the ring owner has no key here' },
    ])
  })

  it('records a hub that is down as a failure for that ring', async () => {
    mockDb.post.findMany.mockResolvedValue([post('p1', { art: null })])
    reader.getRingFeed.mockRejectedValue(hubError(503, 'unavailable'))

    const result = await removeUserPostsFromRingHub('spammer', 'r')

    expect(result.failed).toHaveLength(1)
    expect(result.failed[0].error).toContain('503 unavailable')
  })

  it('does nothing when Ring Hub is off', async () => {
    ;(shouldUseRingHub as jest.Mock).mockReturnValue(false)
    const result = await removeUserPostsFromRingHub('spammer', 'r')
    expect(result).toEqual({ hubEnabled: false, hadKey: false, removals: [], failed: [] })
    expect(mockDb.post.findMany).not.toHaveBeenCalled()
  })

  it('keeps the hub reason within its 500-character limit', async () => {
    mockDb.post.findMany.mockResolvedValue([post('p1', { art: 'ref-art' })])
    await removeUserPostsFromRingHub('spammer', 'x'.repeat(800))
    expect(author.curatePost.mock.calls[0][2]!.reason).toHaveLength(500)
  })
})

describe('deleteUserAccount', () => {
  const banned = {
    id: 'spammer',
    role: 'member',
    primaryHandle: 'spammer@local',
    moderationStatus: 'banned',
    suspendedUntil: null,
    handles: [{ handle: 'spammer' }],
    blueskyHandleLink: null,
  }

  it('refuses an account that is not banned: deleting is the second step', async () => {
    mockDb.user.findUnique.mockResolvedValue({ ...banned, moderationStatus: 'active' })
    await expect(deleteUserAccount({ actorId: 'admin', userId: 'spammer' })).rejects.toMatchObject({ status: 409 })
    mockDb.user.findUnique.mockResolvedValue({ ...banned, moderationStatus: 'suspended', suspendedUntil: new Date(Date.now() + 1e6) })
    await expect(deleteUserAccount({ actorId: 'admin', userId: 'spammer' })).rejects.toMatchObject({ status: 409 })
    expect(mockDb.$transaction).not.toHaveBeenCalled()
  })

  it('refuses admins, yourself and missing accounts', async () => {
    await expect(deleteUserAccount({ actorId: 'me', userId: 'me' })).rejects.toMatchObject({ status: 400 })
    mockDb.user.findUnique.mockResolvedValue({ ...banned, role: 'admin' })
    await expect(deleteUserAccount({ actorId: 'admin', userId: 'spammer' })).rejects.toMatchObject({ status: 400 })
    mockDb.user.findUnique.mockResolvedValue(null)
    await expect(deleteUserAccount({ actorId: 'admin', userId: 'spammer' })).rejects.toMatchObject({ status: 404 })
  })

  it('takes the ring posts off the hub before the account (and its key) is deleted', async () => {
    mockDb.user.findUnique.mockResolvedValue(banned)
    mockDb.post.findMany.mockResolvedValue([post('p1', { art: 'ref-art' })])

    const result = await deleteUserAccount({ actorId: 'admin', userId: 'spammer', reason: 'spam' })

    expect(result.deleted).toBe(true)
    expect(events).toEqual(['author:remove:ref-art', 'transaction'])
    expect(mockDb.moderationAction.create).toHaveBeenCalledWith({
      data: { action: 'delete', userId: 'spammer', userHandle: 'spammer@local', actorId: 'admin', reason: 'spam' },
    })
    expect(mockDb.user.delete).toHaveBeenCalledWith({ where: { id: 'spammer' } })
    // The notes they signed in other people's guestbooks go too, and their email login tokens
    expect(mockDb.guestbookEntry.deleteMany).toHaveBeenCalledWith({ where: { authorId: 'spammer' } })
    expect(mockDb.emailLoginToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'spammer' } })
    // Removed for abuse: the name is held for good
    expect(mockDb.handleTombstone.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ handle: 'spammer', subdomainLabel: 'spammer', removedForAbuse: true, expiresAt: null })],
    })
    // the delete is the last write in the transaction
    const ops = mockDb.$transaction.mock.calls[0][0]
    expect(ops[ops.length - 1]).toBe('delete-op')
  })

  it('deletes their own files from storage after the commit, and never anyone else\'s', async () => {
    mockDb.user.findUnique.mockResolvedValue(banned)
    mockDb.post.findMany.mockResolvedValue([])
    mockDb.media.findMany.mockResolvedValue([
      {
        thumbnailUrl: 'https://cdn.test/media/spammer/1_thumb.webp',
        mediumUrl: 'https://cdn.test/media/spammer/1_medium.webp',
        fullUrl: 'https://cdn.test/media/spammer/1_full.mid',
        soundBankUrl: 'https://cdn.test/media/spammer/1_full.sf2',
      },
    ])
    mockDb.profile.findUnique.mockResolvedValue({
      avatarUrl: 'https://cdn.test/profile-photos/spammer/2_medium.webp?v=3',
      avatarFullUrl: null,
      avatarMediumUrl: 'https://cdn.test/profile-photos/spammer/2_medium.webp',
      avatarThumbnailUrl: 'https://cdn.test/media/someone-else/9_thumb.webp',
      bannerUrl: 'https://elsewhere.example/banner.png',
    })
    mockDb.userHomeConfig.findUnique.mockResolvedValue({
      customAssets: [{ slot: 0, url: 'https://cdn.test/pixel-homes/custom/spammer-1-a.png' }],
      snapshotUrl: 'https://cdn.test/pixel-homes/snapshots/spammer.h.png',
      snapshotCardUrl: 'https://cdn.test/pixel-homes/snapshots/spammer-impostor.h.card.png',
    })

    expect((await deleteUserAccount({ actorId: 'admin', userId: 'spammer' })).deleted).toBe(true)
    expect(deleteObjects).toHaveBeenCalledWith(
      [
        'media/spammer/1_thumb.webp',
        'media/spammer/1_medium.webp',
        'media/spammer/1_full.mid',
        'media/spammer/1_full.sf2',
        'profile-photos/spammer/2_medium.webp',
        'pixel-homes/custom/spammer-1-a.png',
        'pixel-homes/snapshots/spammer.h.png',
      ],
      { context: 'account:spammer' }
    )
  })

  it("deletes nothing when a ring post couldn't come off the hub, unless forced", async () => {
    mockDb.user.findUnique.mockResolvedValue(banned)
    mockDb.post.findMany.mockResolvedValue([post('p1', { art: 'ref-art' })])
    author = curator('author', () => hubError(500, 'hub broke'))
    owners['owner-of-art'] = curator('owner', () => hubError(500, 'hub broke'))

    const first = await deleteUserAccount({ actorId: 'admin', userId: 'spammer' })
    expect(first.deleted).toBe(false)
    expect(first.blockedBy).toBe('hub_failures')
    expect(first.report.posts.failed[0].error).toBe('as author: 500 hub broke; as ring owner: 500 hub broke')
    expect(first.report.failures).toEqual(['post p1 in art: as author: 500 hub broke; as ring owner: 500 hub broke'])
    expect(mockDb.$transaction).not.toHaveBeenCalled()

    const forced = await deleteUserAccount({ actorId: 'admin', userId: 'spammer', force: true })
    expect(forced.deleted).toBe(true)
    expect(mockDb.user.delete).toHaveBeenCalled()
  })

  it('leaves their rings after the posts, then deletes, then re-tiers their Indie Index sites', async () => {
    mockDb.user.findUnique.mockResolvedValue(banned)
    mockDb.post.findMany.mockResolvedValue([post('p1', { art: 'ref-art' })])
    author = curator('author', () => ({ affectedRings: [] }), { memberships: [ring('art'), ring('zines', null as any, 'PENDING')] })

    const result = await deleteUserAccount({ actorId: 'admin', userId: 'spammer' })

    expect(result.deleted).toBe(true)
    expect(events).toEqual(['author:remove:ref-art', 'author:leave:art', 'author:leave:zines', 'transaction'])
    expect(result.report.leaves).toEqual([
      { ringSlug: 'art', outcome: 'left', signer: 'member' },
      { ringSlug: 'zines', outcome: 'left', signer: 'member' },
    ])
    expect(recomputeSites).toHaveBeenCalledWith(mockDb, ['site-1'])
  })

  it('refuses, and touches nothing on the hub, while they own rings', async () => {
    mockDb.user.findUnique.mockResolvedValue(banned)
    mockDb.post.findMany.mockResolvedValue([post('p1', { art: 'ref-art' })])
    author = curator('author', () => ({}), { memberships: [ring('mine', 'owner'), ring('art')] })

    const result = await deleteUserAccount({ actorId: 'admin', userId: 'spammer' })

    expect(result).toMatchObject({ deleted: false, blockedBy: 'owns_rings' })
    expect(result.report.ownedRings.map((r) => r.ringSlug)).toEqual(['mine'])
    expect(events).toEqual([])
    expect(mockDb.$transaction).not.toHaveBeenCalled()
  })

  it('forced past owned rings: leaves the ones the hub allows, keeps going on the rest', async () => {
    mockDb.user.findUnique.mockResolvedValue(banned)
    mockDb.post.findMany.mockResolvedValue([])
    author = curator('author', () => ({}), {
      memberships: [ring('alone', 'owner'), ring('busy', 'owner'), ring('art')],
      leave: (slug) => (slug === 'busy' ? hubError(400, 'Transfer ownership required') : undefined),
    })

    const result = await deleteUserAccount({ actorId: 'admin', userId: 'spammer', force: true })

    expect(result.deleted).toBe(true)
    expect(result.report.leaves).toEqual([
      { ringSlug: 'alone', outcome: 'left', signer: 'member' },
      { ringSlug: 'busy', outcome: 'still_owner', error: '400 Transfer ownership required' },
      { ringSlug: 'art', outcome: 'left', signer: 'member' },
    ])
    expect(result.report.failures).toEqual([])
  })

  it("deletes nothing when a ring couldn't be left, unless forced", async () => {
    mockDb.user.findUnique.mockResolvedValue(banned)
    mockDb.post.findMany.mockResolvedValue([])
    author = curator('author', () => ({}), { memberships: [ring('art')], leave: () => hubError(503, 'down') })
    owners['owner-of-art'] = curator('owner', () => ({}), { leave: () => hubError(503, 'down') })

    const first = await deleteUserAccount({ actorId: 'admin', userId: 'spammer' })
    expect(first).toMatchObject({ deleted: false, blockedBy: 'hub_failures' })
    expect(first.report.failures).toEqual(['leaving art: as member: 503 down; as ring owner: 503 down'])
    expect(mockDb.$transaction).not.toHaveBeenCalled()

    expect((await deleteUserAccount({ actorId: 'admin', userId: 'spammer', force: true })).deleted).toBe(true)
  })

  it("deletes nothing when the hub won't list their rings, unless forced", async () => {
    mockDb.user.findUnique.mockResolvedValue(banned)
    mockDb.post.findMany.mockResolvedValue([])
    author.getMyMemberships.mockRejectedValue(hubError(401, 'Invalid signature'))

    const first = await deleteUserAccount({ actorId: 'admin', userId: 'spammer' })
    expect(first.report.failures).toEqual(["couldn't list their rings: 401 Invalid signature"])
    expect(first.deleted).toBe(false)
  })
})

describe('listUserRingMemberships', () => {
  it('reads ACTIVE and PENDING memberships as the account, 100 a page', async () => {
    const many = Array.from({ length: 130 }, (_, i) => ring(`r${i}`))
    author = curator('author', () => ({}), { memberships: [...many, ring('waiting', null as any, 'PENDING')] })

    const result = await listUserRingMemberships('spammer')

    expect(result.memberships).toHaveLength(131)
    expect(author.getMyMemberships.mock.calls.map(([o]: any) => [o.status, o.offset])).toEqual([
      ['ACTIVE', 0],
      ['ACTIVE', 100],
      ['PENDING', 0],
    ])
    expect(result.error).toBeUndefined()
  })

  it('without a key here: nothing to list, and no key gets minted', async () => {
    mockDb.userDID.findUnique.mockResolvedValue(null)
    const result = await listUserRingMemberships('spammer')
    expect(result).toEqual({ hubEnabled: true, hadKey: false, memberships: [] })
    expect(createAuthenticatedRingHubClient).not.toHaveBeenCalled()
  })

  it('does nothing when Ring Hub is off', async () => {
    ;(shouldUseRingHub as jest.Mock).mockReturnValue(false)
    expect(await listUserRingMemberships('spammer')).toEqual({ hubEnabled: false, hadKey: false, memberships: [] })
    expect(mockDb.userDID.findUnique).not.toHaveBeenCalled()
  })
})

describe('leaveUserRingsOnHub', () => {
  it("a ring the hub says they aren't in is not_member", async () => {
    author = curator('author', () => ({}), { leave: () => hubError(404, 'Not a member') })
    expect(await leaveUserRingsOnHub('spammer', [ring('art')])).toEqual([{ ringSlug: 'art', outcome: 'not_member' }])
  })

  it('falls back to the ring owner removing them by DID when leaving fails', async () => {
    author = curator('author', () => ({}), { leave: () => hubError(401, 'bad signature') })

    const leaves = await leaveUserRingsOnHub('spammer', [ring('art')])

    expect(events).toEqual(['author:leave:art', 'owner-owner-of-art:remove-member:art:did:spammer'])
    expect(leaves).toEqual([{ ringSlug: 'art', outcome: 'left', signer: 'owner' }])
  })

  it("reports a ring whose owner has no key here, and never asks an owned ring's owner to remove themselves", async () => {
    author = curator('author', () => ({}), { leave: () => hubError(500, 'broke') })
    reader.getRing.mockResolvedValue({ slug: 'art', ownerDid: 'did:elsewhere' })
    mockDb.userDID.findUnique.mockImplementation(async ({ where }: any) =>
      where.userId === 'spammer' ? { userId: 'spammer', did: 'did:spammer' } : null
    )

    const leaves = await leaveUserRingsOnHub('spammer', [ring('art'), ring('mine', 'owner')])

    expect(leaves).toEqual([
      { ringSlug: 'art', outcome: 'failed', error: 'as member: 500 broke; the ring owner has no key here' },
      { ringSlug: 'mine', outcome: 'failed', error: 'as member: 500 broke' },
    ])
    expect(events).toEqual(['author:leave:art', 'author:leave:mine'])
  })

  it('without a key here, leaves nothing (it never joined as itself)', async () => {
    mockDb.userDID.findUnique.mockResolvedValue(null)
    expect(await leaveUserRingsOnHub('spammer', [ring('art')])).toEqual([])
    expect(createAuthenticatedRingHubClient).not.toHaveBeenCalled()
  })
})
