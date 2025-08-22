#!/usr/bin/env npx tsx

/**
 * Test DID Document Accessibility from Different Perspectives
 * 
 * Check if there are any issues with how Ring Hub might see the DID document
 */

// Load environment variables using Next.js's @next/env
import { loadEnvConfig } from '@next/env'
const projectDir = process.cwd()
loadEnvConfig(projectDir)

async function testDIDAccess() {
  console.log('🔍 Testing DID Document Accessibility')
  console.log('====================================')
  
  const didUrl = 'https://homepageagain.com/.well-known/did.json'
  
  console.log(`\n📋 Testing: ${didUrl}`)
  
  try {
    const response = await fetch(didUrl, {
      headers: {
        'User-Agent': 'Ring-Hub-Client/1.0',
        'Accept': 'application/json, application/did+json'
      }
    })
    
    console.log(`Status: ${response.status} ${response.statusText}`)
    console.log('Headers:')
    response.headers.forEach((value, key) => {
      console.log(`   ${key}: ${value}`)
    })
    
    if (response.ok) {
      const didDoc = await response.json()
      console.log('\n📄 DID Document:')
      console.log(JSON.stringify(didDoc, null, 2))
      
      // Validate the structure
      console.log('\n✅ Validation:')
      console.log(`   ID: ${didDoc.id}`)
      console.log(`   Verification Methods: ${didDoc.verificationMethod?.length || 0}`)
      
      if (didDoc.verificationMethod?.[0]) {
        const vm = didDoc.verificationMethod[0]
        console.log(`   Key ID: ${vm.id}`)
        console.log(`   Key Type: ${vm.type}`)
        console.log(`   Controller: ${vm.controller}`)
        if (vm.publicKeyMultibase) {
          console.log(`   Public Key (multibase): ${vm.publicKeyMultibase}`)
        }
        if (vm.publicKeyBase64) {
          console.log(`   Public Key (base64): ${vm.publicKeyBase64}`)
        }
      }
      
      // Check if we have the dual key format
      if (didDoc.verificationMethod?.[1]) {
        const vm2 = didDoc.verificationMethod[1]
        console.log('\n🔑 Second verification method:')
        console.log(`   Key ID: ${vm2.id}`)
        console.log(`   Key Type: ${vm2.type}`)
        if (vm2.publicKeyBase64) {
          console.log(`   Public Key (base64): ${vm2.publicKeyBase64}`)
        }
      }
      
    } else {
      const errorText = await response.text()
      console.log(`❌ Error: ${errorText}`)
    }
    
  } catch (error) {
    console.log(`❌ Fetch failed: ${error instanceof Error ? error.message : error}`)
  }
  
  // Also test the direct API endpoint
  console.log('\n🔍 Testing direct API endpoint...')
  const apiUrl = 'https://homepageagain.com/api/.well-known/did.json'
  
  try {
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Ring-Hub-Client/1.0',
        'Accept': 'application/json, application/did+json'
      }
    })
    
    console.log(`API Status: ${response.status} ${response.statusText}`)
    
    if (response.ok) {
      const didDoc = await response.json()
      console.log('✅ API endpoint accessible')
      
      // Quick comparison
      const firstKey = didDoc.verificationMethod?.[0]?.publicKeyMultibase
      console.log(`First key: ${firstKey}`)
      
    } else {
      console.log('❌ API endpoint failed')
    }
    
  } catch (error) {
    console.log(`❌ API fetch failed: ${error instanceof Error ? error.message : error}`)
  }
}

testDIDAccess().catch(console.error)