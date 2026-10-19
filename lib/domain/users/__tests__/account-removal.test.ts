/**
 * @jest-environment node
 *
 * Deleting an account takes its ring posts off Ring Hub first (S-2), with
 * mocked hub clients. The hub's POST /trp/curate looks PostRefs up by id and
 * lets the author (actorDid / submittedBy) or a ring moderator remove them;
 * an author removal covers every ring with the same uri + actorDid. Without
 * the author's key, the ring owner removes it instead.
 */
jest.mock('@/lib/config/database/connection', () => ({
  db: {
    post: { findMany: jest.fn() },
    user: { findUnique: jest.fn(), delete: jest.fn() },
    userDID: { findUnique: jest.fn() },
    moderationAction: { create: jest.fn() },
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

import { db } from '@/lib/config/database/connection'
import { getPublicRingHubClient, getRingHubClient, shouldUseRingHub } from '@/lib/api/ringhub/ringhub-client'
import { createAuthenticatedRingHubClient } from '@/lib/api/ringhub/ringhub-user-operations'
import { buildPostUri } from '@/lib/domain/posts/ringhub-metadata'
import { deleteUserAccount, removeUserPostsFromRingHub } from '@/lib/domain/users/account-removal'

const mockDb = db as any
const events: string[] = []

function hubError(status: number, message = 'nope') {
  return Object.assign(new Error(message), { status })
}

/** A curate client that records who signed, and answers per PostRef id. */
function curator(name: string, answer: (refId: string) => any = () => ({})) {
  return {
    curatePost: jest.fn(async (refId: string, action: string, options?: { reason?: string }) => {
      events.push(`${name}:${action}:${refId}`)
      const result = answer(refId)
      if (result instanceof Error) throw result
      return result
    }),
  }
}

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
    if (where.userId === 'spammer') return { userId: 'spammer' }
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
  const banned = { id: 'spammer', role: 'member', primaryHandle: 'spammer@local', moderationStatus: 'banned', suspendedUntil: null }

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
    // the delete is the last write in the transaction
    const ops = mockDb.$transaction.mock.calls[0][0]
    expect(ops[ops.length - 1]).toBe('delete-op')
  })

  it("deletes nothing when a ring post couldn't come off the hub, unless forced", async () => {
    mockDb.user.findUnique.mockResolvedValue(banned)
    mockDb.post.findMany.mockResolvedValue([post('p1', { art: 'ref-art' })])
    author = curator('author', () => hubError(500, 'hub broke'))
    owners['owner-of-art'] = curator('owner', () => hubError(500, 'hub broke'))

    const first = await deleteUserAccount({ actorId: 'admin', userId: 'spammer' })
    expect(first.deleted).toBe(false)
    expect(first.cleanup.failed[0].error).toBe('as author: 500 hub broke; as ring owner: 500 hub broke')
    expect(mockDb.$transaction).not.toHaveBeenCalled()

    const forced = await deleteUserAccount({ actorId: 'admin', userId: 'spammer', force: true })
    expect(forced.deleted).toBe(true)
    expect(mockDb.user.delete).toHaveBeenCalled()
  })
})
