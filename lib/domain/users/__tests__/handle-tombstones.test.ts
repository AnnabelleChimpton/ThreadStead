/**
 * How long a deleted account's username is held (owner decision 2026-10-22):
 * 12 months, forever if it ever linked Bluesky or was removed for abuse.
 */
import { tombstoneExpiry, tombstonesForUser, TOMBSTONE_MONTHS } from '@/lib/domain/users/handle-tombstones'

const NOW = new Date('2026-10-22T12:00:00Z')

test('12 months by default', () => {
  expect(TOMBSTONE_MONTHS).toBe(12)
  expect(tombstoneExpiry({ blueskyLinked: false, removedForAbuse: false }, NOW)).toEqual(new Date('2027-10-22T12:00:00Z'))
})

test('forever for a Bluesky link or an abuse removal', () => {
  expect(tombstoneExpiry({ blueskyLinked: true, removedForAbuse: false }, NOW)).toBeNull()
  expect(tombstoneExpiry({ blueskyLinked: false, removedForAbuse: true }, NOW)).toBeNull()
})

test('one row per name the account held, by address label; any Bluesky link row counts', async () => {
  const client = {
    user: {
      findUnique: jest.fn().mockResolvedValue({
        primaryHandle: 'a_b@HomePageAgain',
        handles: [{ handle: 'a_b' }, { handle: 'Old_Name' }],
        blueskyHandleLink: { id: 'revoked-long-ago' },
      }),
    },
  }
  const rows = await tombstonesForUser(client as never, 'u1', { removedForAbuse: false, now: NOW })
  expect(rows).toEqual([
    { handle: 'a_b', subdomainLabel: 'a-b', blueskyLinked: true, removedForAbuse: false, createdAt: NOW, expiresAt: null },
    { handle: 'old_name', subdomainLabel: 'old-name', blueskyLinked: true, removedForAbuse: false, createdAt: NOW, expiresAt: null },
  ])
})

test('an account that is already gone makes no rows', async () => {
  const client = { user: { findUnique: jest.fn().mockResolvedValue(null) } }
  await expect(tombstonesForUser(client as never, 'gone', { removedForAbuse: true })).resolves.toEqual([])
})
