#!/usr/bin/env npx tsx

/**
 * Import Server Keypair on Production
 * 
 * This script imports a server keypair exported from another environment
 */

// Load environment variables using Next.js's @next/env
import { loadEnvConfig } from '@next/env'
const projectDir = process.cwd()
loadEnvConfig(projectDir)

import { importServerIdentity } from '@/lib/api/did/server-did-client'
import { promises as fs } from 'fs'
import { join } from 'path'

async function main() {
  console.log('📥 Importing ThreadStead Server Identity')
  console.log('=====================================')
  
  const args = process.argv.slice(2)
  const importFile = args[0] || 'server-identity-export.txt'
  
  console.log('   Import file:', importFile)
  
  try {
    // Check if the import file exists
    const importFilePath = join(process.cwd(), importFile)
    const exportData = await fs.readFile(importFilePath, 'utf-8')
    
    console.log('✅ Found import file')
    console.log('   Size:', exportData.length, 'characters')
    
    // Import the identity
    console.log('\n📦 Importing server identity...')
    await importServerIdentity(exportData)
    
    console.log('✅ Import complete!')
    console.log('\n🔄 Server identity has been updated')
    console.log('   - Server keypair imported')
    console.log('   - User DID mappings imported')
    
    console.log('\n🧪 Test the import:')
    console.log('   Run: npm run ringhub:debug')
    console.log('   Or: npx tsx scripts/show-server-keys.ts')
    
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      console.error(`❌ Import file not found: ${importFile}`)
      console.error('   Make sure you copied the export file to this directory')
    } else {
      console.error('❌ Import failed:', error)
    }
    process.exit(1)
  }
}

main().catch(console.error)