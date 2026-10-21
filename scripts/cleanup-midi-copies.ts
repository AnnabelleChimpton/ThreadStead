#!/usr/bin/env tsx
/**
 * Songs used to be stored three times: the MIDI, plus "_thumb" and
 * "_medium" copies of the same bytes, as if they were photos (MIDI plan
 * Phase 5). Uploads now store one. This deletes the old extra copies and
 * points each row's thumbnail and medium URLs at the song itself.
 *
 * Dry run by default: lists what it would delete.
 *
 *   npx tsx scripts/cleanup-midi-copies.ts           # report
 *   npx tsx scripts/cleanup-midi-copies.ts --apply   # delete the copies, update the rows
 */
import './load-env'
import { db } from '@/lib/config/database/connection'
import { deleteObjects, keyFromPublicUrl } from '@/lib/storage/r2'

async function main() {
  const apply = process.argv.includes('--apply')
  const songs = await db.media.findMany({
    where: { mediaType: 'midi' },
    select: { id: true, title: true, fullUrl: true, thumbnailUrl: true, mediumUrl: true },
    orderBy: { createdAt: 'asc' },
  })
  const extra = songs.filter((s) => s.thumbnailUrl !== s.fullUrl || s.mediumUrl !== s.fullUrl)
  console.log(`${apply ? 'APPLY' : 'DRY RUN (nothing is deleted or saved)'}: ${extra.length} of ${songs.length} song(s) have extra copies\n`)

  let deleted = 0
  let failed = 0
  for (const song of extra) {
    const copies = [song.thumbnailUrl, song.mediumUrl].filter((u) => u && u !== song.fullUrl)
    const keys = copies.map((u) => keyFromPublicUrl(u)).filter((k): k is string => !!k)
    if (keys.length !== copies.length) {
      console.log(`skipped  ${song.id}  ${song.title ?? ''}  (a copy isn't in our storage)`)
      continue
    }
    if (apply) {
      const result = await deleteObjects(keys, { context: `midi-copies:${song.id}` })
      deleted += result.deleted.length
      failed += result.failed.length
      if (result.failed.length) {
        console.log(`failed   ${song.id}  ${song.title ?? ''}  (kept the row as it was)`)
        continue
      }
      await db.media.update({ where: { id: song.id }, data: { thumbnailUrl: song.fullUrl, mediumUrl: song.fullUrl } })
    }
    console.log(`${apply ? 'cleaned' : 'would clean'}  ${song.id}  ${song.title ?? ''}  ${keys.join(', ')}`)
  }
  console.log(apply ? `\n${deleted} copies deleted, ${failed} failed` : `\n${extra.length * 2} copies would be deleted`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
