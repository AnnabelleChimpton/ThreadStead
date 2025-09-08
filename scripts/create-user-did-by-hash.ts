#!/usr/bin/env npx tsx

/**
 * Create User DID by Hash
 * 
 * Manually create a DID for a user with a specific hash
 * This is useful when Ring Hub is looking for a DID that doesn't exist yet
 */

// Load environment variables
import { loadEnvConfig } from '@next/env'
const projectDir = process.cwd()
loadEnvConfig(projectDir)

import * as ed from "@noble/ed25519"
import { sha512 } from "@noble/hashes/sha512"
import { toBase64Url } from "@/lib/base64"
import { loadUserDIDMappings, storeUserDIDMappings, type UserDIDMapping } from '@/lib/api/did/server-did-client'

// Configure @noble/ed25519
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m))

async function createUserDIDByHash() {
  const targetHash = 'dbf3bd2982f841f7'
  
  console.log('🔐 Creating User DID for hash:', targetHash)
  console.log('==========================================\n')
  
  // Check if it already exists
  const mappings = await loadUserDIDMappings()
  const existing = mappings.find(m => m.userHash === targetHash)
  
  if (existing) {
    console.log('✅ DID already exists for this hash!')
    console.log('   User ID:', existing.userId)
    console.log('   DID:', existing.did)
    console.log('   Public Key:', existing.publicKey)
    return
  }
  
  // Create new DID for this hash
  const secret = ed.utils.randomPrivateKey()
  const publicKey = await ed.getPublicKeyAsync(secret)
  
  const skb64u = toBase64Url(secret)
  const pkb64u = toBase64Url(publicKey)
  
  // Create DID using production domain
  const domain = 'homepageagain.com' // Production domain
  const did = `did:web:${domain}:users:${targetHash}`
  
  // We need to use a placeholder user ID since we don't know the actual one
  // This will be updated when the actual user authenticates
  const mapping: UserDIDMapping = {
    userId: `unknown-user-${targetHash}`, // Placeholder
    did,
    userHash: targetHash,
    publicKey: pkb64u,
    secretKey: skb64u,
    created: new Date().toISOString()
  }
  
  // Store the new mapping
  mappings.push(mapping)
  await storeUserDIDMappings(mappings)
  
  console.log('✅ Created new DID for hash:', targetHash)
  console.log('   DID:', did)
  console.log('   Public Key:', pkb64u)
  console.log('   DID Document URL: https://homepageagain.com/users/' + targetHash + '/did.json')
  
  // Generate SQL for Ring Hub registration
  const publicKeyBase64 = Buffer.from(publicKey).toString('base64')
  
  console.log('\n📝 SQL to register this DID with Ring Hub:')
  console.log('------------------------------------------')
  console.log(`INSERT INTO "HttpSignature" (id, "keyId", "publicKey", "actorDid", "createdAt", "updatedAt", "trusted")`)
  console.log(`VALUES (gen_random_uuid(), '${did}#key-1', '${publicKeyBase64}', '${did}', NOW(), NOW(), true);`)
  
  console.log('\n🚨 IMPORTANT:')
  console.log('1. This is a temporary fix for the missing DID')
  console.log('2. The user ID is unknown and set as placeholder')
  console.log('3. When the actual user authenticates, their DID will be properly linked')
  console.log('4. Run the SQL above in Ring Hub database to register this DID')
}

async function main() {
  await createUserDIDByHash()
}

main().catch(error => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})