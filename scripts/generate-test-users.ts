import * as ed from "@noble/ed25519";
import { Buffer } from 'buffer';

// Simple base64url functions to avoid dependency on the app's lib
function toBase64Url(buffer: Uint8Array): string {
  return Buffer.from(buffer).toString('base64url');
}

async function generateBetaKey(): Promise<string> {
  const keyBytes = ed.utils.randomPrivateKey();
  return toBase64Url(keyBytes).substring(0, 16); // Take first 16 chars for a shorter key
}

async function generateLegacyUser(username: string) {
  const secret = ed.utils.randomPrivateKey();
  const publicKey = await ed.getPublicKeyAsync(secret);
  const skb64u = toBase64Url(secret);
  const pkb64u = toBase64Url(publicKey);
  const did = `did:key:ed25519:${pkb64u}`;
  const betaKey = await generateBetaKey();

  console.log(`\nGenerated legacy user: ${username}`);
  console.log('DID:', did);
  console.log('Public Key:', pkb64u);
  console.log('Secret Key:', skb64u);
  console.log('Beta Key:', betaKey);
  
  // Create a legacy backup token
  const token = btoa(JSON.stringify({
    version: 1,
    keypair: {
      did,
      publicKey: pkb64u,
      secretKey: skb64u
    },
    exported_at: Date.now()
  }));
  
  console.log('Backup Token:', token);
  return { did, publicKey: pkb64u, secretKey: skb64u, token };
}

async function main() {
  console.log('Generating two legacy test users...\n');
  
  const alice = await generateLegacyUser('alice');
  const bob = await generateLegacyUser('bob');
  
  console.log('\nTo use these users:');
  console.log('1. Go to the Identity page');
  console.log('2. Click "Import Legacy Token"');
  console.log('3. Paste the backup token');
  console.log('4. Click on "Create New Account with Seed Phrase"');
  console.log('5. Enter the username and beta key when prompted');
  console.log('6. Save the seed phrase that is generated');
}

main().catch(console.error);
