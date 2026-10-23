#!/usr/bin/env tsx
/**
 * Delete the rings earlier account deletes left on Ring Hub with nobody in
 * them (lib/domain/threadrings/empty-rings.ts). Dry run by default.
 *
 *   npx tsx scripts/delete-empty-rings.ts rings.txt          # report
 *   npx tsx scripts/delete-empty-rings.ts rings.txt --apply  # delete
 *
 * rings.txt is the hub-database listing from design/leaving/EMPTY_RINGS.md.
 * Signed as this site, which must be a hub admin (Actor.isAdmin).
 */
import './load-env'
import { readFileSync } from 'fs'
import { getPublicRingHubClient, getRingHubClient } from '@/lib/api/ringhub/ringhub-client'
import { mapDIDToUserId } from '@/lib/api/did/server-did-client'
import { deleteEmptyRing, parseListing, reasonToKeep } from '@/lib/domain/threadrings/empty-rings'

async function main() {
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const file = args.find((a) => !a.startsWith('--'))
  if (!file) {
    console.error('Usage: npx tsx scripts/delete-empty-rings.ts <listing file> [--apply]')
    process.exit(2)
  }
  const admin = getRingHubClient()
  const reader = getPublicRingHubClient()
  const siteDid = process.env.THREADSTEAD_DID
  if (!admin || !reader || !siteDid) throw new Error('Ring Hub is not set up here (RING_HUB_URL, THREADSTEAD_DID)')

  const rings = parseListing(readFileSync(file, 'utf8'))
  console.log(`Hub: ${process.env.RING_HUB_URL}  Site: ${siteDid}  Mode: ${apply ? 'APPLY' : 'dry run'}  Rings listed: ${rings.length}`)

  const counts: Record<string, number> = {}
  for (const ring of rings) {
    const keep = await reasonToKeep(ring, siteDid, mapDIDToUserId)
    let outcome: string
    if (keep) outcome = `keep: ${keep}`
    else if (!apply) outcome = 'would delete'
    else {
      try {
        outcome = { deleted: 'deleted', gone: 'already gone', changed: 'keep: changed since the listing' }[
          await deleteEmptyRing(ring, admin, reader)
        ]
      } catch (error: any) {
        outcome = `FAILED: ${[error?.status, error?.message ?? String(error)].filter(Boolean).join(' ')}`
      }
    }
    counts[outcome.split(':')[0]] = (counts[outcome.split(':')[0]] ?? 0) + 1
    console.log(`${ring.slug} (${ring.visibility}, ${ring.activeMemberDids.length} in it): ${outcome}`)
  }
  console.log(Object.entries(counts).map(([k, n]) => `${k}: ${n}`).join(', '))
  if (!apply) console.log('Nothing changed. Run again with --apply to delete.')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
