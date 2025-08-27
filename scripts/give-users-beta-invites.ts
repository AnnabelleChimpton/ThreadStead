#!/usr/bin/env npx tsx

/**
 * Give existing users beta invite codes to share
 * Usage: npx tsx scripts/give-users-beta-invites.ts
 * 
 * This script gives each existing user 5 beta invite codes (BETA-XXXX-XXXX-XXXX format)
 * that they can share with friends.
 */

// Load environment variables using Next.js's @next/env
import { loadEnvConfig } from '@next/env'
const projectDir = process.cwd()
loadEnvConfig(projectDir)

import { db } from '@/lib/db'
import { generateUserBetaInviteCodes } from '@/lib/beta-invite-codes'

async function giveUsersBetaInvites() {
  console.log('🎁 Giving existing users beta invite codes')
  console.log('==========================================')
  console.log('Codes per user: 5 (standard)')
  console.log()

  try {
    // Get all existing users
    const users = await db.user.findMany({
      select: { 
        id: true, 
        primaryHandle: true,
        createdAt: true,
        profile: { select: { displayName: true } }
      },
      orderBy: { createdAt: 'asc' }
    })

    if (users.length === 0) {
      console.log('❌ No users found in database')
      return
    }

    console.log(`📋 Found ${users.length} users`)
    console.log()

    let totalCodes = 0
    let processedUsers = 0

    for (const user of users) {
      const displayName = user.profile?.displayName || user.primaryHandle || user.id
      console.log(`👤 Processing: ${displayName}`)

      // Check if user already has invite codes
      const existingCodes = await db.betaInviteCode.findMany({
        where: { generatedBy: user.id }
      })

      if (existingCodes.length > 0) {
        console.log(`   ⚠️  User already has ${existingCodes.length} invite codes - skipping`)
        console.log()
        continue
      }

      // Generate 5 beta invite codes for this user using the standard library function
      const userCodes = await generateUserBetaInviteCodes(user.id)
      const codeStrings = userCodes.map(c => c.code)

      console.log(`   ✅ Generated 5 codes: ${codeStrings.join(', ')}`)
      console.log()

      totalCodes += 5
      processedUsers++
    }

    console.log('📊 Summary:')
    console.log(`   Users processed: ${processedUsers}/${users.length}`)
    console.log(`   Total codes generated: ${totalCodes}`)
    console.log(`   Codes per user: 5`)
    
    if (processedUsers < users.length) {
      console.log(`   Users skipped: ${users.length - processedUsers} (already had codes)`)
    }

    console.log()
    console.log('🎉 Beta invite codes distributed successfully!')
    console.log()
    console.log('📝 Users can now share their invite codes with friends.')
    console.log('   Check codes with: npx tsx scripts/manage-beta-keys.ts list')

  } catch (error) {
    console.error('❌ Failed to give users beta invites:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
    }
  }
}

giveUsersBetaInvites().catch(console.error)