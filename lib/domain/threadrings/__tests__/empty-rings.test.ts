/**
 * Rings earlier account deletes left on the hub with nobody in them
 * (lib/domain/threadrings/empty-rings.ts): reading the hub-database listing,
 * which ones go, and deleting one as the hub admin. The real-hub version is
 * in the federation suite.
 */
jest.mock('@/lib/config/database/connection', () => ({ db: { ringHubOwnership: { findUnique: jest.fn() } } }))
jest.mock('@/lib/domain/users/account-removal', () => ({ forgetRing: jest.fn() }))

import { db } from '@/lib/config/database/connection'
import { forgetRing } from '@/lib/domain/users/account-removal'
import { deleteEmptyRing, parseListing, reasonToKeep, type ListedRing } from '@/lib/domain/threadrings/empty-rings'

const SITE = 'did:web:homepageagain.com'
const GONE = `${SITE}:users:gone`
const HERE = `${SITE}:users:here`
const mockDb = db as any
const accountOf = async (did: string) => (did === HERE ? 'u-here' : null)

const listed = (slug: string, extra: Partial<ListedRing> = {}): ListedRing => ({
  slug,
  visibility: 'PUBLIC',
  ownerDid: GONE,
  activeMemberDids: [],
  ...extra,
})

function hubError(status: number, message = 'nope') {
  return Object.assign(new Error(message), { status })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockDb.ringHubOwnership.findUnique.mockImplementation(async ({ where }: any) =>
    where.ringSlug === 'still-run-here' ? { ownerUserId: 'u-here' } : null
  )
})

describe('parseListing', () => {
  it('reads psql -At lines: slug|visibility|ownerDid|members', () => {
    expect(parseListing(`knits|PUBLIC|${GONE}|\nsolo|PRIVATE|${GONE}|${GONE}\n\n`)).toEqual([
      { slug: 'knits', visibility: 'PUBLIC', ownerDid: GONE, activeMemberDids: [] },
      { slug: 'solo', visibility: 'PRIVATE', ownerDid: GONE, activeMemberDids: [GONE] },
    ])
  })

  it('refuses a line that is not a listing', () => {
    expect(() => parseListing('just some text')).toThrow(/Not a listing line/)
  })
})

describe('reasonToKeep', () => {
  it('lets go of a ring whose owner is gone from here, empty or with only that owner in it', async () => {
    expect(await reasonToKeep(listed('empty'), SITE, accountOf)).toBeNull()
    expect(await reasonToKeep(listed('owner-only', { activeMemberDids: [GONE] }), SITE, accountOf)).toBeNull()
  })

  it('keeps the root, this site’s own rings, other sites’ rings, residents’ rings, and rings with members', async () => {
    expect(await reasonToKeep(listed('spool'), SITE, accountOf)).toBe('the root ring')
    expect(await reasonToKeep(listed('ours', { ownerDid: SITE }), SITE, accountOf)).toBe("this site's own ring")
    expect(await reasonToKeep(listed('theirs', { ownerDid: 'did:web:elsewhere.example:users:x' }), SITE, accountOf)).toBe(
      'its owner is from another site'
    )
    expect(await reasonToKeep(listed('lookalike', { ownerDid: `${SITE}.evil:users:x` }), SITE, accountOf)).toBe('its owner is from another site')
    expect(await reasonToKeep(listed('resident', { ownerDid: HERE }), SITE, accountOf)).toBe('its owner still has an account here')
    expect(await reasonToKeep(listed('still-run-here'), SITE, accountOf)).toBe('someone here still owns it')
    expect(await reasonToKeep(listed('busy', { activeMemberDids: [GONE, HERE] }), SITE, accountOf)).toBe('it has members: hand it to one of them')
  })
})

describe('deleteEmptyRing', () => {
  const admin = { deleteRing: jest.fn() }
  const reader = { getRing: jest.fn() }

  it('reads a public ring again, deletes it as the admin, then forgets it here', async () => {
    reader.getRing.mockResolvedValue({ ownerDid: GONE, memberCount: 0 })
    expect(await deleteEmptyRing(listed('empty'), admin, reader)).toBe('deleted')
    expect(admin.deleteRing).toHaveBeenCalledWith('empty')
    expect(forgetRing).toHaveBeenCalledWith('empty')
  })

  it('leaves a ring alone that someone joined, or that changed hands, since the listing', async () => {
    for (const now of [{ ownerDid: GONE, memberCount: 1 }, { ownerDid: HERE, memberCount: 0 }]) {
      reader.getRing.mockResolvedValueOnce(now)
      expect(await deleteEmptyRing(listed('empty'), admin, reader)).toBe('changed')
    }
    expect(admin.deleteRing).not.toHaveBeenCalled()
    expect(forgetRing).not.toHaveBeenCalled()
  })

  it('a private ring it cannot read goes on the listing alone', async () => {
    expect(await deleteEmptyRing(listed('solo', { visibility: 'PRIVATE' }), admin, reader)).toBe('deleted')
    expect(reader.getRing).not.toHaveBeenCalled()
    expect(admin.deleteRing).toHaveBeenCalledWith('solo')
  })

  it('a ring already gone from the hub is only forgotten here', async () => {
    reader.getRing.mockResolvedValue(null)
    expect(await deleteEmptyRing(listed('empty'), admin, reader)).toBe('gone')
    admin.deleteRing.mockRejectedValueOnce(hubError(404, 'Ring not found'))
    expect(await deleteEmptyRing(listed('solo', { visibility: 'PRIVATE' }), admin, reader)).toBe('gone')
    expect(forgetRing).toHaveBeenCalledTimes(2)
  })

  it('a delete the hub refuses throws, and nothing is forgotten', async () => {
    admin.deleteRing.mockRejectedValueOnce(hubError(403, 'Ring membership required'))
    await expect(deleteEmptyRing(listed('solo', { visibility: 'PRIVATE' }), admin, reader)).rejects.toMatchObject({ status: 403 })
    expect(forgetRing).not.toHaveBeenCalled()
  })
})
