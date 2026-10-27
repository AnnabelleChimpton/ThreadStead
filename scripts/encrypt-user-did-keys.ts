#!/usr/bin/env tsx
/**
 * Encrypt the residents' DID secret keys stored in plaintext
 * (lib/api/did/seal-user-keys.ts says what's checked first).
 *
 * Before running it on the server:
 *  1. Make the key and keep a copy somewhere safe, off the server (a
 *     password manager). Without it no resident can post to a ring:
 *       openssl rand -base64 32
 *  2. Put it in .env as THREADSTEAD_KEY_ENCRYPTION_KEY="…"
 *  3. Restart the app, so it can read encrypted keys before any exist:
 *       NODE_ENV=production pm2 restart threadstead --update-env
 *
 * Then a dry run (counts only, writes nothing), and the real one:
 *   npx tsx scripts/encrypt-user-did-keys.ts
 *   npx tsx scripts/encrypt-user-did-keys.ts --apply
 *
 * Running it again is safe: encrypted rows are left alone. It never prints
 * a key.
 */
import './load-env'
import { db } from '@/lib/config/database/connection'
import { sealUserKeys } from '@/lib/api/did/seal-user-keys'

async function main() {
  const apply = process.argv.includes('--apply')
  const report = await sealUserKeys(db, { apply })

  console.log(apply ? 'Encrypted:' : 'Dry run. Would encrypt:', report.sealed)
  console.log('Already encrypted:', report.alreadyEncrypted)
  if (report.mismatched.length) {
    console.log(`Left alone, secret doesn't match the public key (${report.mismatched.length}):`, report.mismatched.join(', '))
  }
  if (report.skipped.length) {
    console.log(`Left alone, changed while running or failed (${report.skipped.length}); run it again:`, report.skipped.join(', '))
  }
  if (!apply) console.log('Nothing was written. Add --apply to encrypt.')
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
