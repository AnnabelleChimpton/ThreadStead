#!/usr/bin/env npx tsx

/**
 * Audit User DID Mappings
 * 
 * Check for mismatches between database users and DID mappings
 */

// Load environment variables using Next.js's@next/env
import { loadEnvConfig } from '@next/env'
const projectDir = process.cwd()
loadEnvConfig(projectDir)

import { loadUserDIDMappings } from '@/lib/server-did-client'
import { db } from '@/lib/db'

async function auditUserDIDMappings() {
  console.log('🔍 Auditing User DID Mappings')
  console.log('=============================')

  try {
    // Get all database users
    const dbUsers = await db.user.findMany({
      select: { 
        id: true, 
        primaryHandle: true, 
        createdAt: true,
        profile: { select: { displayName: true } }
      },
      orderBy: { createdAt: 'asc' }
    })

    // Get all DID mappings
    const didMappings = await loadUserDIDMappings()

    console.log('📊 Overview:')
    console.log(`  Database users: ${dbUsers.length}`)
    console.log(`  DID mappings: ${didMappings.length}`)

    // Check for issues
    console.log('\n🔍 Checking for issues...')

    let issuesFound = 0

    // Issue 1: DID mappings with placeholder/unknown user IDs
    console.log('\n1️⃣ DID mappings with placeholder user IDs:')
    const placeholderMappings = didMappings.filter(m => 
      m.userId.includes('unknown') || 
      m.userId.includes('test') || 
      !dbUsers.find(u => u.id === m.userId)
    )

    if (placeholderMappings.length > 0) {
      console.log(`   ❌ Found ${placeholderMappings.length} problematic mappings:`)
      placeholderMappings.forEach(m => {
        console.log(`     - Hash: ${m.userHash}`)
        console.log(`       User ID: ${m.userId}`)
        console.log(`       DID: ${m.did}`)
        console.log(`       Created: ${m.created}`)
        console.log('')
      })
      issuesFound += placeholderMappings.length
    } else {
      console.log('   ✅ No placeholder mappings found')
    }

    // Issue 2: Database users without DID mappings
    console.log('\n2️⃣ Database users without DID mappings:')
    const usersWithoutDIDs = dbUsers.filter(u => 
      !didMappings.find(m => m.userId === u.id)
    )

    if (usersWithoutDIDs.length > 0) {
      console.log(`   ⚠️  Found ${usersWithoutDIDs.length} users without DIDs:`)
      usersWithoutDIDs.forEach(u => {
        console.log(`     - ${u.primaryHandle || u.id}`)
        console.log(`       ID: ${u.id}`)
        console.log(`       Created: ${u.createdAt}`)
        console.log('')
      })
      issuesFound += usersWithoutDIDs.length
    } else {
      console.log('   ✅ All database users have DIDs')
    }

    // Issue 3: Multiple DIDs for same user
    console.log('\n3️⃣ Users with multiple DID mappings:')
    const userIdCounts = new Map<string, number>()
    didMappings.forEach(m => {
      userIdCounts.set(m.userId, (userIdCounts.get(m.userId) || 0) + 1)
    })

    const duplicateUsers = Array.from(userIdCounts.entries()).filter(([_, count]) => count > 1)
    
    if (duplicateUsers.length > 0) {
      console.log(`   ⚠️  Found ${duplicateUsers.length} users with multiple DIDs:`)
      duplicateUsers.forEach(([userId, count]) => {
        const user = dbUsers.find(u => u.id === userId)
        console.log(`     - ${user?.primaryHandle || userId} has ${count} DIDs`)
        
        const userDIDs = didMappings.filter(m => m.userId === userId)
        userDIDs.forEach(m => {
          console.log(`       Hash: ${m.userHash}, Created: ${m.created}`)
        })
        console.log('')
      })
      issuesFound += duplicateUsers.length
    } else {
      console.log('   ✅ No users with multiple DIDs')
    }

    // Issue 4: Orphaned DIDs (user ID doesn't exist in database)
    console.log('\n4️⃣ Orphaned DID mappings (user not in database):')
    const orphanedDIDs = didMappings.filter(m => 
      !m.userId.includes('unknown') && 
      !m.userId.includes('test') && 
      !dbUsers.find(u => u.id === m.userId)
    )

    if (orphanedDIDs.length > 0) {
      console.log(`   ❌ Found ${orphanedDIDs.length} orphaned DIDs:`)
      orphanedDIDs.forEach(m => {
        console.log(`     - Hash: ${m.userHash}`)
        console.log(`       Missing User ID: ${m.userId}`)
        console.log(`       DID: ${m.did}`)
        console.log('')
      })
      issuesFound += orphanedDIDs.length
    } else {
      console.log('   ✅ No orphaned DIDs')
    }

    // Summary and recommendations
    console.log('\n📋 Summary:')
    if (issuesFound === 0) {
      console.log('   🎉 No issues found! All user DID mappings are clean.')
    } else {
      console.log(`   ⚠️  Found ${issuesFound} potential issues`)
      
      console.log('\n🔧 Recommended fixes:')
      
      if (placeholderMappings.length > 0) {
        console.log('   1. Fix placeholder mappings:')
        console.log('      - Investigate which real users these DIDs belong to')
        console.log('      - Update user IDs in DID mappings')
        console.log('      - Or create fix scripts for each one')
      }
      
      if (usersWithoutDIDs.length > 0) {
        console.log('   2. Create DIDs for users without them:')
        console.log('      - Run: getOrCreateUserDID() for each user')
        console.log('      - This will generate new DIDs for missing users')
      }
      
      if (duplicateUsers.length > 0) {
        console.log('   3. Resolve duplicate DIDs:')
        console.log('      - Keep the most recent or most active DID')
        console.log('      - Migrate any RingHub data if needed')
      }
    }

    console.log('\n🧪 Test commands:')
    console.log('   Check specific user DID: npx tsx scripts/test-specific-user.ts')
    console.log('   Fix chimpton mapping: npx tsx scripts/fix-chimpton-did.ts')
    console.log('   Generate missing DIDs: npx tsx scripts/test-user-dids.ts')

  } catch (error) {
    console.error('❌ Audit failed:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
    }
  }
}

auditUserDIDMappings().catch(console.error)