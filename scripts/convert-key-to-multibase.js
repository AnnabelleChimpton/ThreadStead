#!/usr/bin/env node

/**
 * Convert Ed25519 public key to multibase format for DID document
 */

const crypto = require('crypto');

// Raw public key hex from OpenSSL
const publicKeyHex = '87ddf67927391ff6c8e1fe77b26171d53b17546b5b693f655f758b59d5899ca4';

// Convert hex to buffer
const publicKeyBuffer = Buffer.from(publicKeyHex, 'hex');

// Add Ed25519 multicodec prefix (0xed01)
const multicodecPrefix = Buffer.from([0xed, 0x01]);
const multicodecKey = Buffer.concat([multicodecPrefix, publicKeyBuffer]);

// Convert to base58btc (multibase 'z' prefix)
const bs58 = require('bs58');
const multibaseKey = 'z' + bs58.default.encode(multicodecKey);

console.log('Public Key (hex):', publicKeyHex);
console.log('Multibase Key:', multibaseKey);

// Also output the raw private key for server configuration
const fs = require('fs');
const privateKeyPem = fs.readFileSync('threadstead-signing-key.pem', 'utf8');
console.log('\nPrivate Key PEM:');
console.log(privateKeyPem);