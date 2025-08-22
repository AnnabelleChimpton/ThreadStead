#!/usr/bin/env npx tsx

/**
 * Export Server Keypair for Production Deployment
 * 
 * This script exports the local server keypair data so it can be imported on production
 */

// Load environment variables using Next.js's @next/env
import { loadEnvConfig } from '@next/env'
const projectDir = process.cwd()
loadEnvConfig(projectDir)

import { exportServerIdentity, getOrCreateServerKeypair } from '@/lib/server-did-client'
import { promises as fs } from 'fs'
import { join } from 'path'

async function main() {
  console.log('📦 Exporting ThreadStead Server Identity')
  console.log('======================================')
  
  try {
    // Get the current keypair info
    const keypair = await getOrCreateServerKeypair()
    console.log('✅ Found local server keypair:')
    console.log('   DID:', keypair.did)
    console.log('   Created:', keypair.created)
    
    // Export the full identity (server + users)
    const exportData = await exportServerIdentity()
    
    // Write to a file you can copy to production
    const exportFile = join(process.cwd(), 'server-identity-export.txt')
    await fs.writeFile(exportFile, exportData, 'utf-8')
    
    console.log('\n📄 Export complete!')
    console.log('   File: server-identity-export.txt')
    console.log('   Size:', exportData.length, 'characters')
    
    console.log('\n📋 To import on production:')
    console.log('1. Copy the server-identity-export.txt file to your production server')
    console.log('2. Run: npx tsx scripts/import-server-keypair.ts')
    console.log('3. Or manually import the data using the import function')
    
    // Also show the raw keypair file content for manual copying
    const keypairFile = join(process.cwd(), '.threadstead-server-keypair.json')
    try {
      const rawKeypair = await fs.readFile(keypairFile, 'utf-8')
      console.log('\n🔑 Raw keypair file content:')
      console.log('   File: .threadstead-server-keypair.json')
      console.log('   Content length:', rawKeypair.length, 'characters')
      
      // Write a separate file with just the keypair
      const keypairExportFile = join(process.cwd(), 'server-keypair-only.json')
      await fs.writeFile(keypairExportFile, rawKeypair, 'utf-8')
      console.log('   Copied to: server-keypair-only.json')
      
    } catch (error) {
      console.log('   ⚠️ Could not read raw keypair file')
    }
    
    console.log('\n⚡ Quick production update:')
    console.log('   1. Stop your production server')
    console.log('   2. Copy server-keypair-only.json to production as .threadstead-server-keypair.json')
    console.log('   3. Restart your production server')
    console.log('   4. Test with: npm run ringhub:debug')
    
  } catch (error) {
    console.error('❌ Export failed:', error)
    process.exit(1)
  }
}

main().catch(console.error)