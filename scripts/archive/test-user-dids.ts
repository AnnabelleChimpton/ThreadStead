#!/usr/bin/env npx tsx

/**
 * Test User DID Generation Script
 * 
 * This script tests if user DID documents are being generated and served correctly
 */

// Load environment variables using Next.js's @next/env
import { loadEnvConfig } from '@next/env'
const projectDir = process.cwd()
loadEnvConfig(projectDir)

import { loadUserDIDMappings, getOrCreateUserDID, generateUserDIDDocument } from '@/lib/server-did-client'
import { db } from '@/lib/db'

async function testUserDIDs() {
  console.log('🧪 Testing User DID Generation')
  console.log('==============================')
  
  try {
    // Step 1: Check existing user DID mappings
    console.log('\n📋 Step 1: Checking existing user DID mappings...')
    const mappings = await loadUserDIDMappings()
    console.log(`   Found ${mappings.length} existing user DID mappings`)
    
    if (mappings.length > 0) {
      console.log('   Sample mappings:')
      mappings.slice(0, 3).forEach((m, i) => {
        console.log(`     ${i+1}. User ${m.userId} -> Hash: ${m.userHash} -> DID: ${m.did}`)
      })
    }
    
    // Step 2: Get real users from database
    console.log('\n👥 Step 2: Getting real users from database...')
    const users = await db.user.findMany({ 
      take: 5, 
      select: { id: true, primaryHandle: true, createdAt: true } 
    })
    
    if (users.length === 0) {
      console.log('   ❌ No users found in database')
      return
    }
    
    console.log(`   Found ${users.length} users:`)
    users.forEach(u => {
      console.log(`     ID: ${u.id}, Handle: ${u.primaryHandle || 'none'}, Created: ${u.createdAt}`)
    })
    
    // Step 3: Test DID generation for first user
    console.log('\n🔑 Step 3: Testing DID generation for first user...')
    const testUser = users[0]
    console.log(`   Testing with User ID: ${testUser.id}`)
    
    const userMapping = await getOrCreateUserDID(testUser.id)
    console.log('   ✅ User DID mapping created/retrieved:')
    console.log(`      User ID: ${userMapping.userId}`)
    console.log(`      DID: ${userMapping.did}`)
    console.log(`      Hash: ${userMapping.userHash}`)
    console.log(`      Public Key: ${userMapping.publicKey}`)
    console.log(`      Created: ${userMapping.created}`)
    
    // Step 4: Test DID document generation
    console.log('\n📄 Step 4: Testing DID document generation...')
    const didDocument = generateUserDIDDocument(userMapping)
    console.log('   ✅ DID Document generated:')
    console.log(`      ID: ${didDocument.id}`)
    console.log(`      Verification Method ID: ${didDocument.verificationMethod[0]?.id}`)
    console.log(`      Public Key (multibase): ${didDocument.verificationMethod[0]?.publicKeyMultibase}`)
    
    // Step 5: Show URLs to test
    console.log('\n🌐 Step 5: URLs to test manually:')
    console.log(`   User DID Document: https://homepageagain.com/.well-known/did/users/${userMapping.userHash}/did.json`)
    console.log(`   Alternative URL: https://homepageagain.com/users/${userMapping.userHash}/did.json`)
    console.log(`   API Direct: https://homepageagain.com/api/did/${userMapping.userHash}/document`)
    
    // Step 6: Test all users have DIDs
    console.log('\n🔄 Step 6: Ensuring all users have DIDs...')
    let createdCount = 0
    for (const user of users) {
      try {
        await getOrCreateUserDID(user.id)
        createdCount++
      } catch (error) {
        console.log(`   ❌ Failed to create DID for user ${user.id}: ${error}`)
      }
    }
    console.log(`   ✅ ${createdCount}/${users.length} users have DIDs`)
    
    // Step 7: Final summary
    console.log('\n📊 Summary:')
    const finalMappings = await loadUserDIDMappings()
    console.log(`   Total user DID mappings: ${finalMappings.length}`)
    console.log(`   Users in database: ${users.length}`)
    
    if (finalMappings.length >= users.length) {
      console.log('   ✅ All users have DIDs - user DID generation is working!')
    } else {
      console.log('   ⚠️  Some users may be missing DIDs')
    }
    
    console.log('\n🧪 Test complete! Try fetching a user DID document with:')
    if (userMapping) {
      console.log(`   curl -H "Accept: application/json" "https://homepageagain.com/.well-known/did/users/${userMapping.userHash}/did.json"`)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
      console.error('   Stack:', error.stack)
    }
  }
}

testUserDIDs().catch(console.error)