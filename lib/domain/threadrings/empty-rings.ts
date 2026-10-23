/**
 * Rings left behind by accounts deleted before deleting an account took the
 * rings its owner was alone in (lib/domain/users/account-removal.ts): still
 * on Ring Hub with no members, or only their owner who is gone, and nobody
 * who can moderate them. scripts/delete-empty-rings.ts deletes them, signed
 * as this site (the hub admin).
 *
 * The listing (LISTING_SQL) comes from the hub's database, read-only: the
 * hub API shows nobody another owner's PRIVATE ring, the admin included.
 * Each ring is then judged against this site's accounts, and a non-private
 * one is read again just before it goes, so a ring someone joined since
 * stays.
 */
import { db } from '@/lib/config/database/connection'
import { forgetRing } from '@/lib/domain/users/account-removal'

/**
 * The listing, read-only, run on the hub's database with psql -At: every
 * ring nobody but its owner is ACTIVE in (the root and residents' own rings
 * too; reasonToKeep sorts those out).
 */
export const LISTING_SQL = `
SELECT r.slug, r.visibility, r."ownerDid",
  coalesce(string_agg(m."actorDid", ' ' ORDER BY m."actorDid") FILTER (WHERE m.status = 'ACTIVE'), '')
FROM "Ring" r LEFT JOIN "Membership" m ON m."ringId" = r.id
GROUP BY r.id
HAVING count(*) FILTER (WHERE m.status = 'ACTIVE' AND m."actorDid" <> r."ownerDid") = 0
ORDER BY r."createdAt";
`

export interface ListedRing {
  slug: string
  visibility: string
  ownerDid: string
  /** Its ACTIVE members when listed, the owner included if still in it. */
  activeMemberDids: string[]
}

/**
 * LISTING_SQL's output (psql -At): one ring a line,
 * slug|visibility|ownerDid|active member DIDs separated by spaces.
 */
export function parseListing(text: string): ListedRing[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [slug, visibility, ownerDid, members = ''] = line.split('|')
      if (!slug || !visibility || !ownerDid) throw new Error(`Not a listing line: ${line}`)
      return { slug, visibility, ownerDid, activeMemberDids: members.split(' ').filter(Boolean) }
    })
}

/**
 * Why a listed ring stays, or null when it should go. `accountOf` maps a DID
 * to the account here that holds it (mapDIDToUserId, which also reads the
 * legacy key file).
 */
export async function reasonToKeep(
  ring: ListedRing,
  siteDid: string,
  accountOf: (did: string) => Promise<string | null>,
  rootSlug = 'spool'
): Promise<string | null> {
  if (ring.slug === rootSlug) return 'the root ring'
  if (ring.ownerDid === siteDid) return "this site's own ring"
  if (!ring.ownerDid.startsWith(`${siteDid}:users:`)) return 'its owner is from another site'
  if (await accountOf(ring.ownerDid)) return 'its owner still has an account here'
  // The row goes with its owner's account, so one that's left means someone here runs it
  if (await db.ringHubOwnership.findUnique({ where: { ringSlug: ring.slug }, select: { ownerUserId: true } })) {
    return 'someone here still owns it'
  }
  if (ring.activeMemberDids.some((did) => did !== ring.ownerDid)) return 'it has members: hand it to one of them'
  return null
}

type Admin = { deleteRing(slug: string): Promise<void> }
type Reader = { getRing(slug: string): Promise<{ ownerDid?: string; memberCount?: number } | null> }

/**
 * Delete one judged ring as the hub admin (its forks move up to its parent),
 * then forget it here. A non-private ring is read first and left alone if it
 * changed since the listing. Returns what happened.
 */
export async function deleteEmptyRing(ring: ListedRing, admin: Admin, reader: Reader): Promise<'deleted' | 'gone' | 'changed'> {
  if (ring.visibility !== 'PRIVATE') {
    const now = await reader.getRing(ring.slug)
    if (!now) {
      await forgetRing(ring.slug)
      return 'gone'
    }
    if (now.ownerDid !== ring.ownerDid || now.memberCount !== ring.activeMemberDids.length) return 'changed'
  }
  try {
    await admin.deleteRing(ring.slug)
  } catch (error: any) {
    if (error?.status !== 404) throw error
    await forgetRing(ring.slug)
    return 'gone'
  }
  await forgetRing(ring.slug)
  return 'deleted'
}
