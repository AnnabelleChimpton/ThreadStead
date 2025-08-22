#!/usr/bin/env node

/**
 * Update ThreadStead server keypair with new Ed25519 key for Ring Hub authentication
 */

const fs = require('fs');
const crypto = require('crypto');

// Read the PEM private key
const privateKeyPem = fs.readFileSync('threadstead-signing-key.pem', 'utf8');

// Extract the raw private key bytes from PEM
const privateKeyObject = crypto.createPrivateKey(privateKeyPem);
const privateKeyRaw = privateKeyObject.export({
  format: 'der',
  type: 'pkcs8'
});

// Extract the 32-byte private key (last 32 bytes of the DER format)
const privateKeyBytes = privateKeyRaw.slice(-32);

// Derive public key
const ed25519 = require('@noble/ed25519');

// Set up SHA-512 for ed25519
const { createHash } = require('crypto');
ed25519.etc.sha512Sync = (...m) => createHash('sha512').update(Buffer.concat(m)).digest();

(async () => {
  const publicKeyBytes = await ed25519.getPublicKey(privateKeyBytes);
  
  // Convert to base64url
  function toBase64Url(buffer) {
    return Buffer.from(buffer).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
  
  const privateKeyB64 = toBase64Url(privateKeyBytes);
  const publicKeyB64 = toBase64Url(publicKeyBytes);
  
  // Create the new server keypair object
  const serverKeypair = {
    publicKey: publicKeyB64,
    secretKey: privateKeyB64,
    did: "did:web:homepageagain.com",
    created: new Date().toISOString()
  };
  
  // Write to the server keypair file
  fs.writeFileSync('.threadstead-server-keypair.json', JSON.stringify(serverKeypair, null, 2));
  
  console.log('✅ Server keypair updated successfully!');
  console.log('📋 New server keypair:');
  console.log(JSON.stringify(serverKeypair, null, 2));
  
  // Verify the public key matches our multibase key
  const bs58 = require('bs58');
  const multicodecPrefix = Buffer.from([0xed, 0x01]);
  const multicodecKey = Buffer.concat([multicodecPrefix, publicKeyBytes]);
  const multibaseKey = 'z' + bs58.default.encode(multicodecKey);
  
  console.log('\n🔑 Multibase public key:', multibaseKey);
  console.log('Expected:', 'z6MkobdPZAxTYoFfh79Zc6HvUcJrk9wHKm9QAMxwFwMPrpgj');
  console.log('Match:', multibaseKey === 'z6MkobdPZAxTYoFfh79Zc6HvUcJrk9wHKm9QAMxwFwMPrpgj' ? '✅' : '❌');
})().catch(console.error);