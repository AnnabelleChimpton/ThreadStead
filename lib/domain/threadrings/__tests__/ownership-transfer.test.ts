/**
 * @jest-environment node
 *
 * Handing a ring over (lib/domain/threadrings/ownership-transfer.ts) with
 * mocked hub clients: who signs, what's refused before the hub is asked,
 * how the hub's refusals read, and the local owner mirrors. The real hub
 * route is covered by tests/federation/federation.itest.ts.
 */
jest.mock('@/lib/config/database/connection', () => ({
  db: {
    user: { findUnique: jest.fn(), findMany: jest.fn() },
    userDID: { findUnique: jest.fn(), findMany: jest.fn() },
    ringHubOwnership: { findUnique: jest.fn(), upsert: jest.fn() },
    threadRing: { updateMany: jest.fn() },
    threadRingMember: { updateMany: jest.fn() },
    $transaction: jest.fn(),
  },
}))
jest.mock('@/lib/api/ringhub/ringhub-client', () => ({
  ...jest.requireActual('@/lib/api/ringhub/ringhub-client'),
  shouldUseRingHub: jest.fn(() => true),
  getPublicRingHubClient: jest.fn(),
  getRingHubClient: jest.fn(),
}))
jest.mock('@/lib/api/ringhub/ringhub-user-operations', () => ({
  createAuthenticatedRingHubClient: jest.fn(),
}))

import { db } from '@/lib/config/database/connection'
import { ApiError } from '@/lib/api/errors'
import {
  getPublicRingHubClient,
  getRingHubClient,
  RingHubClientError,
  shouldUseRingHub,
} from '@/lib/api/ringhub/ringhub-client'
import { createAuthenticatedRingHubClient } from '@/lib/api/ringhub/ringhub-user-operations'
import { listOwnershipCandidates, transferRingOwnership } from '@/lib/domain/threadrings/ownership-transfer'

const mockDb = db as any
const SITE_DID = 'did:web:threadstead.test'
const did = (name: string) => `did:web:threadstead.test:users:${name}`

const USERS: Record<string, { moderationStatus: string; suspendedUntil: Date | null }> = {
  alice: { moderationStatus: 'active', suspendedUntil: null },
  bob: { moderationStatus: 'active', suspendedUntil: null },
  spam: { moderationStatus: 'banned', suspendedUntil: null },
  nokey: { moderationStatus: 'active', suspendedUntil: null },
}

let ownerDid: string
let reader: any
let ownerClient: any
let siteClient: any

function hubError(status: number, error: string, message = 'from the hub') {
  return new RingHubClientError(error, status, undefined, { error, message })
}

const transferred = (newOwnerDid: string) => ({
  message: 'Ownership transferred',
  ring: { slug: 'garden', ownerDid: newOwnerDid },
  previousOwnerDid: ownerDid,
  newOwnerDid,
  byAdmin: false,
  transferredAt: '2026-10-19T12:00:00.000Z',
})

beforeEach(() => {
  jest.clearAllMocks()
  process.env.THREADSTEAD_DID = SITE_DID
  ownerDid = did('alice')
  reader = {
    getRing: jest.fn(async (slug: string) => (slug === 'garden' ? { slug, ownerDid, uri: 'https://hub.test/rings/garden' } : null)),
    getRingMembers: jest.fn(async () => ({
      members: [
        { actorDid: did('alice'), role: 'owner' },
        { actorDid: did('bob'), role: 'moderator' },
        { actorDid: did('spam'), role: 'member' },
        { actorDid: 'did:web:elsewhere.test:users:wren', role: 'member' },
      ],
      total: 4,
      limit: 100,
      offset: 0,
      hasMore: false,
    })),
  }
  // Signed as the asker: what they read is what the hub shows them
  ownerClient = {
    transferOwnership: jest.fn(async (_slug: string, to: string) => transferred(to)),
    getRingAsMember: jest.fn((slug: string) => reader.getRing(slug)),
    getRingMembers: jest.fn((slug: string, options: unknown) => reader.getRingMembers(slug, options)),
  }
  siteClient = { transferOwnership: jest.fn(async (_slug: string, to: string) => ({ ...transferred(to), byAdmin: true })) }
  ;(shouldUseRingHub as jest.Mock).mockReturnValue(true)
  ;(getPublicRingHubClient as jest.Mock).mockReturnValue(reader)
  ;(getRingHubClient as jest.Mock).mockReturnValue(siteClient)
  ;(createAuthenticatedRingHubClient as jest.Mock).mockReturnValue(ownerClient)

  mockDb.user.findUnique.mockImplementation(async ({ where }: any) =>
    USERS[where.id] ? { id: where.id, primaryHandle: `${where.id}@threadstead.test`, ...USERS[where.id] } : null
  )
  mockDb.userDID.findUnique.mockImplementation(async ({ where }: any) =>
    where.userId && where.userId !== 'nokey' && USERS[where.userId] ? { did: did(where.userId) } : null
  )
  mockDb.ringHubOwnership.findUnique.mockResolvedValue(null)
  mockDb.$transaction.mockImplementation(async (ops: Promise<unknown>[]) => Promise.all(ops))
  mockDb.ringHubOwnership.upsert.mockResolvedValue({})
  mockDb.threadRing.updateMany.mockResolvedValue({ count: 1 })
  mockDb.threadRingMember.updateMany.mockResolvedValue({ count: 1 })
})

