#!/usr/bin/env npx tsx

/**
 * Generate Production Keypair JSON
 * 
 * Creates the .threadstead-server-keypair.json file based on environment variables
 */

// Load environment variables using Next.js's @next/env
import { loadEnvConfig } from '@next/env'
const projectDir = process.cwd()
loadEnvConfig(projectDir)

import { promises as fs } from 'fs'
import { join } from 'path'

async function generateProductionKeypair() {
  console.log('🔑 Generating Production Keypair JSON')
  console.log('===================================')
  
  // Get values from environment variables
  const did = process.env.THREADSTEAD_DID
  const privateKey = process.env.THREADSTEAD_PRIVATE_KEY_B64URL
  const publicKeyMultibase = process.env.THREADSTEAD_PUBLIC_KEY_MULTIBASE
  
  if (!did || !privateKey) {
    console.error('❌ Missing required environment variables:')
    console.error('   THREADSTEAD_DID:', did || 'NOT SET')
    console.error('   THREADSTEAD_PRIVATE_KEY_B64URL:', privateKey || 'NOT SET')
    process.exit(1)
  }
  
  // We need to convert the private key to public key in base64url format
  // For now, let's derive it from the multibase format or use a known conversion
  
  // The environment has the private key, but we need the public key in base64url
  // Let's use the server DID client to derive it properly
  
  try {
    // Import the conversion functions
    const { fromBase64Url, toBase64Url } = await import('@/lib/utils/encoding/base64url')
    const ed = await import('@noble/ed25519')
    
    // Convert private key from base64url and derive public key
    const secretBytes = fromBase64Url(privateKey)
    const publicKeyBytes = await ed.getPublicKeyAsync(secretBytes)
    const publicKeyB64Url = toBase64Url(publicKeyBytes)
    
    // Create the keypair object
    const keypair = {
      publicKey: publicKeyB64Url,
      secretKey: privateKey,
      did: did,
      created: new Date().toISOString()
    }
    
    console.log('✅ Generated keypair:')
    console.log('   DID:', keypair.did)
    console.log('   Public Key (b64url):', keypair.publicKey)
    console.log('   Private Key (b64url):', keypair.secretKey.substring(0, 20) + '...')
    console.log('   Created:', keypair.created)
    
    // Write to file
    const filePath = join(process.cwd(), '.threadstead-server-keypair.json')
    const fileContent = JSON.stringify(keypair, null, 2)
    
    await fs.writeFile(filePath, fileContent, { mode: 0o600 })
    
    console.log('\n📄 File written:', filePath)
    console.log('   Content length:', fileContent.length, 'characters')
    
    // Also show the content for copying to production
    console.log('\n📋 File content to copy to production:')
    console.log(fileContent)
    
    // Verify by showing what the multibase version would be
    if (publicKeyMultibase) {
      console.log('\n✅ Verification:')
      console.log('   Expected multibase:', publicKeyMultibase)
      
      // Generate multibase to compare
      const bs58 = await import('bs58')
      const multicodecPrefix = Buffer.from([0xed, 0x01])
      const multicodecKey = Buffer.concat([multicodecPrefix, publicKeyBytes])
      const generatedMultibase = 'z' + bs58.default.encode(multicodecKey)
      
      console.log('   Generated multibase:', generatedMultibase)
      console.log('   Match:', publicKeyMultibase === generatedMultibase ? '✅' : '❌')
    }
    
  } catch (error) {
    console.error('❌ Failed to generate keypair:', error)
    process.exit(1)
  }
}

generateProductionKeypair().catch(console.error)