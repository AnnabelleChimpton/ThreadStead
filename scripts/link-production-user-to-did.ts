#!/usr/bin/env npx tsx

/**
 * Link Production User to DID
 * 
 * This script should help link a DID with placeholder user ID to the actual ThreadStead user
 * Run this when you know which real user should own a specific DID hash
 */

// Load environment variables
import { loadEnvConfig } from '@next/env'
const projectDir = process.cwd()
loadEnvConfig(projectDir)

import { createHash } from 'crypto'
import { loadUserDIDMappings, storeUserDIDMappings } from '@/lib/api/did/server-did-client'
import { db } from '@/lib/db'

async function linkUserToDID() {
  const targetHash = 'dbf3bd2982f841f7'
  
  console.log('🔗 Linking Production User to DID')
  console.log(`Target hash: ${targetHash}`)
  console.log('===================================\n')
  
  try {
    // Find the DID mapping
    const mappings = await loadUserDIDMappings()
    const didMapping = mappings.find(m => m.userHash === targetHash)
    
    if (!didMapping) {
      console.log('❌ DID mapping not found for hash:', targetHash)
      return
    }
    
    console.log('Found DID mapping:')
    console.log(`   Current User ID: ${didMapping.userId}`)
    console.log(`   DID: ${didMapping.did}`)
    console.log(`   Created: ${didMapping.created}`)
    
    if (!didMapping.userId.startsWith('unknown-user-')) {
      console.log('✅ User is already properly linked!')
      console.log(`   Real User ID: ${didMapping.userId}`)
      return
    }
    
    console.log('\n🔍 This DID has a placeholder user ID. Let\'s find the real user...')
    
    // Try to reverse-engineer which user should have this hash
    const salt = process.env.THREADSTEAD_DID_SALT || 'default-salt'
    console.log(`Using salt: ${salt === 'default-salt' ? 'default-salt (WARNING: not configured!)' : '**configured**'}`)
    
    // Get users and check their hashes
    const users = await db.user.findMany({
      select: { id: true, handles: true, profile: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10 // Check recent users first
    })
    
    console.log(`\n📊 Checking recent users to find hash match...`)
    
    let matchedUser = null
    for (const user of users) {
      const hash = createHash('sha256')
        .update(user.id + salt)
        .digest('hex')
        .slice(0, 16)
      
      if (hash === targetHash) {
        matchedUser = user
        break
      }
    }
    
    if (matchedUser) {
      console.log(`\n✅ Found matching user!`)
      console.log(`   User ID: ${matchedUser.id}`)
      console.log(`   Handle: ${matchedUser.handles?.[0]?.handle || 'No handle'}`)
      console.log(`   Display Name: ${matchedUser.profile?.displayName || 'No display name'}`)
      console.log(`   Created: ${matchedUser.createdAt}`)
      
      // Update the mapping
      didMapping.userId = matchedUser.id
      await storeUserDIDMappings(mappings)
      
      console.log(`\n🎉 Successfully linked DID to real user!`)
      console.log(`   Hash: ${targetHash}`)
      console.log(`   DID: ${didMapping.did}`)
      console.log(`   User: ${matchedUser.handles?.[0]?.handle || matchedUser.id}`)
      
    } else {
      console.log(`\n❌ No matching user found for hash: ${targetHash}`)
      console.log(`\n🔧 Possible solutions:`)
      console.log(`   1. The user hasn't been created yet in this environment`)
      console.log(`   2. Different salt is used in production`)
      console.log(`   3. The user was created after this script ran`)
      console.log(`\n💡 You can manually set the user ID if you know it:`)
      console.log(`   - Find the user in your database`)
      console.log(`   - Update the DID mapping manually`)
      console.log(`   - Or run this script with the correct salt`)
    }
    
  } catch (error) {
    console.error('❌ Error linking user to DID:', error)
    process.exit(1)
  }
}

async function main() {
  await linkUserToDID()
  await db.$disconnect()
}

main().catch(error => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})