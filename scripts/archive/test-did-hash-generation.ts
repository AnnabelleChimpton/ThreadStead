#!/usr/bin/env npx tsx

/**
 * Test DID Hash Generation
 * 
 * Verify which user corresponds to the hash dbf3bd2982f841f7
 */

// Load environment variables
import { loadEnvConfig } from '@next/env'
const projectDir = process.cwd()
loadEnvConfig(projectDir)

import { createHash } from 'crypto'
import { loadUserDIDMappings, getOrCreateUserDID } from '@/lib/api/did/server-did-client'

async function findUserByHash() {
  const targetHash = 'dbf3bd2982f841f7'
  
  console.log('🔍 Searching for user with hash:', targetHash)
  console.log('===========================================')
  
  // Load existing mappings
  const mappings = await loadUserDIDMappings()
  
  // Find the user with this hash
  const userMapping = mappings.find(m => m.userHash === targetHash)
  
  if (userMapping) {
    console.log('✅ Found user!')
    console.log('   User ID:', userMapping.userId)
    console.log('   DID:', userMapping.did)
    console.log('   Hash:', userMapping.userHash)
    console.log('   Created:', userMapping.created)
    console.log('   Public Key:', userMapping.publicKey)
  } else {
    console.log('❌ No user found with hash:', targetHash)
    console.log('\n📊 Existing user hashes:')
    mappings.forEach(m => {
      console.log(`   ${m.userHash} -> ${m.userId}`)
    })
    
    // Try to generate hash for common user IDs
    console.log('\n🔧 Testing hash generation for common user IDs:')
    const testUserIds = ['cl9ijpfzw0002mpg4c0v7w4c4', 'test-user', 'admin', 'user1']
    const salt = process.env.THREADSTEAD_DID_SALT || 'default-salt'
    
    testUserIds.forEach(userId => {
      const hash = createHash('sha256')
        .update(userId + salt)
        .digest('hex')
        .slice(0, 16)
      console.log(`   ${userId} -> ${hash}`)
    })
  }
}

async function main() {
  await findUserByHash()
}

main().catch(error => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})