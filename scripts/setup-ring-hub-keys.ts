#!/usr/bin/env npx tsx

/**
 * Ring Hub Keys Setup Utility
 * 
 * This utility sets up consistent keys for Ring Hub integration.
 * Run this on both local and production to ensure keys match.
 */

// Load environment variables using Next.js's @next/env
import { loadEnvConfig } from '@next/env'
const projectDir = process.cwd()
loadEnvConfig(projectDir)

import { promises as fs } from 'fs'
import { join } from 'path'
import { generateServerKeypair } from '@/lib/api/did/server-did-client'

interface KeypairData {
  publicKey: string
  secretKey: string
  did: string
  created: string
}

async function setupRingHubKeys() {
  console.log('🔧 Ring Hub Keys Setup Utility')
  console.log('==============================')
  
  const args = process.argv.slice(2)
  const command = args[0]
  
  if (!command || !['generate', 'use-existing', 'export', 'import', 'verify'].includes(command)) {
    console.log('Usage:')
    console.log('  npx tsx scripts/setup-ring-hub-keys.ts generate')
    console.log('  npx tsx scripts/setup-ring-hub-keys.ts use-existing')
    console.log('  npx tsx scripts/setup-ring-hub-keys.ts export')
    console.log('  npx tsx scripts/setup-ring-hub-keys.ts import <base64-data>')
    console.log('  npx tsx scripts/setup-ring-hub-keys.ts verify')
    console.log('')
    console.log('Commands:')
    console.log('  generate     - Generate new keys and save to files')
    console.log('  use-existing - Use current production keys, show env vars to set')
    console.log('  export       - Export current keys for copying to other servers')
    console.log('  import       - Import keys from another server')
    console.log('  verify       - Check if keys are consistent')
    return
  }
  
  switch (command) {
    case 'generate':
      await generateKeys()
      break
    case 'use-existing':
      await useExistingKeys()
      break
    case 'export':
      await exportKeys()
      break
    case 'import':
      await importKeys(args[1])
      break
    case 'verify':
      await verifyKeys()
      break
  }
}

async function generateKeys() {
  console.log('🔑 Generating new Ring Hub keys...')

  // Only the SERVER keypair file is affected by server-key setup.
  const keypairFile = join(process.cwd(), '.threadstead-server-keypair.json')
  const userDidsFile = join(process.cwd(), '.threadstead-user-dids.json')

  try {
    await fs.unlink(keypairFile)
    console.log('   ✅ Deleted existing server keypair file')
  } catch (error) {
    console.log('   ℹ️  No existing server keypair file to delete')
  }

  // SAFETY: never delete USER DID data as a side effect of server-key setup.
  // Deleting user DIDs re-mints every user's key and locks them out of their rings.
  // Require an explicit --nuke-user-dids flag to touch user data.
  const nukeUserDids = process.argv.includes('--nuke-user-dids')
  if (nukeUserDids) {
    console.warn('   ⚠️ --nuke-user-dids passed: deleting user DID data (this re-mints user keys!)')
    try {
      await fs.unlink(userDidsFile)
      console.log('   ✅ Deleted existing user DIDs file')
    } catch (error) {
      console.log('   ℹ️  No existing user DIDs file to delete')
    }
  } else {
    console.log('   🔒 Preserving user DID data (pass --nuke-user-dids to delete it).')
  }

  // Generate new keypair
  const domain = getDomainFromEnvironment()
  console.log('   🌐 Domain:', domain)
  
  const keypair = await generateServerKeypair(domain)
  
  console.log('\n✅ New keys generated!')
  await showKeypairInfo(keypair)
  await generateEnvVars(keypair)
  await generateRingHubClientCode(keypair)
}

