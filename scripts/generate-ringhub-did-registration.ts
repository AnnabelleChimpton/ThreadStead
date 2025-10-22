#!/usr/bin/env npx tsx

/**
 * Generate Ring Hub DID Registration SQL
 * 
 * Creates SQL statements to register ThreadStead user DIDs with Ring Hub
 * This allows Ring Hub to recognize and authenticate user DIDs
 */

// Load environment variables
import { loadEnvConfig } from '@next/env'
const projectDir = process.cwd()
loadEnvConfig(projectDir)

import { loadUserDIDMappings, generateUserDIDDocument } from '@/lib/api/did/server-did-client'
import { fromBase64Url } from '@/lib/utils/encoding/base64url'

async function generateRegistrationSQL() {
  console.log('🔐 Generating Ring Hub DID Registration SQL')
  console.log('==========================================')

  try {
    const mappings = await loadUserDIDMappings()
    console.log(`📊 Found ${mappings.length} user DIDs to register`)
    
    if (mappings.length === 0) {
      console.log('❌ No user DIDs found. Run `npm run user-did:migrate` first.')
      return
    }

    const sqlStatements: string[] = []

    console.log('\n📝 Generating SQL statements...')
    
    for (const mapping of mappings) {
      // Skip old did:key format
      if (mapping.did.startsWith('did:key:')) {
        console.log(`⚠️ Skipping old format DID: ${mapping.did}`)
        continue
      }

      // Generate DID document to get public key
      const didDocument = await generateUserDIDDocument(mapping)
      const publicKeyBase64 = didDocument.verificationMethod[0].publicKeyBase64
      
      // Create SQL statement to register this DID with Ring Hub
      const keyId = `${mapping.did}#key-1`
      const sqlStatement = `INSERT INTO "HttpSignature" (id, "keyId", "publicKey", "actorDid", "createdAt", "updatedAt", "trusted") VALUES (gen_random_uuid(), '${keyId}', '${publicKeyBase64}', '${mapping.did}', NOW(), NOW(), true);`
      
      sqlStatements.push(sqlStatement)
      
      console.log(`   ✅ ${mapping.did}`)
    }

    if (sqlStatements.length === 0) {
      console.log('❌ No did:web DIDs found. Run `npm run user-did:migrate` first.')
      return
    }

    console.log(`\n📄 Generated ${sqlStatements.length} SQL statements`)
    console.log('\n' + '='.repeat(80))
    console.log('SQL STATEMENTS TO REGISTER USER DIDS WITH RING HUB')
    console.log('='.repeat(80))
    console.log('-- Copy and run these statements in your Ring Hub database:\n')

    for (const statement of sqlStatements) {
      console.log(statement)
    }

    console.log('\n' + '='.repeat(80))
    console.log('\n🚨 IMPORTANT INSTRUCTIONS:')
    console.log('1. Copy the SQL statements above')
    console.log('2. Connect to your Ring Hub database')
    console.log('3. Run the SQL statements to register the user DIDs')  
    console.log('4. Restart Ring Hub to ensure the new keys are loaded')
    console.log('5. Test user operations (join, fork, etc.) with Ring Hub')

    console.log('\n💡 Alternative: For development, user operations will')
    console.log('   fall back to server DID but with user attribution.')

  } catch (error) {
    console.error('❌ SQL generation failed:', error)
    process.exit(1)
  }
}

async function main() {
  await generateRegistrationSQL()
}

main().catch(error => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})