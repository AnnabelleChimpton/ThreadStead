/**
 * Server-side DID Client for ThreadStead
 * 
 * Manages server keypairs and DID operations for Ring Hub authentication
 * Unlike the browser did-client.ts, this works in Node.js server context
 */

import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha512";
import { toBase64Url, fromBase64Url } from "@/lib/utils/encoding/base64url";
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import { join } from 'path';
import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import bs58 from 'bs58';
import { db } from '@/lib/config/database/connection';

// Configure @noble/ed25519 with SHA-512 (required)
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

/**
 * Compute the deterministic, privacy-preserving user hash used in did:web:DOMAIN:users:HASH.
 *
 * IMPORTANT — FROZEN HASHING: String() intentionally reproduces historical hashing.
 * The original code was `createHash('sha256').update(userId + process.env.THREADSTEAD_DID_SALT || 'default-salt')`.
 * Because `+` binds tighter than `||`, that expression evaluated to the hash INPUT
 * `userId + (process.env.THREADSTEAD_DID_SALT ?? 'undefined-as-string')` and the `|| 'default-salt'`
 * fallback applied to the (always-truthy) hash string, so 'default-salt' was DEAD and never hashed.
 *   - salt SET   -> input was `userId + salt`
 *   - salt UNSET -> input was the literal string `userId + "undefined"` (String(undefined) === 'undefined')
 * `String(process.env.THREADSTEAD_DID_SALT)` reproduces BOTH cases byte-for-byte.
 * Changing this (e.g. introducing 'default-salt') would reassign every user's DID and lock them
 * out of their rings on the hub. Do NOT change it.
 */
export function computeUserHash(userId: string): string {
  return createHash('sha256')
    .update(userId + String(process.env.THREADSTEAD_DID_SALT))
    .digest('hex')
    .slice(0, 16);
}

/**
 * Convert base64url public key to multibase format for Ring Hub
 */
export function publicKeyToMultibase(publicKeyBase64Url: string): string {
  const publicKeyBytes = fromBase64Url(publicKeyBase64Url);
  const multicodecPrefix = Buffer.from([0xed, 0x01]); // Ed25519 prefix
  const multicodecKey = Buffer.concat([multicodecPrefix, publicKeyBytes]);
  return 'z' + bs58.encode(multicodecKey);
}

export type ServerKeypair = { 
  publicKey: string; 
  secretKey: string; 
  did: string;
  created: string;
};

export type UserDIDMapping = {
  userId: string;
  did: string;
  userHash: string; // For DID document publishing path
  publicKey: string;
  secretKey: string;
  created: string;
};

const SERVER_KEYPAIR_FILE = '.threadstead-server-keypair.json';
const USER_DID_MAPPINGS_FILE = '.threadstead-user-dids.json';

interface EncryptedStorage {
  version: string;
  algorithm: string;
  encrypted_data: string;
  salt: string;
  iv: string;
}

interface KeyStorageOptions {
  encrypt?: boolean;
  encryptionKey?: string;
}

/**
 * Generate a new Ed25519 keypair for the ThreadStead server instance
 */
export async function generateServerKeypair(domain: string): Promise<ServerKeypair> {
  const secret = ed.utils.randomPrivateKey(); // Uint8Array(32)
  const publicKey = await ed.getPublicKeyAsync(secret); // Uint8Array(32)
  
  const skb64u = toBase64Url(secret);
  const pkb64u = toBase64Url(publicKey);
  
  // Create did:web for this domain
  const did = `did:web:${domain.replace(/:/g, '%3A')}`;
  
  const keypair: ServerKeypair = {
    publicKey: pkb64u,
    secretKey: skb64u,
    did,
    created: new Date().toISOString()
  };
  
  // Store securely (in production, use proper secret management)
  await storeServerKeypair(keypair);
  
  return keypair;
}

/**
 * Get the existing server keypair or generate a new one
 */
