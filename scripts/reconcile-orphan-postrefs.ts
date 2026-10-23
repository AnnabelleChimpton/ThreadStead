#!/usr/bin/env tsx
/**
 * Find RingHub PostRefs that point at ThreadStead posts which no longer exist,
 * and (with --apply) remove them through the hub's own POST /trp/curate.
 *
 * Dry run by default: reads the hub and this instance's DB, writes nothing.
 *
 *   npx tsx scripts/reconcile-orphan-postrefs.ts                   # report
 *   npx tsx scripts/reconcile-orphan-postrefs.ts --apply           # remove (author-signed)
 *   npx tsx scripts/reconcile-orphan-postrefs.ts --owner-fallback  # also plan owner-signed removals
 *   npx tsx scripts/reconcile-orphan-postrefs.ts --ring welcome    # one ring (repeatable)
 *
 * Who signs: the post's author (their UserDID key is still here unless their
 * account was deleted), which removes the post from every ring at once. With
 * --owner-fallback, refs whose author has no key are removed by the ring owner
 * instead (one ring at a time). Anything else is reported and left alone.
 * See lib/domain/threadrings/orphan-postrefs.ts for the ownership notes.
 */
import './load-env'
import { db } from '@/lib/config/database/connection'
import { getPublicRingHubClient, getRingHubClient } from '@/lib/api/ringhub/ringhub-client'
import { createAuthenticatedRingHubClient } from '@/lib/api/ringhub/ringhub-user-operations'
import {
  executeOrphanRemoval,
  planOrphanRemoval,
  scanForOrphanPostRefs,
  type RemovalPlanItem,
} from '@/lib/domain/threadrings/orphan-postrefs'

const SERVER = '__server__'

function parseArgs(argv: string[]) {
  const args = { apply: false, ownerFallback: false, rings: [] as string[] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--apply') args.apply = true
    else if (a === '--owner-fallback') args.ownerFallback = true
    else if (a === '--ring') args.rings.push(argv[++i])
    else if (a === '--help' || a === '-h') {
      console.log('Usage: npx tsx scripts/reconcile-orphan-postrefs.ts [--apply] [--owner-fallback] [--ring <slug>]...')
      process.exit(0)
    } else {
      console.error(`Unknown argument: ${a}`)
      process.exit(2)
    }
  }
  return args
}

function describe(item: RemovalPlanItem): string {
  if (item.coveredBy) return `covered by author removal of ${item.coveredBy}`
  if (!item.signer) return `SKIP: ${item.blocked}`
  return item.signer.kind === 'author'
    ? `remove as author ${item.signer.did} (all rings)`
    : `remove as ring owner ${item.signer.did} (this ring only)`
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const publicClient = getPublicRingHubClient()
  const serverClient = getRingHubClient()

  console.log(`Hub: ${process.env.RING_HUB_URL}  Mode: ${args.apply ? 'APPLY' : 'dry run'}`)

  // A signed listing includes UNLISTED and PRIVATE rings; anonymous lists PUBLIC only.
  let listClient = serverClient ?? publicClient
  if (serverClient && !args.rings.length) {
    try {
      await serverClient.listRings({ limit: 1 })
    } catch (error) {
      console.warn(`Signed ring listing failed (${(error as Error).message}); listing PUBLIC rings only.`)
      listClient = publicClient
    }
  }

  const scan = await scanForOrphanPostRefs({
    hub: {
      listRings: (o) => listClient.listRings(o),
      // The feed route never authenticates, so the public client sees exactly
      // what every feed render sees: ACCEPTED posts.
      getRingFeed: (slug, o) => publicClient.getRingFeed(slug, o),
    },
    ringSlugs: args.rings,
    existingPostIds: async (ids) => {
      const found = new Set<string>()
      for (let i = 0; i < ids.length; i += 500) {
        const rows = await db.post.findMany({ where: { id: { in: ids.slice(i, i + 500) } }, select: { id: true } })
        rows.forEach((r) => found.add(r.id))
      }
      return found
    },
  })

  console.log(
    `Scanned ${scan.ringsScanned} rings, ${scan.refsScanned} PostRefs (${scan.ourRefs} from this instance). ` +
    `Orphans: ${scan.orphans.length}.`
  )
  for (const f of scan.ringsFailed) console.log(`  ring ${f.slug}: could not read feed (${f.error})`)
  if (scan.unparseableUris.length) {
    console.log(`  ${scan.unparseableUris.length} of our URIs have no post ID; left alone:`)
    scan.unparseableUris.forEach((u) => console.log(`    ${u}`))
  }
  if (!scan.orphans.length) return

  const serverDid = process.env.THREADSTEAD_DID
  const plan = await planOrphanRemoval(scan.orphans, {
    ringOwners: scan.ringOwners,
    ownerFallback: args.ownerFallback,
    localUsersByDid: async (dids) => {
      const rows = await db.userDID.findMany({ where: { did: { in: dids } }, select: { did: true, userId: true } })
      const map = new Map(rows.map((r) => [r.did, r.userId]))
      // Legacy server-proxy submissions: the instance itself is submittedBy.
      if (serverDid && serverClient && dids.includes(serverDid)) map.set(serverDid, SERVER)
      return map
    },
  })

  console.log('')
  for (const item of plan) {
    const o = item.orphan
    console.log(`${o.ringSlug}  postRef=${o.refId}  post=${o.postId}  submitted=${o.submittedAt.slice(0, 10)}`)
    console.log(`    ${o.uri}`)
    console.log(`    → ${describe(item)}`)
  }

  const calls = plan.filter((p) => p.signer)
  const blocked = plan.filter((p) => !p.signer && !p.coveredBy)
  console.log(`\nPlan: ${calls.length} curate call(s), ${plan.length - calls.length - blocked.length} covered, ${blocked.length} skipped.`)

  if (!args.apply) {
    if (calls.length) console.log('Dry run: nothing written. Rerun with --apply to make these calls.')
    return
  }

  const outcomes = await executeOrphanRemoval(plan, {
    curateAs: (userId) => (userId === SERVER ? serverClient! : createAuthenticatedRingHubClient(userId)),
  })
  const ok = outcomes.filter((o) => o.ok)
  console.log(`\nApplied: ${ok.length} ok, ${outcomes.length - ok.length} failed.`)
  for (const o of outcomes) {
    console.log(`  ${o.refId}: ${o.ok ? `removed (${o.totalRemoved} PostRef(s))` : `FAILED ${o.error}`}`)
  }
  if (outcomes.some((o) => !o.ok)) process.exitCode = 1
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
