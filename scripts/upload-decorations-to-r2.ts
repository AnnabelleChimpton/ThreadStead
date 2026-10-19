#!/usr/bin/env tsx
/**
 * Upload a folder of sprites to the catalog, the same way admin's "New from
 * PNG" does: the filename gives the item, type and frame count
 * (design/pixel-art/README.md), the checks run, the PNG is stored as the
 * item's next version ({itemId}.v{n}.png) and the item is pointed at it with
 * its width, height and frames. New items start ADMIN_ONLY.
 *
 * Dry run by default: checks every file and says what it would do.
 *
 *   npx tsx scripts/upload-decorations-to-r2.ts                        # check design/pixel-art/export/
 *   npx tsx scripts/upload-decorations-to-r2.ts --dir path/to/pngs     # another folder
 *   npx tsx scripts/upload-decorations-to-r2.ts --apply                # upload and update the catalog
 *   npx tsx scripts/upload-decorations-to-r2.ts --apply --as annabelle # new ADMIN_ONLY items show in your editor
 *   npx tsx scripts/upload-decorations-to-r2.ts --apply --allow-off-palette
 *
 * With R2_LOCAL_DIR set (development), files go to public/<dir> instead of the bucket.
 */
import './load-env'
import { existsSync, readdirSync, readFileSync } from 'fs'
import path from 'path'
import { db } from '@/lib/config/database/connection'
import { publishSprite, reviewSprite, SpriteError } from '@/lib/pixel-homes/decoration-art'

function parseArgs(argv: string[]) {
  const args = { apply: false, allowOffPalette: false, dir: path.join(process.cwd(), 'design/pixel-art/export'), as: '' }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--apply') args.apply = true
    else if (a === '--allow-off-palette') args.allowOffPalette = true
    else if (a === '--dir') args.dir = path.resolve(argv[++i])
    else if (a === '--as') args.as = argv[++i].replace(/^@/, '').toLowerCase()
    else if (a === '--help' || a === '-h') {
      console.log('Usage: npx tsx scripts/upload-decorations-to-r2.ts [--dir <folder>] [--apply] [--as <handle>] [--allow-off-palette]')
      process.exit(0)
    } else {
      console.error(`Unknown argument: ${a}`)
      process.exit(1)
    }
  }
  return args
}

async function adminIdFor(handle: string): Promise<string | null> {
  if (!handle) return null
  const row = await db.handle.findFirst({ where: { handle }, select: { user: { select: { id: true, role: true } } } })
  if (!row || row.user.role !== 'admin') throw new Error(`@${handle} isn't an admin.`)
  return row.user.id
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!existsSync(args.dir)) {
    console.log(`No folder at ${args.dir}. Put sprites there or pass --dir.`)
    return
  }
  const files = readdirSync(args.dir).filter((f) => f.toLowerCase().endsWith('.png')).sort()
  console.log(`${files.length} PNGs in ${args.dir}${args.apply ? '' : ' (dry run)'}\n`)
  const adminId = await adminIdFor(args.as)

  let ok = 0
  let failed = 0
  for (const file of files) {
    const input = readFileSync(path.join(args.dir, file))
    try {
      const review = await reviewSprite(file, input)
      const { name, result } = review
      const notes = result.checks.filter((c) => c.status !== 'pass').map((c) => `${c.status}: ${c.message}`)
      const existing = await db.decorationItem.findUnique({ where: { itemId: name.itemId }, select: { id: true } })
      const what = `${name.itemId} (${name.type}, ${result.frameWidth}×${result.height}${result.frames > 1 ? `, ${result.frames} frames` : ''}) ${existing ? 'new version' : 'new item'}`
      if (result.blocked || (result.needsOverride && !args.allowOffPalette)) {
        failed++
        console.log(`✗ ${file}: ${what}\n    ${notes.join('\n    ')}`)
        continue
      }
      if (args.apply) {
        const { version } = await publishSprite({ filename: file, input, allowOffPalette: args.allowOffPalette, adminId })
        console.log(`✓ ${file}: ${what}, saved as v${version}`)
      } else {
        console.log(`· ${file}: would save ${what}`)
      }
      for (const note of notes) console.log(`    ${note}`)
      ok++
    } catch (error) {
      if (!(error instanceof SpriteError)) throw error
      failed++
      console.log(`✗ ${file}: ${error.message}`)
    }
  }
  console.log(`\n${ok} ${args.apply ? 'saved' : 'ready'}, ${failed} not`)
  if (failed > 0) process.exitCode = 1
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
