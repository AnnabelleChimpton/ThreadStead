#!/usr/bin/env tsx
/**
 * Give one resident a new signing key, keeping their DID and rings
 * (lib/api/did/rotate-user-key.ts says how Ring Hub picks it up).
 *
 *   npx tsx scripts/rotate-user-did-key.ts --handle chimpton           # dry run
 *   npx tsx scripts/rotate-user-did-key.ts --handle chimpton --apply
 *
 * After --apply: wait 5 minutes (the DID document's cache), then have them
 * do one signed thing (open "My rings"). It never prints a secret.
 */
import './load-env'
import { db } from '@/lib/config/database/connection'
import { SITE_NAME } from '@/lib/config/site/constants'
import { rotateUserKey } from '@/lib/api/did/rotate-user-key'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : undefined
}

async function main() {
  const apply = process.argv.includes('--apply')
  const handle = arg('--handle')
  if (!handle) throw new Error('Say whose key: --handle <name>')
  const owner = await db.handle.findFirst({ where: { handle, host: SITE_NAME }, select: { userId: true } })
  if (!owner) throw new Error(`There's nobody called ${handle} here.`)

  const report = await rotateUserKey(db, { userId: owner.userId, apply })
  console.log('Resident:', handle)
  console.log('DID (stays the same):', report.did)
  console.log('Public key now:', report.oldPublicKey)
  if (!apply) {
    console.log('Dry run. Nothing was written. Add --apply to give them a new key.')
    return
  }
  console.log('New public key:', report.newPublicKey)
  console.log('Done. Wait 5 minutes, then open "My rings" as them: Ring Hub swaps to the new key then.')
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
