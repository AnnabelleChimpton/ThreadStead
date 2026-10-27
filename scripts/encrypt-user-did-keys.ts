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
 *  4. A last-resort copy of the table, moved to your own machine and off
 *     the server (it's plaintext: delete it once rings have worked for a week):
 *       PGPASSWORD=… pg_dump -h localhost -U threadstead_admin_db -d threadstead_db -t '"UserDID"' > userdid-before-encrypt.sql
 *
 * Then a dry run (counts only, writes nothing), and the real one:
 *   npx tsx scripts/encrypt-user-did-keys.ts
 *   npx tsx scripts/encrypt-user-did-keys.ts --apply
 *
 * Running it again is safe: encrypted rows are left alone. It never prints
 * a key.
 *
 * To undo (keys back to plaintext, with the same key still in .env):
 *   npx tsx scripts/encrypt-user-did-keys.ts --decrypt           # dry run
 *   npx tsx scripts/encrypt-user-did-keys.ts --decrypt --apply
 */
import './load-env'
import { db } from '@/lib/config/database/connection'
import { sealUserKeys, unsealUserKeys } from '@/lib/api/did/seal-user-keys'

async function main() {
  const apply = process.argv.includes('--apply')
  const undo = process.argv.includes('--decrypt')
  const report = undo ? await unsealUserKeys(db, { apply }) : await sealUserKeys(db, { apply })

  if (undo) {
    console.log(apply ? 'Back to plaintext:' : 'Dry run. Would put back to plaintext:', report.changed)
  } else {
    console.log(apply ? 'Encrypted:' : 'Dry run. Would encrypt:', report.changed)
    console.log('Already encrypted:', report.alreadyEncrypted)
  }
  if (report.mismatched.length) {
    console.log(`Left alone, secret doesn't match the public key (${report.mismatched.length}):`, report.mismatched.join(', '))
  }
  if (report.skipped.length) {
    console.log(`Left alone, changed while running or failed (${report.skipped.length}); run it again:`, report.skipped.join(', '))
  }
  if (!apply) console.log(`Nothing was written. Add --apply to ${undo ? 'decrypt' : 'encrypt'}.`)
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
