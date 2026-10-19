/**
 * Does this person own the ring, as far as this site can tell without asking
 * Ring Hub?
 *
 * With Ring Hub on, the hub owns every ring (Ring.ownerDid) and refuses
 * management calls from anyone else. RingHubOwnership is our mirror of that
 * owner: fork/create (ringhub-user-operations.ts) and hand-overs
 * (ownership-transfer.ts) write it. The local ThreadRing row's curatorId isn't:
 * a mirror row (mirrorRingResults, the post backfill) named whoever posted to
 * the ring first, so with Ring Hub on it never counts. Only local mode, where
 * the row is the ring, trusts curatorId.
 *
 * Admins aren't handled here; callers add that themselves.
 */
import { db } from '@/lib/config/database/connection'
import { featureFlags } from '@/lib/utils/features/feature-flags'
import { mapDIDToUserId } from '@/lib/api/did/server-did-client'

export type RingOwnerSource = 'local_threadring' | 'ringhub_ownership' | 'ringhub_did_mapping'

export async function ringOwnerSource(
  slug: string,
  userId: string,
  hubMode: boolean = featureFlags.ringhub()
): Promise<RingOwnerSource | null> {
  if (!hubMode) {
    const local = await db.threadRing.findUnique({ where: { slug }, select: { curatorId: true } })
    if (local?.curatorId && local.curatorId === userId) return 'local_threadring'
  }

  const ownership = await db.ringHubOwnership.findUnique({ where: { ringSlug: slug } })
  if (!ownership) return null
  if (ownership.ownerUserId === userId) return 'ringhub_ownership'
  // serverDID is the hub owner's DID (the person's own key since forks went per-user).
  if ((await mapDIDToUserId(ownership.serverDID)) === userId) return 'ringhub_did_mapping'
  return null
}
