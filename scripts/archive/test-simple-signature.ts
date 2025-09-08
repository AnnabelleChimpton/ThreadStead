#!/usr/bin/env npx tsx

/**
 * Test Simplified HTTP Signature for Ring Hub
 * 
 * Try a minimal HTTP signature format to see if Ring Hub prefers it
 */

// Load environment variables using Next.js's @next/env
import { loadEnvConfig } from '@next/env'
const projectDir = process.cwd()
loadEnvConfig(projectDir)

import { signMessageAsServer, getServerDID } from '@/lib/api/did/server-did-client'
import crypto from 'crypto'

async function testSimpleSignature() {
  console.log('🧪 Testing Simplified HTTP Signature')
  console.log('===================================')
  
  const ringHubUrl = 'https://ringhub.io'
  const method = 'POST'
  const path = '/trp/rings'
  
  const serverDID = await getServerDID()
  console.log('Server DID:', serverDID)
  
  // Simple test data
  const testRing = {
    name: 'Simple Test Ring',
    description: 'Test with minimal signature',
    visibility: 'PRIVATE',
    joinPolicy: 'CLOSED',
    postPolicy: 'CLOSED'
  }
  
  const bodyString = JSON.stringify(testRing)
  const date = new Date().toUTCString()
  
  // Basic headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Host': 'ringhub.io',
    'Date': date,
    'Content-Length': bodyString.length.toString()
  }
  
  // Add digest
  const hash = crypto.createHash('sha256').update(bodyString).digest('base64')
  headers['Digest'] = `sha-256=${hash}`
  
  console.log('\n📋 Request headers:')
  Object.entries(headers).forEach(([key, value]) => {
    console.log(`   ${key}: ${value}`)
  })
  
  // Try different signature formats
  
  // Format 1: Minimal signature string
  const signingString1 = [
    `(request-target): ${method.toLowerCase()} ${path}`,
    `date: ${date}`
  ].join('\n')
  
  console.log('\n🔐 Format 1: Minimal signature string')
  console.log(signingString1)
  
  const signature1 = await signMessageAsServer(signingString1)
  const authHeader1 = `Signature keyId="${serverDID}#key-1",algorithm="ed25519",headers="(request-target) date",signature="${signature1}"`
  
  console.log('Authorization header:')
  console.log(authHeader1)
  
  // Format 2: Include digest
  const signingString2 = [
    `(request-target): ${method.toLowerCase()} ${path}`,
    `host: ringhub.io`,
    `date: ${date}`,
    `digest: ${headers['Digest']}`
  ].join('\n')
  
  console.log('\n🔐 Format 2: With digest')
  console.log(signingString2)
  
  const signature2 = await signMessageAsServer(signingString2)
  const authHeader2 = `Signature keyId="${serverDID}#key-1",algorithm="ed25519",headers="(request-target) host date digest",signature="${signature2}"`
  
  console.log('Authorization header:')
  console.log(authHeader2)
  
  // Test both formats
  for (const [format, authHeader] of [['Format 1 (minimal)', authHeader1], ['Format 2 (with digest)', authHeader2]]) {
    console.log(`\n🚀 Testing ${format}...`)
    
    try {
      const response = await fetch(`${ringHubUrl}${path}`, {
        method,
        headers: {
          ...headers,
          'Authorization': authHeader
        },
        body: bodyString
      })
      
      console.log(`   Status: ${response.status} ${response.statusText}`)
      
      if (!response.ok) {
        const errorData = await response.text()
        console.log(`   Error: ${errorData}`)
      } else {
        const result = await response.json()
        console.log(`   ✅ Success! Ring created:`, result)
        
        // Clean up if successful
        try {
          const deleteResponse = await fetch(`${ringHubUrl}/trp/rings/${result.slug}`, {
            method: 'DELETE',
            headers: {
              'Authorization': authHeader
            }
          })
          if (deleteResponse.ok) {
            console.log('   🧹 Test ring cleaned up')
          }
        } catch (cleanupError) {
          console.log('   ⚠️ Could not clean up test ring')
        }
        
        break // Success, no need to try other formats
      }
    } catch (error) {
      console.log(`   ❌ Request failed:`, error instanceof Error ? error.message : error)
    }
  }
  
  console.log('\n💭 If both formats fail, the issue is likely:')
  console.log('   1. Ring Hub actor verification cache (wait 10-15 minutes)')
  console.log('   2. DID document not accessible to Ring Hub')
  console.log('   3. Ring Hub expects different key format')
}

testSimpleSignature().catch(console.error)