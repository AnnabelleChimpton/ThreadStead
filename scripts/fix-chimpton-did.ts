#!/usr/bin/env npx tsx

/**
 * Fix chimpton's DID mapping
 * 
 * Links the working RingHub DID to the correct database user
 */

// Load environment variables using Next.js's @next/env
import { loadEnvConfig } from '@next/env'
const projectDir = process.cwd()
loadEnvConfig(projectDir)

import { loadUserDIDMappings, storeUserDIDMappings } from '@/lib/server-did-client'
import { db } from '@/lib/db'

async function fixChimptonDID() {
  console.log('🔧 Fixing chimpton\'s DID mapping')
  console.log('=================================')

  try {
    // Find chimpton in database
    const chimptonUser = await db.user.findFirst({
      where: {
        OR: [
          { primaryHandle: { contains: 'chimpton' } },
          { profile: { displayName: { contains: 'chimpton' } } }
        ]
      },
      select: { id: true, primaryHandle: true, profile: { select: { displayName: true } } }
    })

    if (!chimptonUser) {
      console.log('❌ Cannot find chimpton user in database')
      return
    }

    console.log('✅ Found chimpton in database:')
    console.log('  Real User ID:', chimptonUser.id)
    console.log('  Handle:', chimptonUser.primaryHandle)

    // Load current DID mappings
    const mappings = await loadUserDIDMappings()
    
    // Find the working RingHub DID mapping
    const workingDIDIndex = mappings.findIndex(m => m.userHash === 'dbf3bd2982f841f7')
    
    if (workingDIDIndex === -1) {
      console.log('❌ Cannot find working DID mapping')
      return
    }

    const workingDID = mappings[workingDIDIndex]
    console.log('\\n✅ Found working DID mapping:')
    console.log('  Current User ID:', workingDID.userId)
    console.log('  DID:', workingDID.did)
    console.log('  Hash:', workingDID.userHash)

    // Check if there's already a DID for the real user
    const existingRealUserDID = mappings.find(m => m.userId === chimptonUser.id)
    
    if (existingRealUserDID) {
      console.log('\\n⚠️  Real user already has a DID mapping:')
      console.log('  DID:', existingRealUserDID.did)
      console.log('  Hash:', existingRealUserDID.userHash)
      console.log('\\n🤔 You have two options:')
      console.log('  1. Keep the working RingHub DID (recommended)')
      console.log('  2. Merge the mappings')
      console.log('\\n📝 Recommendation: Update the working DID to use the real user ID')
    }

    // Update the working DID mapping to use the real user ID
    console.log('\\n🔄 Updating DID mapping...')
    mappings[workingDIDIndex].userId = chimptonUser.id

    // Save updated mappings
    await storeUserDIDMappings(mappings)

    console.log('✅ DID mapping updated!')
    console.log('\\n📋 Summary:')
    console.log('  DID Hash:', workingDID.userHash)
    console.log('  Old User ID:', workingDID.userId)
    console.log('  New User ID:', chimptonUser.id)
    console.log('  User Handle:', chimptonUser.primaryHandle)
    
    console.log('\\n🎉 chimpton\\'s RingHub identity is now properly linked!')
    console.log('   RingHub memberships: Pets (owner), Cats (owner), Spool (member), HomePageAgain (member)')

  } catch (error) {
    console.error('❌ Fix failed:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
    }
  }
}

fixChimptonDID().catch(console.error)