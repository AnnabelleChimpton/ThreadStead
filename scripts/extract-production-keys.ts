#!/usr/bin/env npx tsx

/**
 * Extract Production Keys from DID Document
 * 
 * This script fetches the production DID document and extracts the keypair
 * Unfortunately, we can only get the public key - the private key would need 
 * to be found on the production server
 */

import crypto from 'crypto'
import bs58 from 'bs58'

async function extractProductionKeys() {
  console.log('🔍 Extracting Production Keys')
  console.log('============================')
  
  const didUrl = 'https://homepageagain.com/.well-known/did.json'
  
  try {
    const response = await fetch(didUrl)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const didDoc = await response.json()
    const firstVM = didDoc.verificationMethod?.[0]
    
    console.log('📄 Production DID Document:')
    console.log('   DID:', didDoc.id)
    console.log('   Public Key (multibase):', firstVM?.publicKeyMultibase)
    
    if (firstVM?.publicKeyMultibase) {
      // Convert multibase to base64url for keypair format
      const multibase = firstVM.publicKeyMultibase
      
      // Remove 'z' prefix and decode from base58
      const base58Data = multibase.substring(1)
      const decoded = bs58.decode(base58Data)
      
      // Remove the multicodec prefix (first 2 bytes: 0xed, 0x01)
      const publicKeyBytes = decoded.slice(2)
      
      // Convert to base64url
      const publicKeyBase64Url = Buffer.from(publicKeyBytes)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')
      
      console.log('   Public Key (base64url):', publicKeyBase64Url)
      
      console.log('\n🔑 Production Keypair Structure:')
      console.log('   You need to find this on your production server:')
      console.log('   {')
      console.log('     "publicKey": "' + publicKeyBase64Url + '",')
      console.log('     "secretKey": "UNKNOWN - must get from production server",')
      console.log('     "did": "' + didDoc.id + '",')
      console.log('     "created": "UNKNOWN"')
      console.log('   }')
      
      console.log('\n📁 Where to find the private key on production:')
      console.log('   1. Check: /path/to/your/app/.threadstead-server-keypair.json')
      console.log('   2. Or check environment variables:')
      console.log('      - THREADSTEAD_PRIVATE_KEY_B64URL')
      console.log('   3. Or check if stored in a secret management system')
      
      console.log('\n🔄 Two Options:')
      console.log('   A) Find production private key and update local client to match')
      console.log('   B) Replace production keypair with your local keypair (what we tried)')
      
      console.log('\n💡 To update your Ring Hub client with production key:')
      console.log('   Update createThreadSteadRingHubClient() with:')
      console.log('   publicKeyMultibase: "' + multibase + '"')
      console.log('   privateKeyBase64Url: "NEED_FROM_PRODUCTION_SERVER"')
    }
    
  } catch (error) {
    console.error('❌ Failed to extract production keys:', error)
  }
}

extractProductionKeys().catch(console.error)