export async function getOrCreateServerKeypair(): Promise<ServerKeypair> {
  try {
    const existing = await loadServerKeypair();
    if (existing) {
      return existing;
    }
  } catch (error) {
    // File doesn't exist or is corrupted, generate new keypair
  }
  
  // Determine domain from environment
  const domain = getDomainFromEnvironment();
  return await generateServerKeypair(domain);
}

/**
 * Get the current server DID (without exposing private key)
 */
export async function getServerDID(): Promise<string> {
  const keypair = await getOrCreateServerKeypair();
  return keypair.did;
}

/**
 * Sign a message with the server's private key
 */
export async function signMessageAsServer(message: string): Promise<string> {
  const keypair = await getOrCreateServerKeypair();
  const secret = fromBase64Url(keypair.secretKey);
  const sig = await ed.signAsync(new TextEncoder().encode(message), secret);
  return toBase64Url(sig);
}

/**
 * Convert a persisted UserDID DB row into the in-memory UserDIDMapping shape.
 * Decrypts the secret key using the same encryption util the file store used.
 */
function rowToMapping(row: {
  userId: string;
  did: string;
  userHash: string;
  publicKeyMultibase: string;
  secretKeyEncrypted: string;
  createdAt: Date;
}): UserDIDMapping {
  return {
    userId: row.userId,
    did: row.did,
    userHash: row.userHash,
    // NOTE: publicKeyMultibase column stores the base64url public key (historical
    // field naming); callers convert to multibase on demand via publicKeyToMultibase.
    publicKey: row.publicKeyMultibase,
    secretKey: decryptUserSecretKey(row.secretKeyEncrypted),
    created: row.createdAt.toISOString(),
  };
}

/**
 * Generate or get a DID for a ThreadStead user.
 *
 * ROOT-CAUSE FIX: user DID keypairs now live in Postgres (UserDID table), not the
 * legacy .threadstead-user-dids.json file. Per-row reads/writes (upsert) replace the
 * whole-file rewrite, fixing the race + non-atomic-write data-loss that silently
 * re-minted every user's key on any file read/parse/decrypt error.
 *
 * LOAD-FAILURE SEMANTICS (critical for identity preservation):
 *   - DB read fails  -> THROW (fatal). Never return empty, never mint. A transient DB
 *                       error must NOT be mistaken for "new user" and rotate the key.
 *   - Row exists     -> return it EXACTLY. Never regenerate.
 *   - Row missing but present in legacy file -> import that ONE row on the fly
 *                       (transition safety for a not-yet-migrated user) and log.
 *   - Genuinely new user (no row, not in file) -> mint a fresh keypair, log prominently.
 */
