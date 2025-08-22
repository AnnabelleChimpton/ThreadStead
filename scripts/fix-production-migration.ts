#!/usr/bin/env npx tsx

/**
 * One-time script to fix the RingHubOwnership migration issue in production
 * 
 * Run with: npx tsx scripts/fix-production-migration.ts
 */

// Load environment variables using Next.js's @next/env
import { loadEnvConfig } from '@next/env'

// Load .env files the same way Next.js does
const projectDir = process.cwd()
loadEnvConfig(projectDir)

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Fixing RingHubOwnership migration issue...\n')

  try {
    // Check if table already exists
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'RingHubOwnership'
      );
    ` as any[]

    if (tableExists[0]?.exists) {
      console.log('✅ Table RingHubOwnership already exists!')
      console.log('   No action needed.\n')
      return
    }

    console.log('📦 Creating RingHubOwnership table...')
    
    // Create the table
    await prisma.$executeRaw`
      CREATE TABLE "RingHubOwnership" (
        "id" TEXT NOT NULL,
        "ringSlug" TEXT NOT NULL,
        "ringUri" TEXT NOT NULL,
        "ownerUserId" TEXT NOT NULL,
        "serverDID" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "RingHubOwnership_pkey" PRIMARY KEY ("id")
      );
    `
    console.log('✅ Table created')

    // Create indexes
    console.log('📑 Creating indexes...')
    
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX "RingHubOwnership_ringSlug_key" ON "RingHubOwnership"("ringSlug");
    `
    
    await prisma.$executeRaw`
      CREATE INDEX "RingHubOwnership_ownerUserId_idx" ON "RingHubOwnership"("ownerUserId");
    `
    
    await prisma.$executeRaw`
      CREATE INDEX "RingHubOwnership_serverDID_idx" ON "RingHubOwnership"("serverDID");
    `
    console.log('✅ Indexes created')

    // Add foreign key
    console.log('🔗 Adding foreign key constraint...')
    await prisma.$executeRaw`
      ALTER TABLE "RingHubOwnership" ADD CONSTRAINT "RingHubOwnership_ownerUserId_fkey" 
        FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `
    console.log('✅ Foreign key added')

    console.log('\n🎉 Migration fix completed successfully!')
    console.log('\nNext steps:')
    console.log('1. Run: npx prisma migrate resolve --applied 20250822184057_add_ring_hub_ownership')
    console.log('2. Continue with your deployment: npx prisma migrate deploy')

  } catch (error) {
    console.error('❌ Error:', error)
    console.log('\nIf the table was partially created, you may need to drop it first:')
    console.log('DROP TABLE IF EXISTS "RingHubOwnership";')
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})