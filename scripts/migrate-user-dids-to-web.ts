#!/usr/bin/env npx tsx

/**
 * Migrate User DIDs from did:key to did:web format
 * 
 * This script migrates existing user DIDs from the old did:key format
 * to the new did:web format for Ring Hub compatibility
 */

// Load environment variables
import { loadEnvConfig } from '@next/env'
const projectDir = process.cwd()
loadEnvConfig(projectDir)

import { loadUserDIDMappings, storeUserDIDMappings } from '@/lib/server-did-client'
import { createHash } from 'crypto'

function getDomainFromEnvironment(): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (baseUrl) {
    return baseUrl.replace(/https?:\/\//, '');
  }
  return 'localhost:3000';
}

async function migrateUserDIDs() {
  console.log('🔄 Migrating User DIDs from did:key to did:web format')
  console.log('==================================================')

  try {
    // Load existing mappings
    const mappings = await loadUserDIDMappings()
    console.log(`📊 Found ${mappings.length} existing user DID mappings`)
    
    if (mappings.length === 0) {
      console.log('✅ No DIDs to migrate')
      return
    }

    // Check how many need migration
    const didKeyMappings = mappings.filter(m => m.did.startsWith('did:key:'))
    console.log(`🔍 Found ${didKeyMappings.length} did:key DIDs that need migration`)
    
    if (didKeyMappings.length === 0) {
      console.log('✅ All DIDs are already in did:web format')
      return
    }

    const domain = getDomainFromEnvironment()
    console.log(`🌐 Using domain: ${domain}`)

    // Migrate each did:key to did:web
    for (const mapping of didKeyMappings) {
      console.log(`\n🔄 Migrating user ${mapping.userId}`)
      console.log(`   Old DID: ${mapping.did}`)
      
      // Generate new did:web DID but keep the same keys
      const userHash = createHash('sha256')
        .update(mapping.userId + process.env.THREADSTEAD_DID_SALT || 'default-salt')
        .digest('hex').slice(0, 16)
      
      const newDID = `did:web:${domain}:users:${userHash}`
      
      // Update the mapping
      mapping.did = newDID
      mapping.userHash = userHash
      
      console.log(`   New DID: ${mapping.did}`)
      console.log(`   Hash: ${userHash}`)
    }

    // Save updated mappings
    await storeUserDIDMappings(mappings)
    
    console.log(`\n✅ Migration complete!`)
    console.log(`📊 Migrated ${didKeyMappings.length} DIDs to did:web format`)
    
    console.log('\n📋 Summary of migrated DIDs:')
    for (const mapping of didKeyMappings) {
      const didDocUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/users/${mapping.userHash}/did.json`
      console.log(`   ${mapping.did} → ${didDocUrl}`)
    }

    console.log('\n🚨 Important Next Steps:')
    console.log('   1. Start your development server')
    console.log('   2. Test DID document resolution at the URLs above')
    console.log('   3. For production: Register these DIDs with Ring Hub')
    console.log('   4. For development: DIDs work but Ring Hub uses server proxy')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

async function main() {
  await migrateUserDIDs()
}

main().catch(error => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})