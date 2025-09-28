#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Basic items that should always be available to everyone
const DEFAULT_ITEMS = [
  'roses_red',
  'roses_pink',
  'stone_path',
  'brick_path',
  'small_tree',
  'garden_bench',
  'flower_pot'
]

async function setDefaultItems() {
  console.log('🌟 Setting basic items to DEFAULT release type...\n')

  try {
    for (const itemId of DEFAULT_ITEMS) {
      const result = await prisma.decorationItem.updateMany({
        where: { itemId },
        data: { releaseType: 'DEFAULT' }
      })

      if (result.count > 0) {
        console.log(`✅ Set ${itemId} to DEFAULT`)
      } else {
        console.log(`⚠️  Item ${itemId} not found`)
      }
    }

    console.log('\n🎉 Default items updated!')
    console.log('\nBasic decorations are now available to all users without claiming')

  } catch (error) {
    console.error('❌ Failed to update items:', error)
  } finally {
    await prisma.$disconnect()
  }
}

setDefaultItems()