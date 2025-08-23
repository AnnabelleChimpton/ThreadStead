/**
 * Server-side DID Client for ThreadStead
 * 
 * Manages server keypairs and DID operations for Ring Hub authentication
 * Unlike the browser did-client.ts, this works in Node.js server context
 */

import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha512";
import { toBase64Url, fromBase64Url } from "@/lib/base64";
import { promises as fs } from 'fs';
import { join } from 'path';
import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import bs58 from 'bs58';

// Configure @noble/ed25519 with SHA-512 (required)
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

export type ServerKeypair = { 
  publicKey: string; 
  secretKey: string; 
  did: string;
  created: string;
};

export type UserDIDMapping = {
  userId: string;
  did: string;
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
 * Generate or get a DID for a ThreadStead user
 */
export async function getOrCreateUserDID(userId: string): Promise<UserDIDMapping> {
  const mappings = await loadUserDIDMappings();
  
  // Check if user already has a DID
  const existing = mappings.find(m => m.userId === userId);
  if (existing) {
    return existing;
  }
  
  // Generate new DID for user
  const secret = ed.utils.randomPrivateKey();
  const publicKey = await ed.getPublicKeyAsync(secret);
  
  const skb64u = toBase64Url(secret);
  const pkb64u = toBase64Url(publicKey);
  const did = `did:key:${pkb64u}`; // Using did:key format for users
  
  const mapping: UserDIDMapping = {
    userId,
    did,
    publicKey: pkb64u,
    secretKey: skb64u,
    created: new Date().toISOString()
  };
  
  // Store the new mapping
  mappings.push(mapping);
  await storeUserDIDMappings(mappings);
  
  return mapping;
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
}

/**
 * Generate DID document for did:web resolution
 */
export async function generateDIDDocument(): Promise<DIDDocument> {
  const keypair = await getOrCreateServerKeypair();
  const publicKeyBytes = fromBase64Url(keypair.publicKey);
  
  // RingHub spec requires only base64 format, not multibase
  const publicKeyBase64 = Buffer.from(publicKeyBytes).toString('base64');
  
  return {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/suites/ed25519-2020/v1"
    ],
    "id": keypair.did,
    "verificationMethod": [{
      "id": `${keypair.did}#key-1`,
      "type": "Ed25519VerificationKey2020",
      "controller": keypair.did,
      "publicKeyBase64": publicKeyBase64
    }],
    "authentication": [`${keypair.did}#key-1`],
    "assertionMethod": [`${keypair.did}#key-1`],
    "capabilityDelegation": [`${keypair.did}#key-1`],
    "capabilityInvocation": [`${keypair.did}#key-1`]
  };
}

/**
 * Migrate existing ThreadStead user to DID system
 */
export async function migrateUserToDID(userId: string, existingPublicKey?: string): Promise<UserDIDMapping> {
  // If user already has a DID, return it
  const mappings = await loadUserDIDMappings();
  const existing = mappings.find(m => m.userId === userId);
  if (existing) {
    return existing;
  }
  
  // If they have an existing public key from the old system, derive DID from it
  if (existingPublicKey) {
    // Note: This would require having the private key too for full migration
    // For now, we'll generate a new DID for simplicity
  }
  
  // Generate new DID for the user
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

async function loadUserDIDMappings(): Promise<UserDIDMapping[]> {
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

async function storeUserDIDMappings(mappings: UserDIDMapping[]): Promise<void> {
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
  
  console.log(`ThreadStead Server DID initialized: ${keypair.did}`);
  
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
  
  console.log(`Server keypair rotated. New DID: ${newKeypair.did}`);
  
  return newKeypair;
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
  
  console.log(`Server identity imported. DID: ${data.server.did}`);
}