async function useExistingKeys() {
  console.log('🔍 Using existing production keys...')
  
  // Try to get current keypair
  try {
    const { getOrCreateServerKeypair, generateDIDDocument } = await import('@/lib/api/did/server-did-client')
    const keypair = await getOrCreateServerKeypair()
    const didDoc = await generateDIDDocument()
    const publicKeyMultibase = didDoc.verificationMethod?.[0]?.publicKeyMultibase
    
    console.log('\n📋 Current production keypair:')
    await showKeypairInfo(keypair)
    
    if (publicKeyMultibase) {
      const fullKeypair = { ...keypair, publicKeyMultibase }
      await generateEnvVars(fullKeypair)
      await generateRingHubClientCode(fullKeypair)
    }
    
  } catch (error) {
    console.error('❌ Failed to get existing keys:', error)
  }
}

async function exportKeys() {
  console.log('📦 Exporting keys for other servers...')
  
  try {
    const { exportServerIdentity } = await import('@/lib/api/did/server-did-client')
    const exportData = await exportServerIdentity()
    
    console.log('\n📄 Export data (copy this to other server):')
    console.log('=' .repeat(50))
    console.log(exportData)
    console.log('=' .repeat(50))
    
    // Also save to file
    const exportFile = join(process.cwd(), 'ring-hub-keys-export.txt')
    await fs.writeFile(exportFile, exportData, 'utf-8')
    console.log('\n💾 Saved to file:', exportFile)
    
  } catch (error) {
    console.error('❌ Export failed:', error)
  }
}

async function importKeys(exportData?: string) {
  console.log('📥 Importing keys from another server...')
  
  if (!exportData) {
    // Try to read from file
    const exportFile = join(process.cwd(), 'ring-hub-keys-export.txt')
    try {
      exportData = await fs.readFile(exportFile, 'utf-8')
      console.log('   📄 Reading from:', exportFile)
    } catch (error) {
      console.error('❌ No import data provided and no ring-hub-keys-export.txt file found')
      console.log('Usage: npx tsx scripts/setup-ring-hub-keys.ts import <base64-data>')
      return
    }
  }
  
  try {
    const { importServerIdentity, getOrCreateServerKeypair, generateDIDDocument } = await import('@/lib/api/did/server-did-client')
    
    // Import the identity
    await importServerIdentity(exportData!)
    console.log('   ✅ Keys imported successfully')
    
    // Show the imported keypair
    const keypair = await getOrCreateServerKeypair()
    const didDoc = await generateDIDDocument()
    const publicKeyMultibase = didDoc.verificationMethod?.[0]?.publicKeyMultibase
    
    console.log('\n📋 Imported keypair:')
    await showKeypairInfo(keypair)
    
    if (publicKeyMultibase) {
      const fullKeypair = { ...keypair, publicKeyMultibase }
      await generateEnvVars(fullKeypair)
      await generateRingHubClientCode(fullKeypair)
    }
    
  } catch (error) {
    console.error('❌ Import failed:', error)
  }
}

async function verifyKeys() {
  console.log('🔍 Verifying key consistency...')
  
  try {
    // Get local keys
    const { getOrCreateServerKeypair, generateDIDDocument } = await import('@/lib/api/did/server-did-client')
    const keypair = await getOrCreateServerKeypair()
    const didDoc = await generateDIDDocument()
    const localPublicKey = didDoc.verificationMethod?.[0]?.publicKeyMultibase
    
    console.log('   📋 Local DID document key:', localPublicKey)
    
    // Check production DID document
    try {
      const response = await fetch('https://homepageagain.com/.well-known/did.json')
      if (response.ok) {
        const prodDidDoc = await response.json()
        const prodPublicKey = prodDidDoc.verificationMethod?.[0]?.publicKeyMultibase
        
        console.log('   🌐 Production DID document key:', prodPublicKey)
        
        if (localPublicKey === prodPublicKey) {
          console.log('   ✅ Keys MATCH! Ring Hub authentication should work')
        } else {
          console.log('   ❌ Keys MISMATCH! Ring Hub authentication will fail')
          console.log('\n💡 To fix:')
          console.log('   1. Run this script with "export" on the server with correct keys')
          console.log('   2. Run this script with "import" on the server with wrong keys')
          console.log('   3. Restart both servers')
        }
      } else {
        console.log('   ❌ Could not fetch production DID document')
      }
    } catch (error) {
      console.log('   ❌ Error checking production DID document:', error)
    }
    
    // Check Ring Hub client
    const { getRingHubClient } = await import('@/lib/api/ringhub/ringhub-client')
    const client = getRingHubClient()
    
    if (client) {
      const clientKey = (client as any).publicKeyMultibase
      console.log('   🤖 Ring Hub client key:', clientKey)
      
      if (localPublicKey === clientKey) {
        console.log('   ✅ Client key matches local key')
      } else {
        console.log('   ❌ Client key does not match local key')
        console.log('   💡 Update the hardcoded client or use environment variables')
      }
    } else {
      console.log('   ❌ Ring Hub client not available')
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error)
  }
}

