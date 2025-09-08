#!/usr/bin/env npx tsx

/**
 * Test Specific User DID Script
 * 
 * Tests authentication for user hash: dbf3bd2982f841f7
 */

// Load environment variables using Next.js's @next/env
import { loadEnvConfig } from '@next/env'
const projectDir = process.cwd()
loadEnvConfig(projectDir)

import { loadUserDIDMappings } from '@/lib/api/did/server-did-client'
import { AuthenticatedRingHubClient } from '@/lib/api/ringhub/ringhub-user-operations'
import { db } from '@/lib/config/database/connection'

async function testSpecificUser() {
  console.log('🔍 Testing user with hash: dbf3bd2982f841f7')
  console.log('================================================')

  try {
    // Find user by hash
    const mappings = await loadUserDIDMappings()
    const userMapping = mappings.find(m => m.userHash === 'dbf3bd2982f841f7')

    if (!userMapping) {
      console.log('❌ User mapping not found')
      return
    }

    console.log('✅ User mapping found:')
    console.log('  User ID:', userMapping.userId)
    console.log('  DID:', userMapping.did)
    console.log('  Public Key:', userMapping.publicKey)
    console.log('  Created:', userMapping.created)

    // Get user details from database
    console.log('')
    console.log('👤 Looking up user in database...')
    
    const user = await db.user.findUnique({
      where: { id: userMapping.userId },
      select: { id: true, primaryHandle: true, createdAt: true, profile: { select: { displayName: true } } }
    })

    if (user) {
      console.log('✅ User found in database:')
      console.log('  Handle:', user.primaryHandle || 'none')
      console.log('  Display Name:', user.profile?.displayName || 'none')
      console.log('  Created:', user.createdAt)
    } else {
      console.log('❌ User not found in database with ID:', userMapping.userId)
      console.log('   This suggests the user ID in the DID mapping doesn\'t match the database')
      
      // Try to find user by searching for chimpton
      console.log('   🔍 Searching for chimpton...')
      const chimptonUser = await db.user.findFirst({
        where: {
          OR: [
            { primaryHandle: { contains: 'chimpton' } },
            { profile: { displayName: { contains: 'chimpton' } } }
          ]
        },
        select: { id: true, primaryHandle: true, createdAt: true, profile: { select: { displayName: true } } }
      })
      
      if (chimptonUser) {
        console.log('   ✅ Found chimpton user:')
        console.log('     ID:', chimptonUser.id)
        console.log('     Handle:', chimptonUser.primaryHandle)
        console.log('     Display Name:', chimptonUser.profile?.displayName)
        console.log('     Created:', chimptonUser.createdAt)
      }
    }

    // Test RingHub authentication for this user
    console.log('')
    console.log('🔐 Testing RingHub authentication...')

    const authenticatedClient = new AuthenticatedRingHubClient(userMapping.userId)

    try {
      console.log('  Attempting to get user memberships...')
      const memberships = await authenticatedClient.getMyMemberships()
      
      console.log('  ✅ Authentication successful!')
      console.log('  Total memberships:', memberships.total)
      
      if (memberships.memberships && memberships.memberships.length > 0) {
        console.log('  Rings joined:')
        memberships.memberships.forEach((m: any) => {
          console.log('    -', m.ringName, '(' + m.ringSlug + ') as', m.role)
        })
      } else {
        console.log('  No ring memberships found')
      }
      
    } catch (error: any) {
      console.log('  ❌ Authentication failed:', error.message)
      
      if (error.message.includes('signature')) {
        console.log('  💡 Signature verification issue')
        console.log('     DID document URL: https://homepageagain.com/.well-known/did/users/dbf3bd2982f841f7/did.json')
      }
    }

    // Test joining a ring
    console.log('')
    console.log('🔗 Testing ring operations...')
    
    try {
      console.log('  Attempting to join The Spool...')
      const joinResult = await authenticatedClient.joinRing('spool')
      console.log('  ✅ Successfully joined ring!')
      console.log('  Join result:', joinResult)
      
    } catch (error: any) {
      console.log('  ❌ Ring join failed:', error.message)
      
      if (error.message.includes('already')) {
        console.log('  💡 User is already a member of this ring')
      } else if (error.message.includes('signature')) {
        console.log('  💡 Signature verification issue during ring join')
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
    }
  }
}

testSpecificUser().catch(console.error)