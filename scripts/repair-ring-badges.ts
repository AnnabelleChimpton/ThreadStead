#!/usr/bin/env tsx
/**
 * Bring every ring's badge onto the new badges (design/threadring-audit/08-badges.md).
 *
 * - Redrawn as the default Label (linked-rings picture, the ring's colour,
 *   its full name): badges from the old generator, ones stored inline as a
 *   data: URL, and ones hotlinked from other sites.
 * - Badges the host uploaded stay. If their HD points at a different, older
 *   picture, it becomes the same upload's full size.
 * - Badges drawn by the new system stay as their host chose them.
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
import { drawnBadgeChoice } from '@/lib/badge-uploader'
import { drawAndUploadRingBadge } from '@/lib/rings/badge'
import { badgeChoiceFor } from '@/lib/rings/badge-art'
import { keyFromPublicUrl } from '@/lib/storage/r2'

/** Old generator output, inline data: badges and hotlinks: anything that isn't a new drawing or one of our uploads. */
function needsRedraw(url: string): boolean {
  const key = keyFromPublicUrl(url)
  if (!key) return true
  return key.startsWith('badges/') && !drawnBadgeChoice(url)
}

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
    const url = ring.badgeImageUrl
    if (!url) continue
    if (needsRedraw(url)) {
      console.log(`redraw  ${ring.slug}: ${url.slice(0, 80)} → Label`)
      if (!apply) continue
      const badge = await drawAndUploadRingBadge(ring, badgeChoiceFor({}))
      await hub.updateRingBadge(ring.slug, { ...badge, updateExistingBadges: true })
      continue
    }
    const full = fullSizeOf(url)
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
