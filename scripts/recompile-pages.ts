#!/usr/bin/env tsx
/**
 * Recompile every saved page of someone's own HTML, and every widget slot,
 * from its stored source. A page renders from the compiled copy its last
 * save stored, so a compiler fix (a component inside <p>, #top links, form
 * names, lazy images) reaches it only when its owner saves again. Run this
 * after deploying compiler changes.
 *
 * Dry run by default: compiles and reports, writes nothing.
 *
 *   npx tsx scripts/recompile-pages.ts                # report what would change
 *   npx tsx scripts/recompile-pages.ts --apply        # store the new compiled copies
 *   npx tsx scripts/recompile-pages.ts --user alice   # one resident (repeatable)
 *
 * A page still on its old stored copy (Profile.compiledTemplate, AST and
 * all) gets its artifact (Profile.pageArtifact) and the old copy goes.
 *
 * Only the stored copy changes: the source, the save time (which the
 * editor's other-tab check reads) and the restore points stay as they are.
 * A page that no longer compiles keeps what it had and is listed, for its
 * owner to fix in the editor.
 */
import './load-env'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/config/database/connection'
import { compileForEditor } from '@/lib/templates/compilation/compile-for-editor'
import { artifactFor, serializeArtifact } from '@/lib/templates/rendering/page-artifact'
import { compileWidgetSlot, storedSlot } from '@/lib/domain/profile/widget-slot/compile'

const BATCH = 50

function parseArgs(argv: string[]) {
  const args = { apply: false, users: [] as string[] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--apply') args.apply = true
    else if (a === '--user') args.users.push(argv[++i].replace(/^@/, '').toLowerCase())
    else if (a === '--help' || a === '-h') {
      console.log('Usage: npx tsx scripts/recompile-pages.ts [--apply] [--user <handle>]...')
      process.exit(0)
    } else {
      console.error(`Unknown argument: ${a}`)
      process.exit(2)
    }
  }
  return args
}

/** JSON with sorted keys: Postgres jsonb doesn't keep the order they were written in */
const canonical = (value: unknown) =>
  JSON.stringify(value, (_key, v) =>
    v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1))) : v
  )

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const where = args.users.length ? { user: { handles: { some: { handle: { in: args.users } } } } } : {}
  const tally = { pages: 0, pagesChanged: 0, slots: 0, slotsChanged: 0, failed: [] as string[] }

  let cursor: string | undefined
  for (;;) {
    const profiles = await db.profile.findMany({
      where,
      orderBy: { userId: 'asc' },
      take: BATCH,
      ...(cursor && { cursor: { userId: cursor }, skip: 1 }),
      select: {
        userId: true,
        customTemplate: true,
        pageArtifact: true,
        compiledTemplate: true,
        widgetSlot: true,
        user: { select: { primaryHandle: true } },
      },
    })
    if (profiles.length === 0) break
    cursor = profiles[profiles.length - 1].userId

    for (const profile of profiles) {
      const who = profile.user.primaryHandle ?? profile.userId

      // Only pages saved through the editor have a stored copy; older rows compile as they're shown
      if (profile.customTemplate?.trim() && (profile.pageArtifact || profile.compiledTemplate)) {
        tally.pages++
        const result = await compileForEditor(profile.customTemplate)
        if (!result.ok) {
          tally.failed.push(`${who} (page): ${result.body.errors[0]}`)
        } else {
          const artifact = serializeArtifact(artifactFor(result.compiled))
          if (artifact !== profile.pageArtifact || profile.compiledTemplate !== null) {
            tally.pagesChanged++
            console.log(`page  ${who}${profile.compiledTemplate !== null ? ' (from its old copy)' : ''}`)
            if (args.apply) {
              await db.profile.update({
                where: { userId: profile.userId },
                data: { pageArtifact: artifact, compiledTemplate: Prisma.DbNull },
              })
            }
          }
        }
      }

      const slot = storedSlot(profile.widgetSlot)
      if (slot) {
        tally.slots++
        const result = compileWidgetSlot(slot.source)
        if (!result.ok) {
          tally.failed.push(`${who} (widget slot): ${result.error}`)
        } else if (canonical([result.staticHTML, result.islands]) !== canonical([slot.staticHTML, slot.islands])) {
          tally.slotsChanged++
          console.log(`slot  ${who}`)
          if (args.apply) {
            const next = { ...slot, staticHTML: result.staticHTML, islands: result.islands }
            await db.profile.update({ where: { userId: profile.userId }, data: { widgetSlot: JSON.parse(JSON.stringify(next)) } })
          }
        }
      }
    }
  }

  console.log(
    `\n${tally.pagesChanged} of ${tally.pages} pages and ${tally.slotsChanged} of ${tally.slots} widget slots ` +
      (args.apply ? 'recompiled.' : 'would change (dry run; --apply to store them).')
  )
  if (tally.failed.length) {
    console.log(`\nNo longer compile, left as they were (${tally.failed.length}):`)
    for (const line of tally.failed) console.log(`  ${line}`)
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
