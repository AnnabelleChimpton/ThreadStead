#!/usr/bin/env tsx
/**
 * Rewrite pages made with the old Visual Builder (components carrying
 * data-x / data-y / data-component-size) into plain HTML and CSS that puts
 * every block in the same place, so the positioning code can be deleted.
 * The conversion is lib/templates/migrations/visual-builder-positioning.ts.
 *
 * Dry run by default: reads the database and writes nothing.
 *
 *   npx tsx scripts/convert-visual-builder-pages.ts                # what would change, page by page
 *   npx tsx scripts/convert-visual-builder-pages.ts --apply        # convert them
 *   npx tsx scripts/convert-visual-builder-pages.ts --user alice   # one page (repeatable)
 *
 * With --apply each page's current version goes into its History first
 * (Saved "before the old Visual Builder layout was converted"), and the page
 * is skipped if that restore point isn't there. The page's CSS is left alone.
 * A page whose source has nothing to convert but whose compiled copy still
 * carries positioning data is just recompiled. Look at every page it lists
 * afterwards; the warnings say what to look for.
 */
import './load-env'
import { db } from '@/lib/config/database/connection'
import { compileForEditor } from '@/lib/templates/compilation/compile-for-editor'
import { snapshotProfileBeforeSave } from '@/lib/templates/revisions/template-revisions'
import { convertVisualBuilderPositioning } from '@/lib/templates/migrations/visual-builder-positioning'

function parseArgs(argv: string[]) {
  const args = { apply: false, users: [] as string[] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--apply') args.apply = true
    else if (a === '--user') args.users.push(argv[++i].replace(/^@/, '').toLowerCase())
    else if (a === '--help' || a === '-h') {
      console.log('Usage: npx tsx scripts/convert-visual-builder-pages.ts [--apply] [--user <handle>]...')
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

  const rows = await db.$queryRaw<Array<{ userId: string }>>`
    SELECT "userId" FROM "Profile"
    WHERE coalesce("customTemplate", '') ~ 'data-(x|y|component-size)='
       OR coalesce("compiledTemplate"::text, '') LIKE '%"_positioning"%'
       OR coalesce("compiledTemplate"::text, '') LIKE '%"_size"%'`
  const profiles = await db.profile.findMany({
    where: { userId: { in: rows.map((r) => r.userId) } },
    select: {
      userId: true,
      templateMode: true,
      customTemplate: true,
      user: { select: { primaryHandle: true, handles: { select: { handle: true }, take: 1 } } },
    },
  })

  const handleOf = (p: (typeof profiles)[number]) =>
    p.user.handles[0]?.handle ?? p.user.primaryHandle?.split('@')[0] ?? p.userId
  const chosen = args.users.length ? profiles.filter((p) => args.users.includes(handleOf(p).toLowerCase())) : profiles

  console.log(`${chosen.length} page${chosen.length === 1 ? '' : 's'} to convert${args.apply ? '' : ' (dry run: nothing is written)'}\n`)

  let converted = 0
  let failed = 0
  for (const profile of chosen) {
    const handle = handleOf(profile)
    const source = profile.customTemplate ?? ''
    const result = convertVisualBuilderPositioning(source)
    const recompileOnly = result.source === source

    console.log(`@${handle} (${profile.templateMode}) /resident/${handle}`)
    if (recompileOnly) console.log('  nothing in the source to convert; the compiled copy is rebuilt')
    for (const change of result.changes) console.log(`  ${change}`)
    for (const warning of result.warnings) console.log(`  CHECK: ${warning}`)

    const compiled = await compileForEditor(result.source)
    if (!compiled.ok) {
      console.log(`  SKIPPED: the converted page doesn't compile: ${compiled.body.errors.join('; ')}`)
      failed++
      continue
    }
    for (const warning of compiled.compiled.warnings) console.log(`  editor warning: ${warning}`)

    if (args.apply) {
      await snapshotProfileBeforeSave(profile.userId, 'vb-convert')
      const restorePoint = await db.profileTemplateRevision.findFirst({
        where: { userId: profile.userId },
        orderBy: { createdAt: 'desc' },
        select: { customTemplate: true },
      })
      if ((restorePoint?.customTemplate ?? null) !== profile.customTemplate) {
        console.log("  SKIPPED: couldn't save the current version to History first")
        failed++
        continue
      }
      await db.profile.update({
        where: { userId: profile.userId },
        data: {
          customTemplate: compiled.template,
          compiledTemplate: JSON.parse(JSON.stringify(compiled.compiled)),
          templateCompiledAt: new Date(),
        },
      })
      console.log('  converted; the old version is in History')
    }
    converted++
    console.log('')
  }

  console.log(
    args.apply
      ? `Converted ${converted}, skipped ${failed}. Look at each page above.`
      : `Would convert ${converted}${failed ? `, skip ${failed}` : ''}. Run again with --apply to do it.`
  )
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
