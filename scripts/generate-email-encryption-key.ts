#!/usr/bin/env tsx

import { generateEncryptionKey } from '../lib/utils/security/email-encryption';

console.log('🔐 Generating Email Encryption Key...\n');

const key = generateEncryptionKey();

console.log('Your new email encryption key:');
console.log('====================================');
console.log(key);
console.log('====================================\n');

console.log('Add this to your .env file:');
console.log(`EMAIL_ENCRYPTION_KEY="${key}"`);
console.log('\n⚠️  IMPORTANT: Keep this key secure and never commit it to version control!');
console.log('💡 If you lose this key, all existing encrypted emails will be unreadable.');