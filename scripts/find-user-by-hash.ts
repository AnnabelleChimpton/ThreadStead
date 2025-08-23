#!/usr/bin/env npx tsx

/**
 * Find User ID by Hash
 * 
 * Reverse lookup to find which user ID generates a specific hash
 */

// Load environment variables
import { loadEnvConfig } from '@next/env'
const projectDir = process.cwd()
loadEnvConfig(projectDir)

import { createHash } from 'crypto'
import { db } from '@/lib/db'

async function findUserIdByHash() {
  const targetHash = 'dbf3bd2982f841f7'
  const salt = process.env.THREADSTEAD_DID_SALT || 'default-salt'
  
  console.log('🔍 Finding user ID that generates hash:', targetHash)
  console.log('Using salt:', salt === 'default-salt' ? 'default-salt (not configured)' : '**configured**')
  console.log('===========================================\n')
  
  try {
    // Get all users from database
    const users = await db.user.findMany({
      select: { id: true, handle: true }
    })
    
    console.log(`Checking ${users.length} users...\n`)
    
    let foundUser = null
    for (const user of users) {
      const hash = createHash('sha256')
        .update(user.id + salt)
        .digest('hex')
        .slice(0, 16)
      
      if (hash === targetHash) {
        foundUser = user
        break
      }
    }
    
    if (foundUser) {
      console.log('✅ Found user!')
      console.log('   User ID:', foundUser.id)
      console.log('   Handle:', foundUser.handle)
      console.log('   Hash:', targetHash)
      
      // Generate the full DID
      const domain = process.env.NEXT_PUBLIC_BASE_URL?.replace(/https?:\/\//, '') || 'localhost:3000'
      const did = `did:web:${domain}:users:${targetHash}`
      console.log('   DID:', did)
      
      console.log('\n📝 To create DID for this user, run:')
      console.log(`   npm run user-did:create-for-user ${foundUser.id}`)
      
    } else {
      console.log('❌ No user found with this hash')
      console.log('\nPossible reasons:')
      console.log('1. Different salt is used in production')
      console.log('2. User doesn\'t exist in local database')
      console.log('3. Hash was generated differently')
      
      // Show first few user hashes for debugging
      console.log('\n📊 Sample user hashes (first 5):')
      users.slice(0, 5).forEach(user => {
        const hash = createHash('sha256')
          .update(user.id + salt)
          .digest('hex')
          .slice(0, 16)
        console.log(`   ${user.handle || user.id} -> ${hash}`)
      })
    }
    
  } catch (error) {
    console.error('Error accessing database:', error)
    console.log('\n💡 Make sure your database is configured and accessible')
  }
}

async function main() {
  await findUserIdByHash()
  await db.$disconnect()
}

main().catch(error => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})