export async function getOrCreateUserDID(userId: string): Promise<UserDIDMapping> {
  // Read the user's row. A DB failure here is FATAL — do not swallow.
  let existing;
  try {
    existing = await db.userDID.findUnique({ where: { userId } });
  } catch (error) {
    throw new Error(
      `FATAL: failed to read UserDID for user ${userId} from database. Refusing to mint a ` +
      `replacement key (would rotate the user's identity and lock them out of their rings). ` +
      `Original error: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  if (existing) {
    // Row exists — return it EXACTLY. Never regenerate the keypair.
    return rowToMapping(existing);
  }

  // No DB row. Before minting, check the legacy file for a not-yet-migrated user.
  const legacy = await findUserInLegacyFile(userId);
  if (legacy) {
    console.warn(
      `⚠️ UserDID for ${userId} missing from DB but present in legacy file; importing on-the-fly ` +
      `to avoid re-minting the key. Run scripts/migrate-user-dids-to-db.ts to persist all users.`
    );
    try {
      const saved = await db.userDID.upsert({
        where: { userId },
        create: {
          userId,
          did: legacy.did,
          userHash: legacy.userHash,
          publicKeyMultibase: legacy.publicKey,
          secretKeyEncrypted: encryptUserSecretKey(legacy.secretKey),
        },
        update: {}, // never overwrite an existing row's identity
      });
      return rowToMapping(saved);
    } catch (error) {
      // If the upsert races/fails, still return the legacy identity so the user isn't re-minted.
      console.error(`Failed to persist legacy UserDID for ${userId}; using file value:`, error);
      return legacy;
    }
  }

  // Genuinely new user: no DB row, no legacy entry. Minting is allowed here ONLY.
  console.warn(`🆕 Minting a NEW DID keypair for user ${userId} (no existing DB row or legacy file entry).`);

  const secret = ed.utils.randomPrivateKey();
  const publicKey = await ed.getPublicKeyAsync(secret);

  const skb64u = toBase64Url(secret);
  const pkb64u = toBase64Url(publicKey);

  const userHash = computeUserHash(userId);
  const domain = getDomainFromEnvironment();
  const did = `did:web:${domain}:users:${userHash}`;

  try {
    const saved = await db.userDID.upsert({
      where: { userId },
      create: {
        userId,
        did,
        userHash,
        publicKeyMultibase: pkb64u,
        secretKeyEncrypted: encryptUserSecretKey(skb64u),
      },
      // If a concurrent request created the row first, keep THAT identity (no overwrite),
      // then we re-read below to return the winner.
      update: {},
    });
    return rowToMapping(saved);
  } catch (error) {
    throw new Error(
      `Failed to persist new UserDID for user ${userId}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Sign a message on behalf of a user
 */
export async function signMessageAsUser(userId: string, message: string): Promise<string> {
  const userDID = await getOrCreateUserDID(userId);
  const secret = fromBase64Url(userDID.secretKey);
  const sig = await ed.signAsync(new TextEncoder().encode(message), secret);
  return toBase64Url(sig);
}

/**
 * Get user DID without private key information
 */
export async function getUserDID(userId: string): Promise<string> {
  const userDID = await getOrCreateUserDID(userId);
  return userDID.did;
}

export interface DIDDocument {
  "@context": string[];
  id: string;
  verificationMethod: Array<{
    id: string;
    type: string;
    controller: string;
    publicKeyMultibase?: string;
    publicKeyBase64?: string;
  }>;
  authentication: string[];
  assertionMethod: string[];
  capabilityDelegation: string[];
  capabilityInvocation: string[];

  // Profile data (Tier 1: REQUIRED for federation)
  service?: Array<{
    id: string;
    type: string;
    serviceEndpoint: string;
  }>;

  // Profile data (Tier 2: CONDITIONAL - only if visibility = 'public')
  name?: string;              // Display name
  image?: string;             // Avatar URL
  alsoKnownAs?: string[];     // Alternative identifiers (handles, profile URLs)
}

/**
 * Multibase (z-base58btc, multicodec 0xed01 Ed25519) -> raw 32-byte public key -> base64url.
 * Inverse of publicKeyToMultibase.
 */
function multibaseToPublicKeyBase64Url(multibase: string): string {
  if (!multibase.startsWith('z')) {
    throw new Error(`Unsupported multibase prefix in server public key: ${multibase[0]}`);
  }
  const decoded = Buffer.from(bs58.decode(multibase.slice(1)));
  // Strip the 2-byte Ed25519 multicodec prefix (0xed 0x01).
  if (decoded.length < 2 || decoded[0] !== 0xed || decoded[1] !== 0x01) {
    throw new Error('Server public key multibase is not a valid Ed25519 multicodec value');
  }
  return toBase64Url(decoded.subarray(2));
}

/**
 * Resolve the server's published identity (DID + public key) from ENVIRONMENT — the
 * single source of truth for signing (RingHubClient.fromEnvironment uses the same env
 * private key). This guarantees the key published at /.well-known/did.json matches the
 * key we actually sign hub requests with.
 *
 * Order of preference for the public key:
 *   1. THREADSTEAD_PUBLIC_KEY_MULTIBASE (explicit)
 *   2. Derived from THREADSTEAD_PRIVATE_KEY_B64URL (the signing key)
 *
 * Throws if neither the DID nor any usable server key material is present in env.
 * NEVER mints a key — a fresh deploy with missing env must fail loudly, not publish a
 * random key unrelated to the signing key.
 */
async function getServerIdentityFromEnv(): Promise<{ did: string; publicKeyBase64Url: string }> {
  const did = process.env.THREADSTEAD_DID;
  if (!did) {
    throw new Error(
      'THREADSTEAD_DID is not set — cannot publish a server DID document. Refusing to mint a ' +
      'random server key. Configure the server identity env vars for this deployment.'
    );
  }

  const multibase = process.env.THREADSTEAD_PUBLIC_KEY_MULTIBASE;
  if (multibase) {
    return { did, publicKeyBase64Url: multibaseToPublicKeyBase64Url(multibase) };
  }

  const privB64 = process.env.THREADSTEAD_PRIVATE_KEY_B64URL;
  if (privB64) {
    // Derive the public key from the signing private key (guarantees they match).
    const secret = fromBase64Url(privB64);
    const publicKey = await ed.getPublicKeyAsync(secret);
    return { did, publicKeyBase64Url: toBase64Url(publicKey) };
  }

  throw new Error(
    'No server public key available: set THREADSTEAD_PUBLIC_KEY_MULTIBASE or ' +
    'THREADSTEAD_PRIVATE_KEY_B64URL. Refusing to mint a random server key.'
  );
}

/**
 * Generate DID document for did:web resolution.
 *
 * IDENTITY SOURCE OF TRUTH: derives the published server public key from ENV so the
 * /.well-known/did.json key always matches the key used to sign Ring Hub requests
 * (RingHubClient.fromEnvironment). Falls back to the local file keypair ONLY for local
 * dev when no server env identity is configured. NEVER auto-mints in the request path.
 */
export async function generateDIDDocument(): Promise<DIDDocument> {
  let did: string;
  let publicKeyBase64Url: string;

  const hasEnvIdentity =
    !!process.env.THREADSTEAD_DID &&
    (!!process.env.THREADSTEAD_PUBLIC_KEY_MULTIBASE || !!process.env.THREADSTEAD_PRIVATE_KEY_B64URL);

  if (hasEnvIdentity) {
    const env = await getServerIdentityFromEnv();
    did = env.did;
    publicKeyBase64Url = env.publicKeyBase64Url;
  } else {
    // Local-dev fallback: read the on-disk keypair if it already exists.
    // Do NOT auto-generate here — a missing key must surface as an error, not a fresh mint.
    const existing = await loadServerKeypair();
    if (!existing) {
      throw new Error(
        'No server identity configured. Set THREADSTEAD_DID and THREADSTEAD_PUBLIC_KEY_MULTIBASE ' +
        '(or THREADSTEAD_PRIVATE_KEY_B64URL), or provide a local ' + SERVER_KEYPAIR_FILE + ' for dev. ' +
        'Refusing to mint a random server key in the DID-serving path.'
      );
    }
    did = existing.did;
    publicKeyBase64Url = existing.publicKey;
  }

  const publicKeyBytes = fromBase64Url(publicKeyBase64Url);
  // Support both base64 and multibase formats for compatibility
  const publicKeyBase64 = Buffer.from(publicKeyBytes).toString('base64');
  const publicKeyMultibase = publicKeyToMultibase(publicKeyBase64Url);

  return {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/suites/ed25519-2020/v1"
    ],
    "id": did,
    "verificationMethod": [{
      "id": `${did}#key-1`,
      "type": "Ed25519VerificationKey2020",
      "controller": did,
      "publicKeyBase64": publicKeyBase64,
      "publicKeyMultibase": publicKeyMultibase
    }],
    "authentication": [`${did}#key-1`],
    "assertionMethod": [`${did}#key-1`],
    "capabilityDelegation": [`${did}#key-1`],
    "capabilityInvocation": [`${did}#key-1`]
  };
}

/**
 * Generate DID document for a user with privacy-aware profile data
 *
 * @param userDIDMapping - User's DID mapping from database
 * @param db - Prisma database client (optional - for profile data)
 * @returns Complete DID document with appropriate profile data based on privacy settings
 */
export async function generateUserDIDDocument(
  userDIDMapping: UserDIDMapping,
  db?: any
): Promise<DIDDocument> {
  // Convert base64url public key to multibase format for Ring Hub compatibility
  const publicKeyMultibase = publicKeyToMultibase(userDIDMapping.publicKey);

  // Base DID document with cryptographic verification (always present)
  const didDocument: DIDDocument = {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/suites/ed25519-2020/v1"
    ],
    "id": userDIDMapping.did,
    "verificationMethod": [{
      "id": `${userDIDMapping.did}#key-1`,
      "type": "Ed25519VerificationKey2020",
      "controller": userDIDMapping.did,
      "publicKeyMultibase": publicKeyMultibase
    }],
    "authentication": [`${userDIDMapping.did}#key-1`],
    "assertionMethod": [`${userDIDMapping.did}#key-1`],
    "capabilityDelegation": [`${userDIDMapping.did}#key-1`],
    "capabilityInvocation": [`${userDIDMapping.did}#key-1`]
  };

  // If database connection provided, add privacy-aware profile data
  if (db) {
    try {
      // Fetch user's handle (required for profile URL - Tier 1)
      const handle = await db.handle.findFirst({
        where: { userId: userDIDMapping.userId },
        orderBy: { id: 'asc' }
      });

      if (handle) {
        // Extract domain from DID (did:web:DOMAIN:users:hash)
        const domain = userDIDMapping.did.split(':')[2].replace(/%3A/g, ':');
        const profileUrl = `https://${domain}/resident/${handle.handle}`;

        // REQUIRED (Tier 1): Always include profile service endpoint
        didDocument.service = [{
          "id": `${userDIDMapping.did}#profile`,
          "type": "Profile",
          "serviceEndpoint": profileUrl
        }];

        // Fetch user's profile for privacy check (Tier 2)
        const profile = await db.profile.findUnique({
          where: { userId: userDIDMapping.userId },
          select: {
            visibility: true,
            displayName: true,
            avatarUrl: true
          }
        });

        // CONDITIONAL (Tier 2): Add profile data only if visibility is public
        if (profile?.visibility === 'public') {
          // Add display name
          if (profile.displayName) {
            didDocument.name = profile.displayName;
          }

          // Add avatar
          if (profile.avatarUrl) {
            didDocument.image = profile.avatarUrl;
          }

          // Add handle as alternative identifier
          didDocument.alsoKnownAs = [profileUrl];
        }
      }
    } catch (error) {
      // Log error but return base document - profile data is optional
      console.error('Failed to add profile data to DID document:', error);
    }
  }

  return didDocument;
}

/**
 * Get user DID mapping by hash (for DID document publishing).
 *
 * Reads from the authoritative DB. A DB failure THROWS (never silently returns null,
 * which the DID-serving route would surface as a 404 and hide stale-key breakage).
 * Falls back to the legacy file only for a hash not yet migrated.
 */
export async function getUserDIDMappingByHash(userHash: string): Promise<UserDIDMapping | null> {
  let row;
  try {
    row = await db.userDID.findUnique({ where: { userHash } });
  } catch (error) {
    throw new Error(
      `Failed to read UserDID by hash from database: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  if (row) {
    return rowToMapping(row);
  }

  // Transition safety: a not-yet-migrated user's hash may still only be in the legacy file.
  const mappings = await loadUserDIDMappings();
  return mappings.find(m => m.userHash === userHash) || null;
}

/**
 * Migrate existing ThreadStead user to DID system
 */
export async function migrateUserToDID(userId: string, existingPublicKey?: string): Promise<UserDIDMapping> {
  // getOrCreateUserDID already returns the existing DB/legacy identity if present,
  // and only mints for a genuinely new user.
  return await getOrCreateUserDID(userId);
}

// Encryption utilities for secure key storage

function getEncryptionKey(): string | null {
  // Check environment for encryption key
  return process.env.THREADSTEAD_KEY_ENCRYPTION_KEY || null;
}

function deriveKeyFromPassword(password: string, salt: Buffer): Buffer {
  return createHash('sha256').update(password + salt.toString('hex')).digest();
}

function encryptData(data: string, key?: string): EncryptedStorage {
  const encryptionKey = key || getEncryptionKey();
  if (!encryptionKey) {
    throw new Error('No encryption key available');
  }

  const salt = randomBytes(32);
  const iv = randomBytes(16);
  const derivedKey = deriveKeyFromPassword(encryptionKey, salt);
  
  const cipher = createCipheriv('aes-256-gcm', derivedKey, iv);
  let encrypted = cipher.update(data, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();
  const encryptedWithTag = encrypted + ':' + authTag.toString('base64');

  return {
    version: '1',
    algorithm: 'aes-256-gcm',
    encrypted_data: encryptedWithTag,
    salt: salt.toString('base64'),
    iv: iv.toString('base64')
  };
}

function decryptData(encryptedStorage: EncryptedStorage, key?: string): string {
  const encryptionKey = key || getEncryptionKey();
  if (!encryptionKey) {
    throw new Error('No encryption key available');
  }

  const salt = Buffer.from(encryptedStorage.salt, 'base64');
  const iv = Buffer.from(encryptedStorage.iv, 'base64');
  const derivedKey = deriveKeyFromPassword(encryptionKey, salt);

  const [encryptedData, authTagB64] = encryptedStorage.encrypted_data.split(':');
  const authTag = Buffer.from(authTagB64, 'base64');

  const decipher = createDecipheriv('aes-256-gcm', derivedKey, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

function shouldEncrypt(): boolean {
  return !!getEncryptionKey() && process.env.NODE_ENV === 'production';
}

// --- User secret-key encryption for DB storage ---
//
// Mirrors the historical file-store behavior: only encrypt when an encryption key
// is available AND we're in production. Otherwise store plaintext (with a loud
// warning) rather than failing — this matches how the on-disk JSON behaved and
// avoids blocking dev/test where THREADSTEAD_KEY_ENCRYPTION_KEY is unset.
//
// Encrypted values are prefixed with "enc:v1:" followed by a JSON EncryptedStorage
// blob (base64). Plaintext values are prefixed with "plain:". The prefix lets us
// decrypt correctly regardless of the environment the row was written in.

const ENC_PREFIX = 'enc:v1:';
const PLAIN_PREFIX = 'plain:';

/**
 * Encrypt a user's secret key (base64url) for at-rest storage in the DB.
 */
export function encryptUserSecretKey(secretKeyBase64Url: string): string {
  if (shouldEncrypt()) {
    const blob = encryptData(secretKeyBase64Url);
    return ENC_PREFIX + Buffer.from(JSON.stringify(blob), 'utf8').toString('base64');
  }

  if (!getEncryptionKey()) {
    console.warn(
      '⚠️ THREADSTEAD_KEY_ENCRYPTION_KEY is not set — storing user DID secret keys in PLAINTEXT. ' +
      'Set this env var (and NODE_ENV=production) to encrypt keys at rest.'
    );
  }
  return PLAIN_PREFIX + secretKeyBase64Url;
}

/**
 * Decrypt a stored secret key value written by encryptUserSecretKey.
 * Tolerates un-prefixed legacy values (treated as plaintext) for safety.
 */
export function decryptUserSecretKey(stored: string): string {
  if (stored.startsWith(ENC_PREFIX)) {
    const json = Buffer.from(stored.slice(ENC_PREFIX.length), 'base64').toString('utf8');
    const blob = JSON.parse(json) as EncryptedStorage;
    return decryptData(blob);
  }
  if (stored.startsWith(PLAIN_PREFIX)) {
    return stored.slice(PLAIN_PREFIX.length);
  }
  // Un-prefixed: assume plaintext base64url secret key (defensive).
  return stored;
}

/**
 * Look up a single user in the legacy on-disk file WITHOUT rewriting it.
 * Returns null if the file is absent or the user is not present. Read-only.
 * Used only as a transition safety net for not-yet-migrated users.
 */
async function findUserInLegacyFile(userId: string): Promise<UserDIDMapping | null> {
  const filePath = join(process.cwd(), USER_DID_MAPPINGS_FILE);
  if (!existsSync(filePath)) {
    return null;
  }
  const mappings = await loadUserDIDMappings();
  return mappings.find(m => m.userId === userId) || null;
}

// File I/O operations

async function storeServerKeypair(keypair: ServerKeypair): Promise<void> {
  const filePath = join(process.cwd(), SERVER_KEYPAIR_FILE);
  
  let dataToWrite: string;
  if (shouldEncrypt()) {
    const encrypted = encryptData(JSON.stringify(keypair));
    dataToWrite = JSON.stringify(encrypted, null, 2);
  } else {
    dataToWrite = JSON.stringify(keypair, null, 2);
  }
  
  await fs.writeFile(filePath, dataToWrite, { mode: 0o600 });
}

async function loadServerKeypair(): Promise<ServerKeypair | null> {
  try {
    const filePath = join(process.cwd(), SERVER_KEYPAIR_FILE);
    const data = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(data);
    
    // Check if data is encrypted
    if (parsed.version && parsed.algorithm && parsed.encrypted_data) {
      // Data is encrypted, decrypt it
      const decrypted = decryptData(parsed as EncryptedStorage);
      return JSON.parse(decrypted);
    } else {
      // Data is not encrypted, return as-is
      return parsed;
    }
  } catch (error) {
    return null;
  }
}

/**
 * Read user DID mappings from the LEGACY on-disk file.
 *
 * The DB (UserDID table) is now authoritative — this function exists only for
 * the one-time migration script and as a read-only transition fallback for
 * not-yet-migrated users. Returns [] when the file is absent or unreadable
 * (safe: the callers here treat "no legacy entry" as "not in file", and the DB
 * is consulted first). Do NOT use this as the primary source of user identities.
 */
export async function loadUserDIDMappings(): Promise<UserDIDMapping[]> {
  try {
    const filePath = join(process.cwd(), USER_DID_MAPPINGS_FILE);
    const data = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(data);
    
    // Check if data is encrypted
    if (parsed.version && parsed.algorithm && parsed.encrypted_data) {
      // Data is encrypted, decrypt it
      const decrypted = decryptData(parsed as EncryptedStorage);
      return JSON.parse(decrypted);
    } else {
      // Data is not encrypted, return as-is
      return parsed;
    }
  } catch (error) {
    return [];
  }
}

export async function storeUserDIDMappings(mappings: UserDIDMapping[]): Promise<void> {
  const filePath = join(process.cwd(), USER_DID_MAPPINGS_FILE);
  
  let dataToWrite: string;
  if (shouldEncrypt()) {
    const encrypted = encryptData(JSON.stringify(mappings));
    dataToWrite = JSON.stringify(encrypted, null, 2);
  } else {
    dataToWrite = JSON.stringify(mappings, null, 2);
  }
  
  await fs.writeFile(filePath, dataToWrite, { mode: 0o600 });
}

function getDomainFromEnvironment(): string {
  // Extract domain from THREADSTEAD_DID if available
  if (process.env.THREADSTEAD_DID?.startsWith('did:web:')) {
    return process.env.THREADSTEAD_DID.replace('did:web:', '').replace(/%3A/g, ':');
  }
  
  // Extract from NEXT_PUBLIC_BASE_URL
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    const url = new URL(process.env.NEXT_PUBLIC_BASE_URL);
    return url.host;
  }
  
  // Fallback to SITE_HANDLE_DOMAIN
  if (process.env.SITE_HANDLE_DOMAIN) {
    return process.env.SITE_HANDLE_DOMAIN.toLowerCase();
  }
  
  // Default fallback
  return 'localhost:3000';
}

/**
 * Initialize server DID system - call this on app startup
 */
export async function initializeServerDID(): Promise<{ did: string; domain: string }> {
  const keypair = await getOrCreateServerKeypair();
  const domain = getDomainFromEnvironment();
    
  return {
    did: keypair.did,
    domain
  };
}

/**
 * Rotate server keypair (for security maintenance)
 */
export async function rotateServerKeypair(): Promise<ServerKeypair> {
  const domain = getDomainFromEnvironment();
  
  // Generate new keypair
  const newKeypair = await generateServerKeypair(domain);
  
  // In production, you'd want to:
  // 1. Notify Ring Hub of the key rotation
  // 2. Keep old key valid for a transition period
  // 3. Update all references
    
  return newKeypair;
}

/**
 * Map DID back to ThreadStead user ID (DB-authoritative, legacy-file fallback).
 */
export async function mapDIDToUserId(did: string): Promise<string | null> {
  let row;
  try {
    row = await db.userDID.findUnique({ where: { did } });
  } catch (error) {
    throw new Error(
      `Failed to map DID to user ID from database: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  if (row) {
    return row.userId;
  }

  // Transition fallback for not-yet-migrated users.
  const mappings = await loadUserDIDMappings();
  const mapping = mappings.find(m => m.did === did);
  return mapping ? mapping.userId : null;
}

/**
 * Map multiple DIDs to user IDs (bulk operation, DB-authoritative).
 */
export async function mapDIDsToUserIds(dids: string[]): Promise<Map<string, string>> {
  const didToUserMap = new Map<string, string>();
  if (dids.length === 0) return didToUserMap;

  let rows;
  try {
    rows = await db.userDID.findMany({
      where: { did: { in: dids } },
      select: { did: true, userId: true },
    });
  } catch (error) {
    throw new Error(
      `Failed to bulk-map DIDs to user IDs from database: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  for (const row of rows) {
    didToUserMap.set(row.did, row.userId);
  }

  // Transition fallback: fill in any DIDs not yet in the DB from the legacy file.
  const missing = dids.filter(d => !didToUserMap.has(d));
  if (missing.length > 0) {
    const mappings = await loadUserDIDMappings();
    for (const did of missing) {
      const mapping = mappings.find(m => m.did === did);
      if (mapping) {
        didToUserMap.set(did, mapping.userId);
      }
    }
  }

  return didToUserMap;
}

/**
 * Export server identity for backup/migration
 */
export async function exportServerIdentity(): Promise<string> {
  const keypair = await getOrCreateServerKeypair();
  const userMappings = await loadUserDIDMappings();
  
  const exportData = {
    version: 1,
    server: keypair,
    users: userMappings,
    exported_at: new Date().toISOString()
  };
  
  return Buffer.from(JSON.stringify(exportData)).toString('base64');
}

/**
 * Import server identity from backup
 */
export async function importServerIdentity(exportedData: string): Promise<void> {
  const data = JSON.parse(Buffer.from(exportedData, 'base64').toString());
  
  if (data.version !== 1) {
    throw new Error('Unsupported export version');
  }
  
  // Store server keypair
  await storeServerKeypair(data.server);
  
  // Store user mappings
  await storeUserDIDMappings(data.users || []);
}