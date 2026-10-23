#!/usr/bin/env tsx
/**
 * Local ThreadRing rows that mirror a Ring Hub ring (description
 * "RingHub ThreadRing: …", made by mirrorRingResults in
 * lib/domain/posts/send-to-rings.ts or scripts/backfill-post-threadring-associations.ts)
 * used to name whoever posted to the ring first as curatorId. Ring Hub owns
 * the ring (Ring.ownerDid), so this points each one at the real owner:
 *
 *   1. RingHubOwnership.ownerUserId, when there's a row for the slug;
 *   2. else the local person whose UserDID.did is the hub's ownerDid;
 *   3. else nobody (NULL): the hub owner isn't anyone here.
 *
 * Rows the hub can't speak for (it's unreachable, errors, or doesn't know the
 * ring) are listed and left alone. Re-runnable: each write only lands if the
 * row still has the curatorId it was planned from, and a second run finds
 * nothing to do.
 *
 * Dry run by default: reads the database (and Ring Hub, read-only), writes
 * nothing.
 *
 *   npx tsx scripts/repair-ring-mirror-curators.ts           # report
 *   npx tsx scripts/repair-ring-mirror-curators.ts --apply   # write it
 *   npx tsx scripts/repair-ring-mirror-curators.ts --no-hub  # don't ask Ring Hub; step 2 rows are left alone
 */
import './load-env'
import { db } from '@/lib/config/database/connection'
import { getPublicRingHubClient } from '@/lib/api/ringhub/ringhub-client'

export const MIRROR_DESCRIPTION_PREFIX = 'RingHub ThreadRing:'

/** The hub owner's DID for a slug, null when the hub has no such ring. Throws when it can't say. */
export type HubOwnerLookup = (slug: string) => Promise<string | null>

export type CuratorChange = {
  id: string
  slug: string
  from: string | null
  to: string | null
  why: 'ringhub_ownership' | 'hub_owner_did' | 'hub_owner_not_local'
}
export type CuratorSkip = { id: string; slug: string; curatorId: string | null; why: string }

export async function planMirrorCuratorRepair(hubOwnerDid: HubOwnerLookup | null) {
  const rows = await db.threadRing.findMany({
    where: { description: { startsWith: MIRROR_DESCRIPTION_PREFIX }, isSystemRing: false },
    select: { id: true, slug: true, curatorId: true },
    orderBy: { slug: 'asc' },
  })
  const owned = await db.ringHubOwnership.findMany({
    where: { ringSlug: { in: rows.map((r) => r.slug) } },
    select: { ringSlug: true, ownerUserId: true },
  })
  const ownerBySlug = new Map(owned.map((o) => [o.ringSlug, o.ownerUserId]))

  const changes: CuratorChange[] = []
  const skipped: CuratorSkip[] = []
  let unchanged = 0
  const note = (row: (typeof rows)[number], to: string | null, why: CuratorChange['why']) => {
    if (row.curatorId === to) unchanged++
    else changes.push({ id: row.id, slug: row.slug, from: row.curatorId, to, why })
  }

  for (const row of rows) {
    const ownerUserId = ownerBySlug.get(row.slug)
    if (ownerUserId) {
      note(row, ownerUserId, 'ringhub_ownership')
      continue
    }
    if (!hubOwnerDid) {
      skipped.push({ id: row.id, slug: row.slug, curatorId: row.curatorId, why: 'no RingHubOwnership row, and Ring Hub not asked' })
      continue
    }
    let did: string | null
    try {
      did = await hubOwnerDid(row.slug)
    } catch (error) {
      skipped.push({ id: row.id, slug: row.slug, curatorId: row.curatorId, why: `Ring Hub didn't answer: ${error instanceof Error ? error.message : String(error)}` })
      continue
    }
    if (!did) {
      skipped.push({ id: row.id, slug: row.slug, curatorId: row.curatorId, why: "Ring Hub doesn't know this ring" })
      continue
    }
    const local = await db.userDID.findUnique({ where: { did }, select: { userId: true } })
    if (local) note(row, local.userId, 'hub_owner_did')
    else note(row, null, 'hub_owner_not_local')
  }

  return { total: rows.length, unchanged, changes, skipped }
}

/** Writes the planned changes; a row someone changed since the plan is left as it is. */
export async function applyMirrorCuratorRepair(changes: CuratorChange[]) {
  let applied = 0
  for (const c of changes) {
    const { count } = await db.threadRing.updateMany({
      where: { id: c.id, curatorId: c.from },
      data: { curatorId: c.to },
    })
    applied += count
  }
  return applied
}

function parseArgs(argv: string[]) {
  const args = { apply: false, hub: true }
  for (const a of argv) {
    if (a === '--apply') args.apply = true
    else if (a === '--no-hub') args.hub = false
    else if (a === '--help' || a === '-h') {
      console.log('Usage: npx tsx scripts/repair-ring-mirror-curators.ts [--apply] [--no-hub]')
      process.exit(0)
    } else {
      console.error(`Unknown argument: ${a}`)
      process.exit(2)
    }
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  let lookup: HubOwnerLookup | null = null
  if (args.hub) {
    const client = getPublicRingHubClient()
    lookup = async (slug) => (await client.getRing(slug))?.ownerDid ?? null
  }

  const plan = await planMirrorCuratorRepair(lookup)
  for (const c of plan.changes) console.log(`${c.slug}: ${c.from ?? 'NULL'} -> ${c.to ?? 'NULL'} (${c.why})`)
  for (const s of plan.skipped) console.log(`${s.slug}: left as ${s.curatorId ?? 'NULL'} (${s.why})`)
  console.log(
    `\n${plan.total} mirror row(s): ${plan.changes.length} to change, ${plan.unchanged} already right, ${plan.skipped.length} left alone.`
  )

  if (!args.apply) {
    console.log('Dry run. Pass --apply to write it.')
    return
  }
  const applied = await applyMirrorCuratorRepair(plan.changes)
  console.log(`Changed ${applied} of ${plan.changes.length}.`)
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e)
      process.exitCode = 1
    })
    .finally(() => db.$disconnect())
}
