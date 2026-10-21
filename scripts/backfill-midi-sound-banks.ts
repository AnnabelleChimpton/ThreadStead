#!/usr/bin/env tsx
/**
 * Give MIDI songs without one their own sound bank (MIDI plan Phase 3).
 * Songs get one at upload, and a song still without one gets it the first
 * time it's played, so this is for doing them all ahead of time (and for
 * --force remakes). Needs migration 20261104000000_midi_sound_banks.
 *
 * Dry run by default: reads each song and trims its bank to report the
 * size, but uploads and saves nothing.
 *
 *   npx tsx scripts/backfill-midi-sound-banks.ts                # report what it would do
 *   npx tsx scripts/backfill-midi-sound-banks.ts --apply        # upload the banks, save the URLs
 *   npx tsx scripts/backfill-midi-sound-banks.ts --apply --force # remake banks songs already have
 *   npx tsx scripts/backfill-midi-sound-banks.ts --limit 10     # the first N songs
 *
 * Also makes the signup music's bank (public/uploads/admin/<file>.sf2) when
 * it's a MIDI. One song at a time; the 32 MB source bank is read once.
 */
import './load-env'
import fs from 'fs'
import path from 'path'
import { db } from '@/lib/config/database/connection'
import { readStoredObject } from '@/lib/storage/r2'
import { SOURCE_SOUND_BANK, trimSoundBank } from '@/lib/audio/server/trim-sound-bank'
import { makeSongSoundBank, soundBankKeyFor } from '@/lib/audio/server/song-sound-bank'

function parseArgs(argv: string[]) {
  const args = { apply: false, force: false, limit: 0 }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--apply') args.apply = true
    else if (a === '--force') args.force = true
    else if (a === '--limit') args.limit = Number(argv[++i])
    else if (a === '--help' || a === '-h') {
      console.log('Usage: npx tsx scripts/backfill-midi-sound-banks.ts [--apply] [--force] [--limit N]')
      process.exit(0)
    } else {
      console.error(`Unknown argument: ${a}`)
      process.exit(2)
    }
  }
  if (!Number.isInteger(args.limit) || args.limit < 0) {
    console.error('--limit takes a whole number.')
    process.exit(2)
  }
  return args
}

const mb = (bytes: number) => `${(bytes / 1e6).toFixed(2)} MB`

async function signupMusic(source: Buffer, apply: boolean, force: boolean) {
  const configFile = path.join(process.cwd(), 'data', 'signup-audio-config.json')
  if (!fs.existsSync(configFile)) return console.log('signup music: none set')
  const { filename } = JSON.parse(fs.readFileSync(configFile, 'utf8')) as { filename?: string }
  if (!filename || !/\.midi?$/i.test(filename)) return console.log('signup music: not a MIDI')
  const midiPath = path.join(process.cwd(), 'public', 'uploads', 'admin', path.basename(filename))
  if (!fs.existsSync(midiPath)) return console.log(`signup music: ${filename} is missing`)
  if (fs.existsSync(`${midiPath}.sf2`) && !force) return console.log('signup music: has a bank')
  const bank = await trimSoundBank(fs.readFileSync(midiPath), source)
  if (apply) fs.writeFileSync(`${midiPath}.sf2`, bank)
  console.log(`signup music: ${apply ? 'made' : 'would make'} ${mb(bank.length)}`)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const source = fs.readFileSync(SOURCE_SOUND_BANK)

  const songs = await db.media.findMany({
    where: { mediaType: 'midi', ...(args.force ? {} : { soundBankUrl: null }) },
    select: { id: true, fullUrl: true, title: true, originalName: true, soundBankUrl: true },
    orderBy: { createdAt: 'asc' },
    ...(args.limit ? { take: args.limit } : {}),
  })

  console.log(`${args.apply ? 'APPLY' : 'DRY RUN (nothing is uploaded or saved)'}: ${songs.length} song(s)${args.force ? ', --force' : ''}\n`)
  const counts: Record<string, number> = {}
  const tally = (k: string) => (counts[k] = (counts[k] ?? 0) + 1)
  let total = 0

  for (const song of songs) {
    const name = `${song.id}  ${song.title || song.originalName || ''}`.trim()
    try {
      if (!soundBankKeyFor(song.fullUrl)) {
        tally('skipped')
        console.log(`skipped    ${name}  (not in our storage: ${song.fullUrl})`)
        continue
      }
      let bank: Buffer
      if (args.apply) {
        bank = (await makeSongSoundBank(song, source)).bank
      } else {
        const midi = await readStoredObject(song.fullUrl)
        if (!midi) {
          tally('missing')
          console.log(`missing    ${name}`)
          continue
        }
        bank = await trimSoundBank(midi, source)
      }
      total += bank.length
      tally(args.apply ? 'made' : 'would make')
      console.log(`${(args.apply ? 'made' : 'would make').padEnd(10)} ${name}  ${mb(bank.length)}`)
    } catch (error) {
      tally('failed')
      console.log(`failed     ${name}  ${error instanceof Error ? error.message : error}`)
    }
  }

  console.log('')
  await signupMusic(source, args.apply, args.force)
  console.log(`\n${Object.entries(counts).map(([k, n]) => `${n} ${k}`).join(', ') || 'nothing to do'}; banks total ${mb(total)}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
