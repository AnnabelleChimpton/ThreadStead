/**
 * Leaving (lib/domain/users/leaving.ts): confirming with your username, rings
 * that need a new owner first, the 14 days, staying after all, and the
 * hourly finish that deletes through eraseAccount.
 */
jest.mock('@/lib/config/database/connection', () => ({
  db: { user: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn(), findMany: jest.fn() } },
}))
jest.mock('@/lib/domain/bluesky/served-dids', () => ({ invalidateServedDids: jest.fn() }))
jest.mock('@/lib/domain/users/account-removal', () => ({
  eraseAccount: jest.fn(),
  listUserRingMemberships: jest.fn(),
  sharedOwnedRings: jest.fn(),
}))
jest.mock('@/lib/utils/security/email-encryption', () => ({ decryptEmail: (e: string) => `plain:${e}` }))
jest.mock('@/lib/email-login', () => ({ sendLeavingEmail: jest.fn() }))
jest.mock('@/lib/domain/users/moderation', () => ({ disconnectChat: jest.fn(), retierIndieSites: jest.fn() }))

import { db } from '@/lib/config/database/connection'
import { invalidateServedDids } from '@/lib/domain/bluesky/served-dids'
import { eraseAccount, listUserRingMemberships, sharedOwnedRings } from '@/lib/domain/users/account-removal'
import { sendLeavingEmail } from '@/lib/email-login'
import { disconnectChat, retierIndieSites } from '@/lib/domain/users/moderation'
import { finishDueLeaves, LEAVE_GRACE_DAYS, startLeaving, stayAfterAll } from '@/lib/domain/users/leaving'

const mockDb = db as any
const NOW = new Date('2026-10-23T12:00:00Z')
const resident = { role: 'member', primaryHandle: 'alice@HomePageAgain', deletesAt: null, encryptedEmail: null, emailVerifiedAt: null }
const membership = (ringSlug: string, role = 'member') => ({ ringSlug, ringName: ringSlug.toUpperCase(), role, status: 'ACTIVE' })

async function rejection(promise: Promise<unknown>) {
  return promise.then(() => null, (error) => error)
}

beforeEach(() => {
  jest.clearAllMocks()
  mockDb.user.findUnique.mockResolvedValue(resident)
  ;(listUserRingMemberships as jest.Mock).mockResolvedValue({ hadKey: true, memberships: [] })
  ;(sharedOwnedRings as jest.Mock).mockResolvedValue([])
})

describe('startLeaving', () => {
  it('hides the account now and deletes it in 14 days', async () => {
    const deletesAt = await startLeaving('u1', ' Alice ', NOW)
    expect(deletesAt.getTime() - NOW.getTime()).toBe(LEAVE_GRACE_DAYS * 24 * 60 * 60 * 1000)
    expect(mockDb.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { deletesAt } })
    // Hidden everywhere at once: Bluesky handle, chat, the Indie Index
    expect(invalidateServedDids).toHaveBeenCalled()
    expect(disconnectChat).toHaveBeenCalledWith('u1')
    expect(retierIndieSites).toHaveBeenCalledWith('u1', NOW)
    expect(sendLeavingEmail).not.toHaveBeenCalled()
  })

  it('emails a verified address, so a stolen session can\'t delete an account quietly', async () => {
    mockDb.user.findUnique.mockResolvedValue({ ...resident, encryptedEmail: 'enc', emailVerifiedAt: NOW })
    const deletesAt = await startLeaving('u1', 'alice', NOW)
    expect(sendLeavingEmail).toHaveBeenCalledWith('plain:enc', 'alice', deletesAt)
  })

  it('needs their own username', async () => {
    const error = await rejection(startLeaving('u1', 'bob', NOW))
    expect(error.status).toBe(400)
    expect(mockDb.user.update).not.toHaveBeenCalled()
  })

  it("won't delete an admin", async () => {
    mockDb.user.findUnique.mockResolvedValue({ ...resident, role: 'admin' })
    expect((await rejection(startLeaving('u1', 'alice', NOW))).status).toBe(400)
  })

  it('asks for rings with other members to be handed over first; a ring of one is fine', async () => {
    const memberships = [membership('knits', 'owner'), membership('solo', 'owner'), membership('zines')]
    ;(listUserRingMemberships as jest.Mock).mockResolvedValue({ hadKey: true, memberships })
    ;(sharedOwnedRings as jest.Mock).mockResolvedValue([membership('knits', 'owner')])

    const error = await rejection(startLeaving('u1', 'alice', NOW))
    expect(error.status).toBe(409)
    expect(error.extra).toEqual({ rings: [{ slug: 'knits', name: 'KNITS' }] })
    expect(sharedOwnedRings).toHaveBeenCalledWith('u1', memberships)
    expect(mockDb.user.update).not.toHaveBeenCalled()
  })

  it("won't start when the hub can't say which of their rings are shared", async () => {
    ;(sharedOwnedRings as jest.Mock).mockRejectedValue(new Error('hub down'))
    expect((await rejection(startLeaving('u1', 'alice', NOW))).status).toBe(503)
    expect(mockDb.user.update).not.toHaveBeenCalled()
  })

  it("won't start when the hub can't say which rings they own", async () => {
    ;(listUserRingMemberships as jest.Mock).mockResolvedValue({ hadKey: true, memberships: [], error: 'hub down' })
    expect((await rejection(startLeaving('u1', 'alice', NOW))).status).toBe(503)
  })

  it('leaves an account already leaving as it is', async () => {
    const later = new Date('2026-11-01T00:00:00Z')
    mockDb.user.findUnique.mockResolvedValue({ ...resident, deletesAt: later })
    expect(await startLeaving('u1', 'anything', NOW)).toBe(later)
    expect(mockDb.user.update).not.toHaveBeenCalled()
  })
})

