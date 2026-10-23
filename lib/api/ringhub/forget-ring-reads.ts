import { invalidate, invalidateMatching } from '@/lib/api/ringhub/ringhub-cache'

/**
 * Call after any write to a ring (join, leave, accepting an invite, settings,
 * roles, removal, hand-over, badge) so the next read sees it. Reads of the
 * hub are cached for 30 s and served stale for 5 min, so without this the
 * page reloaded into the old state: "Join" again after joining, the old
 * settings after saving. `userIds` are the residents whose own lists of
 * rings changed (the one joining or leaving, say).
 */
export function forgetRingReads(slug: string, userIds: string[] = []): void {
  invalidate(`ring:${slug}`)
  invalidate(`membership-info:${slug}`)
  invalidate(`street-rings:members:${slug}`)
  // Every viewer's copy of this ring's members, every directory listing, and
  // the ring signs on members' streets (cached per member's DID, and they
  // show the ring's name, so any write can change them)
  invalidateMatching(
    (key) =>
      (key.startsWith('ring-members-all:') && key.endsWith(`:${slug}`)) ||
      key.startsWith('list-rings:') ||
      key.startsWith('street-rings:actor:')
  )
  for (const userId of userIds) {
    invalidate(`my-memberships:${userId}`)
    invalidate(`ring-stops:my-rings:${userId}`)
  }
}