const refusal = (promise: Promise<unknown>) => promise.then(() => null, (error) => error as ApiError)

describe('transferRingOwnership', () => {
  test('the owner signs with their own key, and the local owner records follow', async () => {
    const result = await transferRingOwnership({ slug: 'garden', actor: { id: 'alice', role: 'member' }, newOwnerUserId: 'bob', reason: ' moving on ' })

    expect(createAuthenticatedRingHubClient).toHaveBeenCalledWith('alice')
    expect(ownerClient.transferOwnership).toHaveBeenCalledWith('garden', did('bob'), 'moving on')
    expect(result).toEqual({
      slug: 'garden',
      previousOwnerDid: did('alice'),
      newOwnerDid: did('bob'),
      newOwner: { id: 'bob', handle: 'bob@threadstead.test' },
      signer: 'owner',
      localSynced: true,
    })
    expect(mockDb.ringHubOwnership.upsert).toHaveBeenCalledWith({
      where: { ringSlug: 'garden' },
      update: { ownerUserId: 'bob', serverDID: did('bob') },
      create: { ringSlug: 'garden', ringUri: 'https://hub.test/rings/garden', ownerUserId: 'bob', serverDID: did('bob') },
    })
    expect(mockDb.threadRing.updateMany).toHaveBeenCalledWith({ where: { slug: 'garden' }, data: { curatorId: 'bob' } })
    expect(mockDb.threadRingMember.updateMany).toHaveBeenCalledWith({
      where: { threadRing: { slug: 'garden' }, role: 'curator', userId: { not: 'bob' } },
      data: { role: 'member' },
    })
    expect(mockDb.threadRingMember.updateMany).toHaveBeenCalledWith({
      where: { threadRing: { slug: 'garden' }, userId: 'bob' },
      data: { role: 'curator' },
    })
  })

  test("a ring this site owns on the hub is signed by the site for its local owner", async () => {
    ownerDid = SITE_DID
    mockDb.ringHubOwnership.findUnique.mockResolvedValue({ ownerUserId: 'alice' })

    const result = await transferRingOwnership({ slug: 'garden', actor: { id: 'alice', role: 'member' }, newOwnerUserId: 'bob' })

    expect(result.signer).toBe('site')
    expect(siteClient.transferOwnership).toHaveBeenCalledWith('garden', did('bob'), undefined)
    expect(ownerClient.transferOwnership).not.toHaveBeenCalled()
  })

  test('an admin who does not own it signs as this site, the hub admin', async () => {
    ownerDid = did('spam')
    const result = await transferRingOwnership({ slug: 'garden', actor: { id: 'alice', role: 'admin' }, newOwnerUserId: 'bob', reason: 'Owner banned' })
    expect(result.signer).toBe('admin')
    expect(siteClient.transferOwnership).toHaveBeenCalledWith('garden', did('bob'), 'Owner banned')
  })

  test('anyone else is refused before the hub is asked', async () => {
    const error = await refusal(transferRingOwnership({ slug: 'garden', actor: { id: 'bob', role: 'member' }, newOwnerUserId: 'bob' }))
    expect(error).toBeInstanceOf(ApiError)
    expect(error?.status).toBe(403)
    expect(ownerClient.transferOwnership).not.toHaveBeenCalled()
    expect(siteClient.transferOwnership).not.toHaveBeenCalled()
  })

  test.each([
    ['a banned account', 'spam', 400, /suspended, banned or leaving/],
    ['someone with no key here', 'nokey', 400, /member of the ring first/],
    ['the current owner', 'alice', 400, /already own it/],
    ['an unknown account', 'ghost', 404, /User not found/],
  ])('refuses handing it to %s', async (_label, newOwnerUserId, status, message) => {
    const error = await refusal(transferRingOwnership({ slug: 'garden', actor: { id: 'alice', role: 'admin' }, newOwnerUserId }))
    expect(error?.status).toBe(status)
    expect(error?.message).toMatch(message)
    expect(ownerClient.transferOwnership).not.toHaveBeenCalled()
  })

  test('an unknown ring is a 404 and Ring Hub being off is a 400', async () => {
    expect((await refusal(transferRingOwnership({ slug: 'nope', actor: { id: 'alice', role: 'admin' }, newOwnerUserId: 'bob' })))?.status).toBe(404)
    ;(shouldUseRingHub as jest.Mock).mockReturnValue(false)
    expect((await refusal(transferRingOwnership({ slug: 'garden', actor: { id: 'alice', role: 'admin' }, newOwnerUserId: 'bob' })))?.status).toBe(400)
  })

  test.each([
    [hubError(400, 'Not a member'), 'owner', 400, 'They need to be a member of the ring first.'],
    [hubError(400, 'Blocked'), 'owner', 400, "They're blocked from this ring."],
    [hubError(403, 'Forbidden'), 'admin', 403, "Ring Hub doesn't treat this site as an admin, so only the owner can hand it over."],
    [hubError(403, 'Forbidden'), 'owner', 403, "Ring Hub says you don't own this ring."],
    [hubError(409, 'Conflict'), 'owner', 409, 'The ring changed while handing it over. Try again.'],
    [hubError(500, 'Internal error'), 'owner', 502, "Ring Hub couldn't hand the ring over. Try again in a minute."],
    [new Error('socket hang up'), 'owner', 502, "Ring Hub couldn't hand the ring over. Try again in a minute."],
  ])('reads the hub refusal %#', async (hubFailure, signer, status, message) => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    if (signer === 'admin') ownerDid = did('spam')
    const client = signer === 'admin' ? siteClient : ownerClient
    client.transferOwnership.mockRejectedValueOnce(hubFailure)

    const error = await refusal(transferRingOwnership({ slug: 'garden', actor: { id: 'alice', role: 'admin' }, newOwnerUserId: 'bob' }))

    expect(error).toBeInstanceOf(ApiError)
    expect([error?.status, error?.message]).toEqual([status, message])
    expect(mockDb.ringHubOwnership.upsert).not.toHaveBeenCalled()
  })

  test("when the hub moved it but the local records didn't update, it still reports the transfer", async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    mockDb.$transaction.mockRejectedValueOnce(new Error('db down'))
    const result = await transferRingOwnership({ slug: 'garden', actor: { id: 'alice', role: 'member' }, newOwnerUserId: 'bob' })
    expect(result).toMatchObject({ newOwnerDid: did('bob'), localSynced: false })
  })
})

