import bcrypt from 'bcryptjs';
import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from 'crypto';

const SALT_ROUNDS = 12;
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEY_LENGTH = 32;

/**
 * Hash a password for storage
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Encrypt seed phrase with user's password
 * Returns base64 encoded string containing salt:iv:authTag:encrypted
 */
export function encryptSeedPhraseWithPassword(seedPhrase: string, password: string): string {
  // Generate random salt and IV
  const salt = randomBytes(32);
  const iv = randomBytes(16);
  
  // Derive key from password using PBKDF2
  const key = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEY_LENGTH, 'sha256');
  
  // Create cipher
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  
  // Encrypt the seed phrase
  let encrypted = cipher.update(seedPhrase, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  // Get authentication tag
  const authTag = cipher.getAuthTag();
  
  // Combine salt + iv + authTag + encrypted data
  const combined = Buffer.concat([salt, iv, authTag, encrypted]);
  
  return combined.toString('base64');
}

/**
 * Decrypt seed phrase with user's password
 */
export function decryptSeedPhraseWithPassword(encryptedData: string, password: string): string {
  const combined = Buffer.from(encryptedData, 'base64');
  
  // Extract components
  const salt = combined.subarray(0, 32);
  const iv = combined.subarray(32, 48);
  const authTag = combined.subarray(48, 64);
  const encrypted = combined.subarray(64);
  
  // Derive key from password
  const key = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEY_LENGTH, 'sha256');
  
  // Create decipher
  const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  // Decrypt
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted.toString('utf8');
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Generate a random password (for account recovery scenarios)
 */
export function generateRandomPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const length = 16;
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return password;
}