#!/usr/bin/env tsx

/**
 * Initialize ThreadStead Server DID System
 * 
 * This script sets up the server keypair and DID identity for Ring Hub authentication
 */

// Load environment variables
import { config } from 'dotenv'
config({ path: '.env' })

import { 
  initializeServerDID, 
  generateDIDDocument,
  getOrCreateServerKeypair 
} from '../lib/api/did/server-did-client'

async function main() {
  console.log('🔐 Initializing ThreadStead Server DID System')
  console.log('=============================================\n')

  try {
    // Initialize server DID
    const { did, domain } = await initializeServerDID()
    
    console.log('✅ Server DID System Initialized')
    console.log(`   DID: ${did}`)
    console.log(`   Domain: ${domain}`)
    console.log()

    // Generate DID document
    const didDocument = await generateDIDDocument()
    console.log('✅ DID Document Generated')
    console.log('   Document preview:')
    console.log(`   {`)
    console.log(`     "id": "${didDocument.id}",`)
    console.log(`     "verificationMethod": [${didDocument.verificationMethod.length} methods],`)
    console.log(`     "authentication": [${didDocument.authentication.length} methods]`)
    console.log(`   }`)
    console.log()

    // Show verification URLs
    console.log('🌐 DID Resolution Endpoints')
    console.log(`   Local: http://${domain}/.well-known/did.json`)
    if (process.env.NEXT_PUBLIC_BASE_URL) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, '')
      console.log(`   Public: ${baseUrl}/.well-known/did.json`)
    }
    console.log()

    // Show Ring Hub configuration
    console.log('⚙️ Ring Hub Configuration')
    console.log(`   THREADSTEAD_DID="${did}"`)
    console.log(`   RING_HUB_URL="${process.env.RING_HUB_URL || 'http://localhost:3100'}"`)
    console.log()

    // Test DID document accessibility
    if (process.env.NEXT_PUBLIC_BASE_URL) {
      const didUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/.well-known/did.json`
      console.log('🧪 Testing DID Document Access...')
      
      try {
        const response = await fetch(didUrl)
        if (response.ok) {
          console.log(`   ✅ DID document accessible at ${didUrl}`)
        } else {
          console.log(`   ❌ DID document not accessible: ${response.status}`)
        }
      } catch (error) {
        console.log(`   ⚠️  Could not test DID document (server may not be running)`)
      }
      console.log()
    }

    console.log('🎯 Next Steps:')
    console.log('   1. Start your ThreadStead server')
    console.log('   2. Verify DID document is accessible at /.well-known/did.json')
    console.log('   3. Test Ring Hub authentication with the new DID')
    console.log('   4. Run integration tests to verify everything works')
    console.log()

    console.log('🚀 Server DID system is ready for Ring Hub integration!')

  } catch (error) {
    console.error('❌ Failed to initialize server DID system:', error)
    process.exit(1)
  }
}

main().catch(console.error)