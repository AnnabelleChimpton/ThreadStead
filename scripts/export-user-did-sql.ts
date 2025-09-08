#!/usr/bin/env npx tsx

/**
 * Export User DID SQL for Production
 * 
 * This script should be run ON PRODUCTION to export the actual
 * user DIDs with their correct public keys for Ring Hub registration
 */

// Load environment variables
import { loadEnvConfig } from '@next/env'
const projectDir = process.cwd()
loadEnvConfig(projectDir)

import { loadUserDIDMappings } from '@/lib/api/did/server-did-client'
import { fromBase64Url } from '@/lib/utils/encoding/base64url'

async function exportUserDIDSQL() {
  console.log('🔐 Exporting User DID SQL from Production')
  console.log('==========================================\n')
  
  try {
    const mappings = await loadUserDIDMappings()
    console.log(`📊 Found ${mappings.length} user DIDs\n`)
    
    // Find the specific user with hash dbf3bd2982f841f7
    const targetHash = 'dbf3bd2982f841f7'
    const targetUser = mappings.find(m => m.userHash === targetHash)
    
    if (targetUser) {
      console.log('✅ Found user with hash:', targetHash)
      console.log('   User ID:', targetUser.userId)
      console.log('   DID:', targetUser.did)
      console.log('   Public Key (base64url):', targetUser.publicKey)
      
      // Convert to base64 for SQL
      const publicKeyBytes = fromBase64Url(targetUser.publicKey)
      const publicKeyBase64 = Buffer.from(publicKeyBytes).toString('base64')
      
      console.log('   Public Key (base64):', publicKeyBase64)
      console.log('\n📝 SQL to register THIS SPECIFIC USER with Ring Hub:')
      console.log('====================================================')
      console.log(`INSERT INTO "HttpSignature" (id, "keyId", "publicKey", "actorDid", "createdAt", "updatedAt", "trusted")`)
      console.log(`VALUES (gen_random_uuid(), '${targetUser.did}#key-1', '${publicKeyBase64}', '${targetUser.did}', NOW(), NOW(), true);`)
      console.log('\n⚠️ IMPORTANT: This is the ACTUAL key from production!')
      console.log('   Delete any previous registration for this DID and use this one instead.')
    } else {
      console.log('❌ User with hash', targetHash, 'not found!')
      console.log('\nThis user might not have authenticated yet on production.')
      console.log('Have them try to fork/join a ring first to generate their DID.')
    }
    
    // Also export all other user DIDs
    console.log('\n\n📋 ALL USER DIDS FOR REFERENCE:')
    console.log('================================')
    
    for (const mapping of mappings) {
      if (!mapping.did.startsWith('did:web:')) continue
      
      const publicKeyBytes = fromBase64Url(mapping.publicKey)
      const publicKeyBase64 = Buffer.from(publicKeyBytes).toString('base64')
      
      console.log(`\n-- User hash: ${mapping.userHash}`)
      console.log(`INSERT INTO "HttpSignature" (id, "keyId", "publicKey", "actorDid", "createdAt", "updatedAt", "trusted")`)
      console.log(`VALUES (gen_random_uuid(), '${mapping.did}#key-1', '${publicKeyBase64}', '${mapping.did}', NOW(), NOW(), true);`)
    }
    
  } catch (error) {
    console.error('❌ Export failed:', error)
    process.exit(1)
  }
}

async function main() {
  await exportUserDIDSQL()
}

main().catch(error => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})