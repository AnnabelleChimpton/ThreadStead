/**
 * Encrypts the residents' DID secret keys that were stored in plaintext
 * (FUTURE_IMPROVEMENTS D1: on prod every UserDID row was "plain:", because
 * THREADSTEAD_KEY_ENCRYPTION_KEY was never set). These keys sign each
 * resident's requests to Ring Hub, so a copy of the database could sign as
 * anyone. Run by scripts/encrypt-user-did-keys.ts.
 *
 * Each row is only rewritten when:
 *  - its secret really is the resident's: the public key made from it
 *    matches the one stored (and published in their DID document);
 *  - the sealed value decrypts back to the same secret;
 *  - the row still holds what was read (a key that changed meanwhile is left).
 * Nothing a resident or Ring Hub sees changes: same DID, same public key.
 */
import * as ed from '@noble/ed25519'
import type { PrismaClient } from '@prisma/client'
import { fromBase64Url, toBase64Url } from '@/lib/utils/encoding/base64url'
import { decryptUserSecretKey, sealUserSecretKey } from './server-did-client'

/** The key has to be strong itself: it's stretched with one SHA-256 (server-did-client.ts) */
export const MIN_KEY_LENGTH = 32

export interface SealReport {
  alreadyEncrypted: number
  sealed: number
  /** Rows whose secret doesn't make their public key: left as they are, for a person to look at */
  mismatched: string[]
  /** Changed while this ran, or failed: left as they are */
  skipped: string[]
}

export async function sealUserKeys(db: Pick<PrismaClient, 'userDID'>, { apply }: { apply: boolean }): Promise<SealReport> {
  const key = process.env.THREADSTEAD_KEY_ENCRYPTION_KEY ?? ''
  if (key.length < MIN_KEY_LENGTH) {
    throw new Error(`THREADSTEAD_KEY_ENCRYPTION_KEY has to be set, ${MIN_KEY_LENGTH} characters at least (openssl rand -base64 32).`)
  }

  const report: SealReport = { alreadyEncrypted: 0, sealed: 0, mismatched: [], skipped: [] }
  const rows = await db.userDID.findMany({ select: { userId: true, publicKeyMultibase: true, secretKeyEncrypted: true } })

  // Anything encrypted before has to open with this key, checked before
  // anything is written: with two keys, some residents could never sign
  const encrypted = rows.filter((row) => row.secretKeyEncrypted.startsWith('enc:v1:'))
  for (const row of encrypted) {
    try {
      decryptUserSecretKey(row.secretKeyEncrypted)
    } catch {
      throw new Error(`${row.userId}'s key is already encrypted, and THREADSTEAD_KEY_ENCRYPTION_KEY doesn't open it. Nothing was changed.`)
    }
  }
  report.alreadyEncrypted = encrypted.length

  for (const row of rows) {
    if (row.secretKeyEncrypted.startsWith('enc:v1:')) continue
    try {
      const secret = decryptUserSecretKey(row.secretKeyEncrypted)
      const publicKey = toBase64Url(await ed.getPublicKeyAsync(fromBase64Url(secret)))
      if (publicKey !== row.publicKeyMultibase) {
        report.mismatched.push(row.userId)
        continue
      }
      const sealed = sealUserSecretKey(secret)
      if (decryptUserSecretKey(sealed) !== secret) throw new Error('sealed key did not decrypt to the same secret')
      if (!apply) {
        report.sealed++
        continue
      }
      const { count } = await db.userDID.updateMany({
        where: { userId: row.userId, secretKeyEncrypted: row.secretKeyEncrypted },
        data: { secretKeyEncrypted: sealed },
      })
      if (count === 1) report.sealed++
      else report.skipped.push(row.userId)
    } catch {
      report.skipped.push(row.userId)
    }
  }
  return report
}
