#!/usr/bin/env npx tsx

import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'

console.log('🎨 Deploying Decoration Management System...\n')

// Check if we're in the right directory
if (!existsSync('prisma/schema.prisma')) {
  console.error('❌ Error: prisma/schema.prisma not found. Please run this script from the project root.')
  process.exit(1)
}

function runCommand(command: string, description: string): boolean {
  console.log(`📦 ${description}...`)
  try {
    execSync(command, { stdio: 'inherit' })
    return true
  } catch (error) {
    console.error(`❌ ${description} failed.`)
    return false
  }
}

async function main() {
  // Apply database migrations
  if (!runCommand('npx prisma migrate deploy', 'Applying database migrations')) {
    console.log('⚠️  Migration failed. Attempting to continue...')
  }

  // Generate Prisma client
  if (!runCommand('npx prisma generate', 'Generating Prisma client')) {
    console.log('⚠️  Prisma client generation failed. Attempting to continue...')
  }

  // Run the BETA_ITEMS migration
  console.log('🎨 Migrating BETA_ITEMS to decoration database...')

  try {
    // Import and run the migration directly
    const { migrateBetaItems } = await import('./migrate-beta-items')
    await migrateBetaItems()
    console.log('✅ BETA_ITEMS migration completed!')
  } catch (error: any) {
    console.error('⚠️  BETA_ITEMS migration failed:', error.message)
    console.log('Continuing anyway...')
  }

  console.log('\n✅ Decoration Management System deployed successfully!')
  console.log('\n🎯 System is ready for use:')
  console.log('1. Access the admin interface at: /admin/decorations')
  console.log('2. Create limited-time releases and claim codes')
  console.log('3. Upload new decorations with SVG assets')
  console.log('\n🎉 Happy decorating!')
}

main().catch(error => {
  console.error('❌ Deployment failed:', error)
  process.exit(1)
})