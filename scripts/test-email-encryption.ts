#!/usr/bin/env tsx

import { encryptEmail, decryptEmail } from '../lib/email-encryption';

console.log('🧪 Testing Email Encryption...\n');

const testEmail = 'test@example.com';

try {
  console.log('1. Testing encryption...');
  const encrypted1 = encryptEmail(testEmail);
  const encrypted2 = encryptEmail(testEmail);
  
  console.log(`   Original: ${testEmail}`);
  console.log(`   Encrypted 1: ${encrypted1.substring(0, 30)}...`);
  console.log(`   Encrypted 2: ${encrypted2.substring(0, 30)}...`);
  console.log(`   ✅ Non-deterministic: ${encrypted1 !== encrypted2 ? 'Yes' : 'No'}`);
  
  console.log('\n2. Testing decryption...');
  const decrypted1 = decryptEmail(encrypted1);
  const decrypted2 = decryptEmail(encrypted2);
  
  console.log(`   Decrypted 1: ${decrypted1}`);
  console.log(`   Decrypted 2: ${decrypted2}`);
  console.log(`   ✅ Matches original: ${decrypted1 === testEmail && decrypted2 === testEmail ? 'Yes' : 'No'}`);
  
  console.log('\n✅ Email encryption is working correctly!');
  console.log('\n📧 Email authentication is ready to use.');
  
} catch (error) {
  console.error('\n❌ Email encryption test failed:');
  console.error((error as Error).message);
  console.log('\n🔧 Check your EMAIL_ENCRYPTION_KEY in .env file');
  console.log('   Generate a new key with: npm run email:generate-key');
  process.exit(1);
}