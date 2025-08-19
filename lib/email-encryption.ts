import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For GCM, this is always 16 bytes
const SALT_LENGTH = 32; // 32 bytes for salt
const TAG_LENGTH = 16; // GCM authentication tag length

function getEncryptionKey(): string {
  const key = process.env.EMAIL_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('EMAIL_ENCRYPTION_KEY environment variable is required');
  }
  if (key.length !== 64) { // 32 bytes = 64 hex chars
    throw new Error('EMAIL_ENCRYPTION_KEY must be 64 characters (32 bytes) in hex format');
  }
  return key;
}

/**
 * Encrypts an email address using AES-256-GCM
 * Returns: base64(salt + iv + encrypted_data + auth_tag)
 */
export function encryptEmail(email: string): string {
  try {
    const key = Buffer.from(getEncryptionKey(), 'hex');
    const salt = randomBytes(SALT_LENGTH);
    const iv = randomBytes(IV_LENGTH);
    
    // Create cipher
    const cipher = createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt the email
    let encrypted = cipher.update(email.toLowerCase().trim(), 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    // Get authentication tag
    const authTag = cipher.getAuthTag();
    
    // Combine salt + iv + encrypted data + auth tag
    const combined = Buffer.concat([salt, iv, encrypted, authTag]);
    
    return combined.toString('base64');
  } catch (error) {
    throw new Error(`Email encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypts an email address using AES-256-GCM
 * Input: base64(salt + iv + encrypted_data + auth_tag)
 */
export function decryptEmail(encryptedEmail: string): string {
  try {
    const key = Buffer.from(getEncryptionKey(), 'hex');
    const combined = Buffer.from(encryptedEmail, 'base64');
    
    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = combined.subarray(combined.length - TAG_LENGTH);
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH, combined.length - TAG_LENGTH);
    
    // Create decipher
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    throw new Error(`Email decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Finds all users with the given email address (supports multiple accounts per email)
 */
export async function findUsersByEmail(email: string): Promise<any[]> {
  const { db } = await import('./db');
  
  // Get all users with encrypted emails
  const users = await db.user.findMany({
    where: {
      encryptedEmail: { not: null }
    },
    select: {
      id: true,
      did: true,
      encryptedEmail: true,
      emailVerifiedAt: true,
      handles: {
        select: {
          handle: true,
          host: true
        }
      },
      profile: {
        select: {
          displayName: true,
          avatarThumbnailUrl: true
        }
      }
    }
  });
  
  // Decrypt and filter users with matching emails
  const matchingUsers = [];
  const normalizedEmail = email.toLowerCase().trim();
  
  for (const user of users) {
    if (user.encryptedEmail) {
      try {
        const decryptedEmail = decryptEmail(user.encryptedEmail);
        if (decryptedEmail === normalizedEmail) {
          matchingUsers.push(user);
        }
      } catch (error) {
        // Log but continue - corrupted encryption shouldn't break the whole flow
        console.error(`Failed to decrypt email for user ${user.id}:`, error);
      }
    }
  }
  
  return matchingUsers;
}

/**
 * Generate a secure random encryption key (for setup)
 */
export function generateEncryptionKey(): string {
  return randomBytes(32).toString('hex');
}