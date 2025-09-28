#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testIntegration() {
  console.log('🧪 Testing Decoration System Integration...\n')

  try {
    // 1. Check if decorations exist in database
    const decorationCount = await prisma.decorationItem.count()
    console.log(`✅ Found ${decorationCount} decorations in database`)

    if (decorationCount === 0) {
      console.log('⚠️  No decorations found. Run migration first:')
      console.log('   npx tsx scripts/migrate-beta-items.ts')
      return
    }

    // 2. Check different release types
    const defaultItems = await prisma.decorationItem.count({
      where: { releaseType: 'DEFAULT' }
    })
    const publicItems = await prisma.decorationItem.count({
      where: { releaseType: 'PUBLIC' }
    })
    const betaItems = await prisma.decorationItem.count({
      where: { releaseType: 'BETA_USERS' }
    })
    const limitedItems = await prisma.decorationItem.count({
      where: { releaseType: 'LIMITED_TIME' }
    })

    console.log(`\n📊 Release Type Distribution:`)
    console.log(`   DEFAULT: ${defaultItems} ⭐`)
    console.log(`   PUBLIC: ${publicItems}`)
    console.log(`   BETA_USERS: ${betaItems}`)
    console.log(`   LIMITED_TIME: ${limitedItems}`)

    // 3. Check SVG content
    const itemsWithSvg = await prisma.decorationItem.findMany({
      where: {
        AND: [
          { iconSvg: { not: null } },
          { renderSvg: { not: null } }
        ]
      },
      select: {
        itemId: true,
        name: true,
        iconSvg: true,
        renderSvg: true
      },
      take: 3
    })

    console.log(`\n🎨 Sample Items with SVG Content:`)
    itemsWithSvg.forEach(item => {
      console.log(`   - ${item.name} (${item.itemId})`)
      console.log(`     Icon SVG: ${item.iconSvg ? '✅' : '❌'} (${item.iconSvg?.length} chars)`)
      console.log(`     Render SVG: ${item.renderSvg ? '✅' : '❌'} (${item.renderSvg?.length} chars)`)
    })

    // 4. Check if API endpoint would work
    const sampleUser = await prisma.user.findFirst({
      include: { betaKey: true }
    })

    if (sampleUser) {
      console.log(`\n👤 Test User: ${sampleUser.primaryHandle || sampleUser.id}`)
      console.log(`   Has Beta Access: ${sampleUser.betaKey ? '✅' : '❌'}`)

      // Simulate what the API would return
      const availableForUser = await prisma.decorationItem.count({
        where: {
          isActive: true,
          OR: [
            { releaseType: 'DEFAULT' },
            { releaseType: 'PUBLIC' },
            ...(sampleUser.betaKey ? [{ releaseType: 'BETA_USERS' as const }] : [])
          ]
        }
      })

      console.log(`   Available Decorations: ${availableForUser}`)
    }

    console.log('\n🎉 Integration test complete!')
    console.log('\n📝 Next steps:')
    console.log('1. Start your dev server: npm run dev')
    console.log('2. Visit the decoration mode on a user profile')
    console.log('3. Decorations should load from database via /api/decorations/available')
    console.log('4. Try the claim code button (🎁) in the header')
    console.log('5. Check /admin/decorations for management interface')

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testIntegration()