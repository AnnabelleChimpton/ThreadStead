#!/usr/bin/env npx tsx

/**
 * Migrate User DID mappings from the legacy on-disk file into Postgres.
 *
 * ONE-TIME (idempotent, re-runnable) production migration. Reads the existing
 * .threadstead-user-dids.json (respecting its encryption via loadUserDIDMappings)
 * and UPSERTS every mapping into the new UserDID table, preserving
 * did / userHash / publicKey / secretKey EXACTLY.
 *
 * SAFETY:
 *   - Never overwrites an existing row's identity (upsert `update: {}`), so a user
 *     already migrated is left byte-identical — re-running is a no-op for them.
 *   - Skips old did:key rows (never migrated to did:web) with a warning.
 *   - Only imports rows whose userId exists in the User table (FK requirement);
 *     orphaned file entries are reported, not inserted.
 *
 * Usage:
 *   npx tsx scripts/migrate-user-dids-to-db.ts           # apply
 *   npx tsx scripts/migrate-user-dids-to-db.ts --dry-run # report only, no writes
 */

// Load environment variables
import { loadEnvConfig } from '@next/env'
const projectDir = process.cwd()
loadEnvConfig(projectDir)

import {
  loadUserDIDMappings,
  encryptUserSecretKey,
  type UserDIDMapping,
} from '@/lib/api/did/server-did-client'
import { db } from '@/lib/config/database/connection'

async function migrate() {
  const dryRun = process.argv.includes('--dry-run')

  console.log('🔐 Migrating User DIDs from legacy file into Postgres (UserDID table)')
  console.log('====================================================================')
  if (dryRun) console.log('   (dry-run: no writes will be performed)\n')

  const mappings = await loadUserDIDMappings()
  console.log(`📊 Found ${mappings.length} user DID mapping(s) in the legacy file`)

  if (mappings.length === 0) {
    console.log('✅ Nothing to migrate (empty or missing legacy file).')
    return
  }

  let inserted = 0
  let alreadyPresent = 0
  let skippedDidKey = 0
  let skippedNoUser = 0
  let failed = 0

  for (const mapping of mappings as UserDIDMapping[]) {
    // Skip old did:key format — those were never valid did:web identities.
    if (mapping.did.startsWith('did:key:')) {
      console.warn(`   ⚠️ Skipping did:key mapping for user ${mapping.userId} (${mapping.did})`)
      skippedDidKey++
      continue
    }

    try {
      // FK safety: the UserDID.userId references User.id.
      const user = await db.user.findUnique({ where: { id: mapping.userId }, select: { id: true } })
      if (!user) {
        console.warn(`   ⚠️ Skipping ${mapping.userId}: no matching User row (orphaned file entry)`)
        skippedNoUser++
        continue
      }

      const existing = await db.userDID.findUnique({ where: { userId: mapping.userId } })
      if (existing) {
        // Preserve the already-migrated identity EXACTLY. Do not overwrite.
        alreadyPresent++
        console.log(`   ✓ Already in DB: ${mapping.userId} -> ${existing.did}`)
        continue
      }

      if (dryRun) {
        console.log(`   [dry-run] would insert: ${mapping.userId} -> ${mapping.did}`)
        inserted++
        continue
      }

      await db.userDID.upsert({
        where: { userId: mapping.userId },
        create: {
          userId: mapping.userId,
          did: mapping.did,
          userHash: mapping.userHash,
          publicKeyMultibase: mapping.publicKey, // base64url public key (historical column name)
          secretKeyEncrypted: encryptUserSecretKey(mapping.secretKey),
        },
        update: {}, // never mutate an existing identity
      })

      inserted++
      console.log(`   ✅ Imported: ${mapping.userId} -> ${mapping.did}`)
    } catch (error) {
      failed++
      console.error(`   ❌ Failed to import ${mapping.userId}:`, error instanceof Error ? error.message : error)
    }
  }

  console.log('\n────────────────────────────────────────────')
  console.log(`   Imported / would-import : ${inserted}`)
  console.log(`   Already present         : ${alreadyPresent}`)
  console.log(`   Skipped (did:key)       : ${skippedDidKey}`)
  console.log(`   Skipped (no User row)   : ${skippedNoUser}`)
  console.log(`   Failed                  : ${failed}`)
  console.log('────────────────────────────────────────────')

  if (failed > 0) {
    console.error('\n❌ Completed with failures — review the log above and re-run (safe/idempotent).')
    process.exit(1)
  }

  console.log('\n✅ Migration complete. The DB is now authoritative for user DIDs.')
  console.log('   The legacy file remains as a read-only transition fallback and can be')
  console.log('   removed once all instances confirm every user is present in the DB.')
}

migrate()
  .catch(error => {
    console.error('❌ Migration script failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
