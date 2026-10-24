#!/usr/bin/env tsx
/**
 * One-off (2026-10-23): repair the ring badges that are wrong today, as
 * found in the ThreadRing audit (design/threadring-audit/08-badges.md).
 *
 * - REDRAW: badges showing another ring's name ("The Spool F…"), the one
 *   stored inline as a data: URL, and the two hotlinked from other sites.
 *   Each is drawn again as the default Label, in the ring's colour.
 * - Every other ring whose badge is an image its host uploaded, but whose
 *   HD points at a different, older picture: the HD becomes the same
 *   upload's full size, so the host's art stays.
 *
 * Signed as this site, which the hub lets act as an admin. Every member's
 * badge picks up the change (the hub keeps each badge's id and date).
 *
 * Dry run by default: reads the hub and prints the plan.
 *
 *   npx tsx scripts/repair-ring-badges.ts           # report
 *   npx tsx scripts/repair-ring-badges.ts --apply   # repair
 */
import './load-env'
import { getPublicRingHubClient, getRingHubClient } from '@/lib/api/ringhub/ringhub-client'
import { drawAndUploadRingBadge } from '@/lib/rings/badge'
import { badgeChoiceFor } from '@/lib/rings/badge-art'

const REDRAW = ['television', 'technology', 'pets', 'threadstead', 'big-brother', 'music']

/** The full-size copy of one of our uploads, from its medium (or full) size's address. */
const fullSizeOf = (url: string) => (/\/media\/.+_(medium|full)\.\w+$/.test(url) ? url.replace(/_medium(\.\w+)$/, '_full$1') : null)

async function exists(url: string) {
  const res = await fetch(url, { method: 'HEAD' })
  return res.ok
}

async function main() {
  const apply = process.argv.includes('--apply')
  const hub = getRingHubClient()
  const { rings } = await getPublicRingHubClient().listRings({ limit: 100 })

  for (const ring of rings) {
    if (REDRAW.includes(ring.slug)) {
      console.log(`redraw  ${ring.slug}: ${ring.badgeImageUrl?.slice(0, 80) ?? 'none'} → Label`)
      if (!apply) continue
      // The default badge: Label with its linked-rings picture (no picture also drops the coloured tab)
      const badge = await drawAndUploadRingBadge(ring, badgeChoiceFor({}))
      await hub.updateRingBadge(ring.slug, { ...badge, updateExistingBadges: true })
      continue
    }
    const full = ring.badgeImageUrl ? fullSizeOf(ring.badgeImageUrl) : null
    if (!full || ring.badgeImageHighResUrl === full) continue
    if (!(await exists(full))) {
      console.log(`skip    ${ring.slug}: no full size at ${full}`)
      continue
    }
    console.log(`hd      ${ring.slug}: ${ring.badgeImageHighResUrl ?? 'none'} → ${full}`)
    if (apply) await hub.updateRingBadge(ring.slug, { badgeImageHighResUrl: full, updateExistingBadges: true })
  }
  if (!apply) console.log('\nDry run. Run again with --apply to repair.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
