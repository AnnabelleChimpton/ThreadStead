#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateAllToDefault() {
  console.log('🌟 Migrating ALL decorations to DEFAULT release type...\\n')

  try {
    // First, show current distribution
    const currentStats = await prisma.decorationItem.groupBy({
      by: ['releaseType'],
      _count: {
        _all: true
      }
    })

    console.log('📊 Current Release Type Distribution:')
    currentStats.forEach(stat => {
      console.log(`   ${stat.releaseType}: ${stat._count._all}`)
    })

    // Update all decorations to DEFAULT
    const result = await prisma.decorationItem.updateMany({
      data: {
        releaseType: 'DEFAULT'
      }
    })

    console.log(`\\n✅ Updated ${result.count} decorations to DEFAULT release type`)

    // Show new distribution
    const newStats = await prisma.decorationItem.groupBy({
      by: ['releaseType'],
      _count: {
        _all: true
      }
    })

    console.log('\\n📊 New Release Type Distribution:')
    newStats.forEach(stat => {
      console.log(`   ${stat.releaseType}: ${stat._count._all} ⭐`)
    })

    // Count total decorations
    const total = await prisma.decorationItem.count()
    console.log(`\\n🎉 All ${total} decorations are now DEFAULT!`)
    console.log('\\n✨ Benefits:')
    console.log('   • All decorations available to every user immediately')
    console.log('   • No claiming required')
    console.log('   • Perfect for release/demo')
    console.log('   • Admin can still change specific items later')

  } catch (error) {
    console.error('❌ Failed to migrate decorations:', error)
  } finally {
    await prisma.$disconnect()
  }
}

migrateAllToDefault()