describe('stayAfterAll', () => {
  it('clears it while the date is still ahead', async () => {
    mockDb.user.updateMany.mockResolvedValue({ count: 1 })
    await stayAfterAll('u1', NOW)
    expect(mockDb.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'u1', OR: [{ deletesAt: null }, { deletesAt: { gt: NOW } }] },
      data: { deletesAt: null },
    })
    expect(invalidateServedDids).toHaveBeenCalled()
    expect(retierIndieSites).toHaveBeenCalledWith('u1', NOW)
  })

  it('refuses once the date has come: deleting has begun', async () => {
    mockDb.user.updateMany.mockResolvedValue({ count: 0 })
    expect((await rejection(stayAfterAll('u1', NOW))).status).toBe(409)
    expect(invalidateServedDids).not.toHaveBeenCalled()
  })
})

describe('finishDueLeaves', () => {
  it('deletes each account whose time has come, as not-for-abuse and with no audit row', async () => {
    mockDb.user.findMany.mockResolvedValue([{ id: 'u1', primaryHandle: 'alice@HomePageAgain', moderationStatus: 'active', deletesAt: NOW }])
    ;(eraseAccount as jest.Mock).mockResolvedValue({ deleted: true })

    expect(await finishDueLeaves(NOW)).toEqual({ deleted: 1, waiting: 0 })
    // Every due account, with no cap: a stuck one can't hold up the rest
    expect(mockDb.user.findMany.mock.calls[0][0]).toMatchObject({ where: { deletesAt: { lte: NOW } } })
    expect(mockDb.user.findMany.mock.calls[0][0].take).toBeUndefined()
    expect(eraseAccount).toHaveBeenCalledWith('u1', 'alice@HomePageAgain', expect.anything(), {
      hubReason: 'The resident deleted their account',
      removedForAbuse: false,
      force: false,
    })
  })

  it('keeps one that can\'t go yet for next time, and still deletes the ones after it', async () => {
    mockDb.user.findMany.mockResolvedValue([
      { id: 'stuck', primaryHandle: 'stuck@HomePageAgain', moderationStatus: 'active', deletesAt: NOW },
      { id: 'u1', primaryHandle: 'alice@HomePageAgain', moderationStatus: 'active', deletesAt: NOW },
    ])
    ;(eraseAccount as jest.Mock)
      .mockResolvedValueOnce({ deleted: false, blockedBy: 'owns_rings', report: { failures: [] } })
      .mockResolvedValueOnce({ deleted: true })
    expect(await finishDueLeaves(NOW)).toEqual({ deleted: 1, waiting: 1 })
  })

  it('forces a delete still stuck a week past its date, and not a day before', async () => {
    const DAY = 24 * 60 * 60 * 1000
    mockDb.user.findMany.mockResolvedValue([
      { id: 'week', primaryHandle: 'week@HomePageAgain', moderationStatus: 'active', deletesAt: new Date(NOW.getTime() - 7 * DAY) },
      { id: 'six', primaryHandle: 'six@HomePageAgain', moderationStatus: 'active', deletesAt: new Date(NOW.getTime() - 6 * DAY) },
    ])
    ;(eraseAccount as jest.Mock).mockResolvedValue({ deleted: true })
    await finishDueLeaves(NOW)
    expect((eraseAccount as jest.Mock).mock.calls.map((c) => [c[0], c[3].force])).toEqual([['week', true], ['six', false]])
  })

  it('holds the name for good when they were banned while leaving', async () => {
    mockDb.user.findMany.mockResolvedValue([{ id: 'u1', primaryHandle: 'alice@HomePageAgain', moderationStatus: 'banned', deletesAt: NOW }])
    ;(eraseAccount as jest.Mock).mockResolvedValue({ deleted: true })
    await finishDueLeaves(NOW)
    expect((eraseAccount as jest.Mock).mock.calls[0][3]).toMatchObject({ removedForAbuse: true })
  })

  it('waits when the hub can\'t list their rings', async () => {
    mockDb.user.findMany.mockResolvedValue([{ id: 'u1', primaryHandle: 'alice@HomePageAgain', moderationStatus: 'active', deletesAt: NOW }])
    ;(listUserRingMemberships as jest.Mock).mockResolvedValue({ hadKey: true, memberships: [], error: 'hub down' })
    expect(await finishDueLeaves(NOW)).toEqual({ deleted: 0, waiting: 1 })
    expect(eraseAccount).not.toHaveBeenCalled()
  })
})
