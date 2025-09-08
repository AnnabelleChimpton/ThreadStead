#!/usr/bin/env npx tsx

/**
 * Find User for Production DID
 * 
 * Comprehensive script to find which ThreadStead user corresponds to a specific DID hash
 * This version tries multiple approaches and can work without proper salt configuration
 */

// Load environment variables
import { loadEnvConfig } from '@next/env'
const projectDir = process.cwd()
loadEnvConfig(projectDir)

import { createHash } from 'crypto'
import { loadUserDIDMappings, storeUserDIDMappings } from '@/lib/api/did/server-did-client'
import { db } from '@/lib/db'

async function findUserForProductionDID() {
  const targetHash = 'dbf3bd2982f841f7'
  
  console.log('🔍 Finding User for Production DID')
  console.log(`Target hash: ${targetHash}`)
  console.log('=====================================\n')
  
  try {
    // Method 1: Check if user manually created DID recently
    console.log('Method 1: Checking for recent Ring Hub activity...')
    
    // Look for recent Ring Hub ownership records
    const recentRingHubActivity = await db.ringHubOwnership.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { owner: { include: { handles: true, profile: true } } }
    })
    
    console.log(`Found ${recentRingHubActivity.length} recent Ring Hub activities`)
    
    for (const activity of recentRingHubActivity) {
      console.log(`   - User: ${activity.owner.handles?.[0]?.handle || activity.owner.id}`)
      console.log(`     Ring: ${activity.ringSlug}`)
      console.log(`     Server DID: ${activity.serverDID}`)
      
      if (activity.serverDID.includes(targetHash)) {
        console.log(`   🎯 MATCH! This user's DID contains our target hash!`)
        return await linkUserToDID(targetHash, activity.owner.id)
      }
    }
    
    // Method 2: Try different salts
    console.log('\nMethod 2: Trying different salt values...')
    
    const possibleSalts = [
      'default-salt',
      process.env.THREADSTEAD_DID_SALT || '',
      'threadstead-salt',
      'production-salt',
      '', // No salt
      'secret-salt'
    ].filter(Boolean)
    
    const users = await db.user.findMany({
      select: { id: true, handles: true, profile: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
    
    console.log(`Checking ${users.length} users with ${possibleSalts.length} different salts...`)
    
    for (const salt of possibleSalts) {
      console.log(`\nTrying salt: "${salt}"`)
      
      for (const user of users) {
        const hash = createHash('sha256')
          .update(user.id + salt)
          .digest('hex')
          .slice(0, 16)
        
        if (hash === targetHash) {
          console.log(`🎉 FOUND MATCH!`)
          console.log(`   User ID: ${user.id}`)
          console.log(`   Handle: ${user.handles?.[0]?.handle || 'No handle'}`)
          console.log(`   Display Name: ${user.profile?.displayName || 'No display name'}`)
          console.log(`   Salt used: "${salt}"`)
          console.log(`   Created: ${user.createdAt}`)
          
          return await linkUserToDID(targetHash, user.id, salt)
        }
      }
    }
    
    // Method 3: Manual identification
    console.log('\nMethod 3: Manual identification needed')
    console.log('=====================')
    console.log('Could not automatically find the user. Here are your options:')
    console.log('')
    console.log('1. Check who recently created or forked rings via Ring Hub:')
    
    const recentUsers = await db.user.findMany({
      select: { id: true, handles: true, profile: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
    
    recentUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.handles?.[0]?.handle || user.id}`)
      console.log(`      ID: ${user.id}`)
      console.log(`      Name: ${user.profile?.displayName || 'No name'}`)
      console.log(`      Created: ${user.createdAt}`)
    })
    
    console.log('')
    console.log('2. To manually link a user, run:')
    console.log(`   npx tsx scripts/manual-link-did.ts <USER_ID> ${targetHash}`)
    
    console.log('')
    console.log('3. Or check your Ring Hub logs to see which DID made the request')
    
  } catch (error) {
    console.error('❌ Error finding user:', error)
    process.exit(1)
  }
}

async function linkUserToDID(targetHash: string, userId: string, salt?: string): Promise<boolean> {
  try {
    const mappings = await loadUserDIDMappings()
    const didMapping = mappings.find(m => m.userHash === targetHash)
    
    if (!didMapping) {
      console.log('❌ DID mapping not found')
      return false
    }
    
    // Update the mapping
    didMapping.userId = userId
    await storeUserDIDMappings(mappings)
    
    console.log('\n✅ Successfully linked DID to user!')
    console.log(`   Hash: ${targetHash}`)
    console.log(`   DID: ${didMapping.did}`)
    console.log(`   User ID: ${userId}`)
    if (salt) console.log(`   Salt: "${salt}"`)
    
    // Get user details
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { handles: true, profile: true }
    })
    
    if (user) {
      console.log(`   User Handle: ${user.handles?.[0]?.handle || 'No handle'}`)
      console.log(`   Display Name: ${user.profile?.displayName || 'No display name'}`)
    }
    
    console.log('\n🎯 The member list should now show the proper username!')
    return true
    
  } catch (error) {
    console.error('❌ Error linking user to DID:', error)
    return false
  }
}

async function main() {
  await findUserForProductionDID()
  await db.$disconnect()
}

main().catch(error => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})