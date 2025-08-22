#!/usr/bin/env npx tsx

/**
 * Check Environment Variables Loading
 * 
 * Debug script to verify environment variables are being loaded correctly
 */

console.log('🔍 Checking Environment Variables')
console.log('================================')

// Load environment variables using Next.js's @next/env
import { loadEnvConfig } from '@next/env'
const projectDir = process.cwd()

console.log('📁 Project directory:', projectDir)
console.log('🔄 Loading environment...')

const envResult = loadEnvConfig(projectDir)
console.log('✅ loadEnvConfig result:', envResult)

console.log('\n📋 Ring Hub Environment Variables:')
console.log('   RING_HUB_URL:', process.env.RING_HUB_URL || 'NOT SET')
console.log('   THREADSTEAD_DID:', process.env.THREADSTEAD_DID || 'NOT SET')
console.log('   THREADSTEAD_PRIVATE_KEY_B64URL:', process.env.THREADSTEAD_PRIVATE_KEY_B64URL ? 'SET (' + process.env.THREADSTEAD_PRIVATE_KEY_B64URL.substring(0, 10) + '...)' : 'NOT SET')
console.log('   THREADSTEAD_PUBLIC_KEY_MULTIBASE:', process.env.THREADSTEAD_PUBLIC_KEY_MULTIBASE || 'NOT SET')

console.log('\n📋 Feature Flags:')
console.log('   NEXT_PUBLIC_USE_RING_HUB:', process.env.NEXT_PUBLIC_USE_RING_HUB || 'NOT SET')
console.log('   NEXT_PUBLIC_THREADRINGS_ENABLED:', process.env.NEXT_PUBLIC_THREADRINGS_ENABLED || 'NOT SET')

console.log('\n📋 Other Key Variables:')
console.log('   NODE_ENV:', process.env.NODE_ENV || 'NOT SET')
console.log('   NEXT_PUBLIC_BASE_URL:', process.env.NEXT_PUBLIC_BASE_URL || 'NOT SET')
console.log('   SITE_HANDLE_DOMAIN:', process.env.SITE_HANDLE_DOMAIN || 'NOT SET')

async function checkRingHubClient() {
  console.log('\n🧪 Ring Hub Client Availability:')
  try {
    const { getRingHubClient } = await import('@/lib/ringhub-client')
    const client = getRingHubClient()
    
    if (client) {
      console.log('   ✅ Ring Hub client created successfully')
      const clientAny = client as any
      console.log('   📋 Client details:')
      console.log('      Instance DID:', clientAny.instanceDID)
      console.log('      Base URL:', clientAny.baseUrl)
      console.log('      Public Key:', clientAny.publicKeyMultibase)
    } else {
      console.log('   ❌ Ring Hub client is null')
      
      // Check the isAvailable() method
      const { RingHubClient } = await import('@/lib/ringhub-client')
      console.log('   🔍 Availability check:')
      console.log('      RingHubClient.isAvailable():', RingHubClient.isAvailable())
      
      // Check each requirement
      const { featureFlags } = await import('@/lib/feature-flags')
      console.log('      featureFlags.ringhub():', featureFlags.ringhub())
      console.log('      RING_HUB_URL exists:', !!process.env.RING_HUB_URL)
      console.log('      THREADSTEAD_DID exists:', !!process.env.THREADSTEAD_DID)
      console.log('      THREADSTEAD_PRIVATE_KEY_B64URL exists:', !!process.env.THREADSTEAD_PRIVATE_KEY_B64URL)
    }
  } catch (error) {
    console.log('   ❌ Error creating Ring Hub client:', error)
  }
}

async function checkFileSystem() {
  // Also check if we're running from the right directory
  const { promises: fs } = await import('fs')
  const { join } = await import('path')

  console.log('\n📁 File System Check:')
  const envFile = join(projectDir, '.env')
  try {
    await fs.access(envFile)
    console.log('   ✅ .env file exists at:', envFile)
  } catch {
    console.log('   ❌ .env file NOT found at:', envFile)
  }

  const envLocalFile = join(projectDir, '.env.local')
  try {
    await fs.access(envLocalFile)
    console.log('   ✅ .env.local file exists at:', envLocalFile)
  } catch {
    console.log('   ❌ .env.local file NOT found at:', envLocalFile)
  }

  const packageJsonFile = join(projectDir, 'package.json')
  try {
    await fs.access(packageJsonFile)
    console.log('   ✅ package.json exists - correct directory')
  } catch {
    console.log('   ❌ package.json NOT found - wrong directory?')
  }
}

async function main() {
  await checkRingHubClient()
  await checkFileSystem()
}

main().catch(console.error)