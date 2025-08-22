#!/usr/bin/env npx tsx

/**
 * Trace Key Sources - DID Document vs Ring Hub Client
 * 
 * This script traces exactly where each key comes from to identify mismatches
 */

// Load environment variables using Next.js's @next/env
import { loadEnvConfig } from '@next/env'
const projectDir = process.cwd()
loadEnvConfig(projectDir)

import { generateDIDDocument, getOrCreateServerKeypair } from '@/lib/server-did-client'
import { getRingHubClient } from '@/lib/ringhub-client'
import { promises as fs } from 'fs'
import { join } from 'path'

async function traceKeySources() {
  console.log('🔍 Tracing Key Sources')
  console.log('=====================')
  
  // 1. DID Document Key Source
  console.log('\n📄 1. DID DOCUMENT KEY SOURCE:')
  console.log('   Path: generateDIDDocument() -> getOrCreateServerKeypair()')
  
  try {
    const didDoc = await generateDIDDocument()
    const firstVM = didDoc.verificationMethod?.[0]
    
    console.log('   ✅ DID Document generated')
    console.log('   📋 First verification method:')
    console.log('      Key ID:', firstVM?.id)
    console.log('      Public Key (multibase):', firstVM?.publicKeyMultibase)
    
    if (didDoc.verificationMethod?.[1]) {
      const secondVM = didDoc.verificationMethod[1]
      console.log('   📋 Second verification method:')
      console.log('      Key ID:', secondVM?.id)
      console.log('      Public Key (base64):', secondVM?.publicKeyBase64)
    }
    
  } catch (error) {
    console.log('   ❌ Failed to generate DID document:', error)
  }
  
  // 2. Server Keypair Source (what DID document uses internally)
  console.log('\n🔑 2. SERVER KEYPAIR SOURCE (DID document internal):')
  
  try {
    const serverKeypair = await getOrCreateServerKeypair()
    console.log('   ✅ Server keypair loaded')
    console.log('   📋 Details:')
    console.log('      DID:', serverKeypair.did)
    console.log('      Public Key (base64url):', serverKeypair.publicKey)
    console.log('      Private Key (base64url):', serverKeypair.secretKey.substring(0, 20) + '...')
    console.log('      Created:', serverKeypair.created)
    console.log('   📁 Source: getOrCreateServerKeypair() checks:')
    console.log('      1. loadServerKeypair() - reads .threadstead-server-keypair.json')
    console.log('      2. If not found, generates new from getDomainFromEnvironment()')
    
    // Check if file exists
    const keypairFile = join(process.cwd(), '.threadstead-server-keypair.json')
    try {
      await fs.access(keypairFile)
      const fileContent = await fs.readFile(keypairFile, 'utf-8')
      const fileData = JSON.parse(fileContent)
      console.log('   📄 File exists: .threadstead-server-keypair.json')
      console.log('      Public Key:', fileData.publicKey)
      console.log('      Private Key:', fileData.secretKey?.substring(0, 20) + '...')
      console.log('      Created:', fileData.created)
    } catch (fileError) {
      console.log('   📄 File NOT found: .threadstead-server-keypair.json')
      console.log('      Would generate new keypair from environment')
    }
    
  } catch (error) {
    console.log('   ❌ Failed to get server keypair:', error)
  }
  
  // 3. Ring Hub Client Key Source
  console.log('\n🚀 3. RING HUB CLIENT KEY SOURCE:')
  
  try {
    const client = getRingHubClient()
    if (!client) {
      console.log('   ❌ Ring Hub client not available')
      console.log('   📋 Checking environment variables:')
      console.log('      RING_HUB_URL:', process.env.RING_HUB_URL || 'NOT SET')
      console.log('      THREADSTEAD_DID:', process.env.THREADSTEAD_DID || 'NOT SET')
      console.log('      THREADSTEAD_PRIVATE_KEY_B64URL:', process.env.THREADSTEAD_PRIVATE_KEY_B64URL ? 'SET' : 'NOT SET')
      console.log('      THREADSTEAD_PUBLIC_KEY_MULTIBASE:', process.env.THREADSTEAD_PUBLIC_KEY_MULTIBASE || 'NOT SET')
      
      // Check hardcoded client
      console.log('   🔧 Checking hardcoded createThreadSteadRingHubClient():')
      try {
        const { createThreadSteadRingHubClient } = await import('@/lib/ringhub-client')
        const hardcodedClient = createThreadSteadRingHubClient()
        
        // Access private properties through type casting
        const clientAny = hardcodedClient as any
        console.log('      ✅ Hardcoded client created')
        console.log('      Instance DID:', clientAny.instanceDID)
        console.log('      Public Key (multibase):', clientAny.publicKeyMultibase)
        // Private key is converted to crypto.KeyObject, can't easily display
        console.log('      Private Key: [KeyObject - converted from base64url]')
        
      } catch (hardcodedError) {
        console.log('      ❌ Failed to create hardcoded client:', hardcodedError)
      }
      
    } else {
      console.log('   ✅ Ring Hub client created from environment')
      const clientAny = client as any
      console.log('   📋 Client details:')
      console.log('      Instance DID:', clientAny.instanceDID)
      console.log('      Public Key (multibase):', clientAny.publicKeyMultibase)
    }
    
  } catch (error) {
    console.log('   ❌ Failed to check Ring Hub client:', error)
  }
  
  // 4. Key Comparison
  console.log('\n⚖️  4. KEY COMPARISON:')
  
  try {
    // Get all the keys for comparison
    const didDoc = await generateDIDDocument()
    const serverKeypair = await getOrCreateServerKeypair()
    
    const didPublicKeyMultibase = didDoc.verificationMethod?.[0]?.publicKeyMultibase
    const serverPublicKey = serverKeypair.publicKey
    const serverPrivateKey = serverKeypair.secretKey
    
    // Environment variables
    const envPrivateKey = process.env.THREADSTEAD_PRIVATE_KEY_B64URL
    const envPublicKeyMultibase = process.env.THREADSTEAD_PUBLIC_KEY_MULTIBASE
    
    // Hardcoded values (we need to extract these from the client code)
    const { createThreadSteadRingHubClient } = await import('@/lib/ringhub-client')
    const hardcodedClient = createThreadSteadRingHubClient()
    const hardcodedPublicKey = (hardcodedClient as any).publicKeyMultibase
    
    console.log('   📊 Comparison:')
    console.log('   ┌─ DID Document Public Key (multibase):     ', didPublicKeyMultibase)
    console.log('   ├─ Server Keypair Private Key (base64url): ', serverPrivateKey?.substring(0, 20) + '...')
    console.log('   ├─ Environment Private Key (base64url):    ', envPrivateKey?.substring(0, 20) + '...')
    console.log('   ├─ Environment Public Key (multibase):     ', envPublicKeyMultibase)
    console.log('   └─ Hardcoded Client Public Key (multibase): ', hardcodedPublicKey)
    
    console.log('\n   ✅ Match Analysis:')
    console.log('      DID Doc ↔ Environment Public:  ', (didPublicKeyMultibase === envPublicKeyMultibase) ? '✅ MATCH' : '❌ MISMATCH')
    console.log('      DID Doc ↔ Hardcoded Client:    ', (didPublicKeyMultibase === hardcodedPublicKey) ? '✅ MATCH' : '❌ MISMATCH')
    console.log('      Server ↔ Environment Private:  ', (serverPrivateKey === envPrivateKey) ? '✅ MATCH' : '❌ MISMATCH')
    console.log('      Environment ↔ Hardcoded:       ', (envPublicKeyMultibase === hardcodedPublicKey) ? '✅ MATCH' : '❌ MISMATCH')
    
    // The key insight
    console.log('\n💡 DIAGNOSIS:')
    if (didPublicKeyMultibase === hardcodedPublicKey) {
      console.log('   ✅ DID document and Ring Hub client use the SAME public key')
      console.log('   ✅ This means they are from the same keypair')
      console.log('   → Issue is likely: Ring Hub actor verification cache or signature format')
    } else {
      console.log('   ❌ DID document and Ring Hub client use DIFFERENT public keys')
      console.log('   ❌ This means they are from DIFFERENT keypairs')
      console.log('   → Issue: Ring Hub client signs with one key, DID document shows another')
      console.log('')
      console.log('   🔧 SOLUTION: Make them match by either:')
      console.log('      A) Update hardcoded client to use DID document key, OR')
      console.log('      B) Update server keypair to match hardcoded client key')
    }
    
  } catch (error) {
    console.log('   ❌ Failed to compare keys:', error)
  }
}

traceKeySources().catch(console.error)