describe('reading the ring', () => {
  test("a private ring is read signed as its Host, who can then hand it over", async () => {
    // Unsigned, the hub shows nobody a private ring
    reader.getRing.mockResolvedValue(null)
    ownerClient.getRingAsMember.mockResolvedValue({ slug: 'garden', ownerDid, uri: 'https://hub.test/rings/garden' })
    const result = await transferRingOwnership({ slug: 'garden', actor: { id: 'alice', role: 'member' }, newOwnerUserId: 'bob' })
    expect(ownerClient.getRingAsMember).toHaveBeenCalledWith('garden')
    expect(result.newOwnerDid).toBe(did('bob'))
  })
})

describe('listOwnershipCandidates', () => {
  beforeEach(() => {
    mockDb.userDID.findMany.mockImplementation(async ({ where }: any) =>
      ['alice', 'bob', 'spam'].filter((n) => where.did.in.includes(did(n))).map((n) => ({ did: did(n), userId: n }))
    )
    // activeUserWhere() drops the banned account
    mockDb.user.findMany.mockResolvedValue([{ id: 'bob', primaryHandle: 'bob@threadstead.test', profile: { displayName: 'Bob' } }])
  })

  test('residents here, active, not the owner; members from elsewhere are left out', async () => {
    const candidates = await listOwnershipCandidates('garden', { id: 'alice', role: 'member' })
    expect(candidates).toEqual([{ userId: 'bob', handle: 'bob@threadstead.test', displayName: 'Bob', role: 'moderator' }])
    const lookedUp = mockDb.userDID.findMany.mock.calls[0][0].where.did.in
    expect(lookedUp).not.toContain(did('alice'))
  })

  test('only for the owner or an admin', async () => {
    expect((await refusal(listOwnershipCandidates('garden', { id: 'bob', role: 'member' })))?.status).toBe(403)
    await expect(listOwnershipCandidates('garden', { id: 'bob', role: 'admin' })).resolves.toHaveLength(1)
  })

  test('a Host the local mirror never heard of may still hand it over', async () => {
    mockDb.ringHubOwnership.findUnique.mockResolvedValue({ ownerUserId: 'someone-else' })
    await expect(listOwnershipCandidates('garden', { id: 'alice', role: 'member' })).resolves.toHaveLength(1)
  })
})