async function showKeypairInfo(keypair: KeypairData) {
  console.log('   DID:', keypair.did)
  console.log('   Public Key (base64url):', keypair.publicKey)
  console.log('   Private Key (base64url):', keypair.secretKey.substring(0, 20) + '...')
  console.log('   Created:', keypair.created)
  
  // Generate multibase public key
  try {
    const { fromBase64Url } = await import('@/lib/utils/encoding/base64url')
    const ed = await import('@noble/ed25519')
    const bs58 = await import('bs58')
    
    const publicKeyBytes = fromBase64Url(keypair.publicKey)
    const multicodecPrefix = Buffer.from([0xed, 0x01])
    const multicodecKey = Buffer.concat([multicodecPrefix, publicKeyBytes])
    const publicKeyMultibase = 'z' + bs58.default.encode(multicodecKey)
    
    console.log('   Public Key (multibase):', publicKeyMultibase)
  } catch (error) {
    console.log('   ⚠️  Could not generate multibase key')
  }
}

async function generateEnvVars(keypair: KeypairData & { publicKeyMultibase?: string }) {
  console.log('\n📝 Environment Variables to set:')
  console.log('================================')
  console.log('Add these to your .env file:')
  console.log('')
  console.log(`THREADSTEAD_DID="${keypair.did}"`)
  console.log(`THREADSTEAD_PRIVATE_KEY_B64URL="${keypair.secretKey}"`)
  
  if (keypair.publicKeyMultibase) {
    console.log(`THREADSTEAD_PUBLIC_KEY_MULTIBASE="${keypair.publicKeyMultibase}"`)
  }
  
  console.log('NEXT_PUBLIC_USE_RING_HUB=true')
  console.log('RING_HUB_URL="https://ringhub.io"')
  console.log('')
}

async function generateRingHubClientCode(keypair: KeypairData & { publicKeyMultibase?: string }) {
  if (!keypair.publicKeyMultibase) return
  
  console.log('📝 Ring Hub Client Code:')
  console.log('========================')
  console.log('Update createThreadSteadRingHubClient() in lib/ringhub-client.ts:')
  console.log('')
  console.log('export function createThreadSteadRingHubClient(): RingHubClient {')
  console.log('  return new RingHubClient({')
  console.log('    baseUrl: "https://ringhub.io",')
  console.log(`    instanceDID: "${keypair.did}",`)
  console.log(`    privateKeyBase64Url: "${keypair.secretKey}",`)
  console.log(`    publicKeyMultibase: "${keypair.publicKeyMultibase}"`)
  console.log('  })')
  console.log('}')
  console.log('')
}

function getDomainFromEnvironment(): string {
  // Extract domain from THREADSTEAD_DID if available
  if (process.env.THREADSTEAD_DID?.startsWith('did:web:')) {
    return process.env.THREADSTEAD_DID.replace('did:web:', '').replace(/%3A/g, ':')
  }
  
  // Extract from NEXT_PUBLIC_BASE_URL
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    const url = new URL(process.env.NEXT_PUBLIC_BASE_URL)
    return url.host
  }
  
  // Fallback to SITE_HANDLE_DOMAIN
  if (process.env.SITE_HANDLE_DOMAIN) {
    return process.env.SITE_HANDLE_DOMAIN.toLowerCase()
  }
  
  // Default fallback
  return 'localhost:3000'
}

setupRingHubKeys().catch(console.error)