#!/usr/bin/env npx tsx

/**
 * Cleanup Placeholder DIDs
 * 
 * Find and fix any remaining placeholder DIDs that weren't properly linked
 * This prevents the display issue for future users
 */

// Load environment variables
import { loadEnvConfig } from '@next/env'
const projectDir = process.cwd()
loadEnvConfig(projectDir)

import { loadUserDIDMappings, storeUserDIDMappings } from '@/lib/api/did/server-did-client'

async function cleanupPlaceholderDIDs() {
  console.log('🧹 Cleaning up placeholder DIDs')
  console.log('================================\n')
  
  try {
    const mappings = await loadUserDIDMappings()
    console.log(`📊 Found ${mappings.length} total DID mappings`)
    
    const placeholderMappings = mappings.filter(m => m.userId.startsWith('unknown-user-'))
    console.log(`🔍 Found ${placeholderMappings.length} placeholder DIDs`)
    
    if (placeholderMappings.length === 0) {
      console.log('✅ No placeholder DIDs found - system is clean!')
      return
    }
    
    console.log('\nPlaceholder DIDs found:')
    placeholderMappings.forEach(mapping => {
      console.log(`   - ${mapping.userHash}: ${mapping.userId}`)
      console.log(`     DID: ${mapping.did}`)
    })
    
    console.log('\n⚠️  These DIDs should be removed or properly linked')
    console.log('Options:')
    console.log('1. Remove them (they\'ll be recreated properly when users interact)')
    console.log('2. Keep them and link manually when you know which users they belong to')
    console.log('')
    console.log('Recommendation: Remove them to let the system create proper DIDs automatically')
    console.log('')
    console.log('To remove placeholder DIDs, run:')
    console.log('npx tsx scripts/cleanup-placeholder-dids.ts --remove')
    
    // Check if --remove flag was passed
    if (process.argv.includes('--remove')) {
      console.log('\n🗑️  Removing placeholder DIDs...')
      
      const cleanedMappings = mappings.filter(m => !m.userId.startsWith('unknown-user-'))
      await storeUserDIDMappings(cleanedMappings)
      
      console.log(`✅ Removed ${placeholderMappings.length} placeholder DIDs`)
      console.log('Future users will get proper DIDs automatically when they interact with Ring Hub')
      
      // Show what was removed
      console.log('\nRemoved DIDs:')
      placeholderMappings.forEach(mapping => {
        console.log(`   - ${mapping.userHash} (${mapping.did})`)
      })
    }
    
  } catch (error) {
    console.error('❌ Error cleaning up placeholder DIDs:', error)
    process.exit(1)
  }
}

async function main() {
  await cleanupPlaceholderDIDs()
}

main().catch(error => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})