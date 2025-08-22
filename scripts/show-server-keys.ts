#!/usr/bin/env npx tsx

/**
 * Show Server Keys for Ring Hub Configuration
 * 
 * This script shows the actual server keys and what environment variables you need
 */

// Load environment variables using Next.js's @next/env
import { loadEnvConfig } from '@next/env'
const projectDir = process.cwd()
loadEnvConfig(projectDir)

import { getOrCreateServerKeypair, generateDIDDocument } from '@/lib/server-did-client'

async function main() {
  console.log('🔑 ThreadStead Server Keys')
  console.log('========================')
  
  try {
    // Get the actual server keypair
    const keypair = await getOrCreateServerKeypair()
    
    console.log('\n📋 Current Server Keypair:')
    console.log('   DID:', keypair.did)
    console.log('   Public Key (base64url):', keypair.publicKey)
    console.log('   Private Key (base64url):', keypair.secretKey)
    console.log('   Created:', keypair.created)
    
    // Generate the DID document to get the multibase public key
    const didDoc = await generateDIDDocument()
    const keyMethod = didDoc.verificationMethod?.[0]
    
    console.log('\n📋 DID Document Keys:')
    if (keyMethod?.publicKeyMultibase) {
      console.log('   Public Key (multibase):', keyMethod.publicKeyMultibase)
    }
    if (didDoc.verificationMethod?.[1]?.publicKeyBase64) {
      console.log('   Public Key (base64):', didDoc.verificationMethod[1].publicKeyBase64)
    }
    
    console.log('\n🔧 Environment Variables Needed:')
    console.log('   THREADSTEAD_DID="' + keypair.did + '"')
    console.log('   THREADSTEAD_PRIVATE_KEY_B64URL="' + keypair.secretKey + '"')
    if (keyMethod?.publicKeyMultibase) {
      console.log('   THREADSTEAD_PUBLIC_KEY_MULTIBASE="' + keyMethod.publicKeyMultibase + '"')
    }
    
    console.log('\n⚠️  COMPARISON WITH HARDCODED VALUES:')
    console.log('   Current DID:', keypair.did)
    console.log('   Hardcoded DID: did:web:homepageagain.com')
    console.log('   Match:', keypair.did === 'did:web:homepageagain.com' ? '✅' : '❌')
    
    console.log('\n   Current Private Key:', keypair.secretKey)
    console.log('   Hardcoded Private Key: ZHKcPS3yXew3cDBVwXdufAPXL6bT4E1-qVxrDnu2W2g')
    console.log('   Match:', keypair.secretKey === 'ZHKcPS3yXew3cDBVwXdufAPXL6bT4E1-qVxrDnu2W2g' ? '✅' : '❌')
    
    if (keyMethod?.publicKeyMultibase) {
      console.log('\n   Current Public Key (multibase):', keyMethod.publicKeyMultibase)
      console.log('   Hardcoded Public Key (multibase): z6MkobdPZAxTYoFfh79Zc6HvUcJrk9wHKm9QAMxwFwMPrpgj')
      console.log('   Match:', keyMethod.publicKeyMultibase === 'z6MkobdPZAxTYoFfh79Zc6HvUcJrk9wHKm9QAMxwFwMPrpgj' ? '✅' : '❌')
    }
    
    console.log('\n💡 SOLUTION:')
    console.log('Either:')
    console.log('1. Add the environment variables above to your .env file')
    console.log('2. OR update the hardcoded values in createThreadSteadRingHubClient()')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

main().catch(console.error)