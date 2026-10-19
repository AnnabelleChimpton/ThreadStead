#!/usr/bin/env tsx
/**
 * Draw the share snapshot (og:image) for pixel homes that don't have an
 * up-to-date one: homes saved before snapshots existed, yards whose art
 * changed, or every home after SNAPSHOT_RENDERER_VERSION is bumped.
 *
 * Dry run by default: reads the database, draws and writes nothing.
 *
 *   npx tsx scripts/backfill-home-snapshots.ts                 # report what it would do
 *   npx tsx scripts/backfill-home-snapshots.ts --apply         # draw, upload to R2, save the URLs
 *   npx tsx scripts/backfill-home-snapshots.ts --apply --force # redraw even up-to-date ones
 *   npx tsx scripts/backfill-home-snapshots.ts --user alice    # one home (repeatable)
 *   npx tsx scripts/backfill-home-snapshots.ts --limit 10      # the first N homes
 *   npx tsx scripts/backfill-home-snapshots.ts --out ./snaps   # draw to local files only
 *
 * Homes a signed-out visitor can't see get no snapshot; with --apply, any
 * snapshot they still have is deleted. One home at a time, so it's gentle
 * on the CDN and the database.
 */
import './load-env'
import { mkdirSync, writeFileSync } from 'fs'
import path from 'path'
import { db } from '@/lib/config/database/connection'
import { planHomeSnapshot, refreshHomeSnapshot, loadSnapshotImage } from '@/lib/pixel-homes/snapshot/service'
import { renderHomeSnapshot } from '@/lib/pixel-homes/snapshot/render'

function parseArgs(argv: string[]) {
  const args = { apply: false, force: false, users: [] as string[], limit: 0, out: '' }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--apply') args.apply = true
    else if (a === '--force') args.force = true
    else if (a === '--user') args.users.push(argv[++i].replace(/^@/, '').toLowerCase())
    else if (a === '--limit') args.limit = Number(argv[++i])
    else if (a === '--out') args.out = argv[++i]
    else if (a === '--help' || a === '-h') {
      console.log('Usage: npx tsx scripts/backfill-home-snapshots.ts [--apply] [--force] [--user <handle>]... [--limit N] [--out <dir>]')
      process.exit(0)
    } else {
      console.error(`Unknown argument: ${a}`)
      process.exit(2)
    }
  }
  if (args.apply && args.out) {
    console.error('--out draws local files only; leave out --apply.')
    process.exit(2)
  }
  if (!Number.isInteger(args.limit) || args.limit < 0) {
    console.error('--limit takes a whole number.')
    process.exit(2)
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  const homes = await db.userHomeConfig.findMany({
    where: args.users.length ? { user: { handles: { some: { handle: { in: args.users } } } } } : {},
    select: { userId: true, user: { select: { primaryHandle: true, handles: { select: { handle: true }, take: 1 } } } },
    orderBy: { createdAt: 'asc' },
    ...(args.limit ? { take: args.limit } : {}),
  })

  const mode = args.apply ? 'APPLY' : args.out ? `DRAW TO ${args.out}` : 'DRY RUN (nothing is drawn or written)'
  console.log(`${mode}: ${homes.length} home(s)${args.force ? ', --force' : ''}\n`)
  if (args.out) mkdirSync(args.out, { recursive: true })

  const counts: Record<string, number> = {}
  const tally = (k: string) => (counts[k] = (counts[k] ?? 0) + 1)

  for (const home of homes) {
    const name = home.user.handles[0]?.handle ?? home.user.primaryHandle ?? home.userId
    try {
      if (args.apply) {
        const result = await refreshHomeSnapshot(home.userId, { force: args.force })
        tally(result.status)
        console.log(`${result.status.padEnd(10)} ${name}${'url' in result ? `  ${result.url}` : ''}`)
        continue
      }

      const plan = await planHomeSnapshot(home.userId, { force: args.force })
      if (plan.action === 'draw' && args.out) {
        const { og, card } = await renderHomeSnapshot(plan.scene, { loadImage: loadSnapshotImage })
        const file = name.replace(/[^a-z0-9_.-]/gi, '_')
        writeFileSync(path.join(args.out, `${file}.png`), og)
        writeFileSync(path.join(args.out, `${file}.card.png`), card)
      }
      const label =
        plan.action === 'hidden'
          ? plan.storedUrls.some(Boolean) ? 'hidden (would delete its snapshot)' : 'hidden'
          : plan.action === 'draw' ? (args.out ? 'drawn' : 'would draw') : plan.action
      tally(label)
      console.log(`${label.padEnd(10)} ${name}`)
    } catch (error) {
      tally('failed')
      console.error(`failed     ${name}:`, error instanceof Error ? error.message : error)
    }
  }

  console.log('\n' + Object.entries(counts).map(([k, n]) => `${k}: ${n}`).join(', '))
  if (!args.apply && !args.out && (counts['would draw'] || counts['hidden (would delete its snapshot)'])) {
    console.log('Run again with --apply to draw and upload them.')
  }
  await db.$disconnect()
  if (counts.failed) process.exitCode = 1
}

main().catch(async (error) => {
  console.error(error)
  await db.$disconnect()
  process.exit(1)
})
