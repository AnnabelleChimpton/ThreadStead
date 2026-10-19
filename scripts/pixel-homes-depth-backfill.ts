#!/usr/bin/env tsx
/**
 * The house now sorts with the decorations by depth (lib/pixel-homes/depth.ts):
 * anything whose feet are above the house's sort line (where its walls meet
 * the foundation) stands behind it. Before, every decoration drew in front.
 *
 * This lists the placed decorations that overlap the house and so would now
 * draw behind it (a tree on the roof, roses along the wall), per home.
 * Lights, chimes, lanterns, trellises and arches on the house aren't listed:
 * they stay in front of it anyway (HUNG_ON_HOUSE in lib/pixel-homes/depth.ts).
 * With --apply it keeps the listed ones in front, as they were, by bringing
 * each one forward a level (layerBias 1). Residents can send them back in
 * the editor. --except leaves some kinds to go behind the house.
 *
 * Dry run by default: reads the database, writes nothing.
 *
 *   npx tsx scripts/pixel-homes-depth-backfill.ts            # report
 *   npx tsx scripts/pixel-homes-depth-backfill.ts --apply    # keep them in front
 *   npx tsx scripts/pixel-homes-depth-backfill.ts --apply --except tree_pine,tree_oak,small_tree,gazebo
 *                                                           # trees and gazebos go behind; the rest stay
 *   npx tsx scripts/pixel-homes-depth-backfill.ts --user alice
 *
 * After --apply, redraw the share snapshots:
 *   npx tsx scripts/backfill-home-snapshots.ts --apply
 */
import './load-env'
import { db } from '@/lib/config/database/connection'
import { movesBehindHouse } from '@/lib/pixel-homes/depth'

function parseArgs(argv: string[]) {
  const args = { apply: false, users: [] as string[], except: [] as string[] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--apply') args.apply = true
    else if (a === '--user') args.users.push(argv[++i].replace(/^@/, '').toLowerCase())
    else if (a === '--except') args.except.push(...(argv[++i] ?? '').split(',').map((s) => s.trim()).filter(Boolean))
    else if (a === '--help' || a === '-h') {
      console.log('Usage: npx tsx scripts/pixel-homes-depth-backfill.ts [--apply] [--except id,id,...] [--user <handle>]...')
      process.exit(0)
    } else {
      console.error(`Unknown argument: ${a}`)
      process.exit(2)
    }
  }
  return args
}

/** The decorations that would move behind the house, grouped by home. */
export async function findDecorationsBehindHouse(users: string[] = [], except: string[] = []) {
  const rows = await db.userHomeDecoration.findMany({
    where: {
      layerBias: 0,
      decorationType: { notIn: ['path', 'water'] },
      ...(except.length ? { decorationId: { notIn: except } } : {}),
      ...(users.length ? { homeConfig: { user: { handles: { some: { handle: { in: users } } } } } } : {}),
    },
    select: { id: true, userId: true, decorationId: true, decorationType: true, size: true, positionX: true, positionY: true, layerBias: true },
  })
  const moving = rows.filter((r) =>
    movesBehindHouse({
      id: r.id,
      decorationId: r.decorationId,
      type: r.decorationType,
      size: r.size ?? 'medium',
      position: { x: r.positionX, y: r.positionY },
      layerBias: r.layerBias,
    })
  )
  const byHome = new Map<string, typeof moving>()
  for (const r of moving) byHome.set(r.userId, [...(byHome.get(r.userId) ?? []), r])
  return byHome
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const byHome = await findDecorationsBehindHouse(args.users, args.except)
  if (args.except.length) console.log(`Leaving these to go behind the house: ${args.except.join(', ')}\n`)
  const total = [...byHome.values()].reduce((n, list) => n + list.length, 0)

  for (const [userId, list] of byHome) {
    const counts = new Map<string, number>()
    for (const r of list) counts.set(r.decorationId, (counts.get(r.decorationId) ?? 0) + 1)
    console.log(`${userId}: ${list.length} — ${[...counts].map(([id, n]) => `${id} ×${n}`).join(', ')}`)
  }
  console.log(`\n${total} decoration(s) in ${byHome.size} home(s) overlap the house and would now draw behind it${args.except.length ? ' (not counting the kinds left out)' : ''}.`)

  if (!args.apply) {
    console.log('Dry run. Pass --apply to keep them in front (layerBias 1).')
    return
  }
  const ids = [...byHome.values()].flat().map((r) => r.id)
  const { count } = await db.userHomeDecoration.updateMany({ where: { id: { in: ids }, layerBias: 0 }, data: { layerBias: 1 } })
  console.log(`Kept ${count} in front. Now redraw the snapshots: npx tsx scripts/backfill-home-snapshots.ts --apply`)
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e)
      process.exitCode = 1
    })
    .finally(() => db.$disconnect())
}
