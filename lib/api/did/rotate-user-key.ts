/**
 * Gives a resident a new signing key, keeping their DID: for a key that got
 * out (2026-10-27: one resident's had been in the public repo's history).
 *
 * The DID document starts publishing the new public key at once (it's read
 * from this row). Ring Hub keeps checking the old one until a signature
 * fails against it, then re-reads the DID document and swaps
 * (tests/federation/key-rotation.itest.ts). So after a change: wait out the
 * document's 5-minute cache, then have the resident do one signed thing
 * ("My rings"). From then on the old key is refused. The DID, and with it
 * every ring they own or belong to, stays the same.
 */
import crypto from 'crypto'
import type { PrismaClient } from '@prisma/client'
import { decryptUserSecretKey, sealUserSecretKey } from './server-did-client'
import { MIN_KEY_LENGTH } from './seal-user-keys'

export interface RotationReport {
  did: string
  oldPublicKey: string
  /** Set when applied */
  newPublicKey?: string
}

/** A new Ed25519 key as this site stores them: base64url of the raw seed and of the raw public key */
function newKeypair() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519')
  const pkcs8 = privateKey.export({ format: 'der', type: 'pkcs8' }) as Buffer
  const spki = publicKey.export({ format: 'der', type: 'spki' }) as Buffer
  return {
    secret: pkcs8.subarray(pkcs8.length - 32).toString('base64url'),
    publicKey: spki.subarray(spki.length - 32).toString('base64url'),
  }
}

export async function rotateUserKey(
  db: Pick<PrismaClient, 'userDID'>,
  { userId, apply }: { userId: string; apply: boolean }
): Promise<RotationReport> {
  // Stored encrypted, like every other key since 2026-10-27
  if ((process.env.THREADSTEAD_KEY_ENCRYPTION_KEY ?? '').length < MIN_KEY_LENGTH) {
    throw new Error('THREADSTEAD_KEY_ENCRYPTION_KEY has to be set, so the new key is stored encrypted.')
  }
  const row = await db.userDID.findUnique({ where: { userId }, select: { did: true, publicKeyMultibase: true } })
  if (!row) throw new Error(`${userId} has no signing key to replace.`)

  const report: RotationReport = { did: row.did, oldPublicKey: row.publicKeyMultibase }
  if (!apply) return report

  const next = newKeypair()
  const sealed = sealUserSecretKey(next.secret)
  if (decryptUserSecretKey(sealed) !== next.secret) throw new Error('The new key did not decrypt to itself. Nothing was changed.')

  // Only if the key is still the one just read
  const { count } = await db.userDID.updateMany({
    where: { userId, publicKeyMultibase: row.publicKeyMultibase },
    data: { publicKeyMultibase: next.publicKey, secretKeyEncrypted: sealed },
  })
  if (count !== 1) throw new Error('Their key changed while this ran. Nothing was changed; run it again.')
  return { ...report, newPublicKey: next.publicKey }
}
