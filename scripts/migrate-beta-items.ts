#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Beta items to migrate - extracted from DecorationMode.tsx
const BETA_ITEMS = {
  plants: [
    { id: 'roses_red', name: 'Red Roses', type: 'plant', zone: 'front_yard' },
    { id: 'roses_pink', name: 'Pink Roses', type: 'plant', zone: 'front_yard' },
    { id: 'roses_white', name: 'White Roses', type: 'plant', zone: 'front_yard' },
    { id: 'daisies_white', name: 'White Daisies', type: 'plant', zone: 'front_yard' },
    { id: 'daisies_yellow', name: 'Yellow Daisies', type: 'plant', zone: 'front_yard' },
    { id: 'small_tree', name: 'Small Tree', type: 'plant', zone: 'front_yard' },
    { id: 'tree_oak', name: 'Oak Tree', type: 'plant', zone: 'front_yard' },
    { id: 'tree_pine', name: 'Pine Tree', type: 'plant', zone: 'front_yard' },
    { id: 'sunflowers', name: 'Sunflowers', type: 'plant', zone: 'front_yard' },
    { id: 'lavender', name: 'Lavender', type: 'plant', zone: 'front_yard' },
    { id: 'flower_pot', name: 'Flower Pot', type: 'plant', zone: 'front_yard' },
    { id: 'planter_box', name: 'Planter Box', type: 'furniture', zone: 'front_yard' }
  ],
  paths: [
    { id: 'stone_path', name: 'Stone Path', type: 'path', zone: 'front_yard' },
    { id: 'brick_path', name: 'Brick Path', type: 'path', zone: 'front_yard' },
    { id: 'stepping_stones', name: 'Stepping Stones', type: 'path', zone: 'front_yard' },
    { id: 'gravel_path', name: 'Gravel Path', type: 'path', zone: 'front_yard' }
  ],
  features: [
    { id: 'bird_bath', name: 'Bird Bath', type: 'feature', zone: 'front_yard' },
    { id: 'garden_gnome', name: 'Garden Gnome', type: 'feature', zone: 'front_yard' },
    { id: 'decorative_fence', name: 'Decorative Fence', type: 'feature', zone: 'front_yard' },
    { id: 'wind_chimes', name: 'Wind Chimes', type: 'feature', zone: 'front_yard' }
  ],
  furniture: [
    { id: 'garden_bench', name: 'Garden Bench', type: 'furniture', zone: 'front_yard' },
    { id: 'outdoor_table', name: 'Outdoor Table', type: 'furniture', zone: 'front_yard' },
    { id: 'mailbox', name: 'Mailbox', type: 'furniture', zone: 'front_yard' },
    { id: 'planter_box_furniture', name: 'Planter Box', type: 'furniture', zone: 'front_yard' },
    { id: 'picnic_table', name: 'Picnic Table', type: 'furniture', zone: 'front_yard' }
  ],
  lighting: [
    { id: 'garden_lantern', name: 'Garden Lantern', type: 'lighting', zone: 'front_yard' },
    { id: 'string_lights', name: 'String Lights', type: 'lighting', zone: 'front_yard' },
    { id: 'torch', name: 'Garden Torch', type: 'lighting', zone: 'front_yard' },
    { id: 'spotlight', name: 'Spotlight', type: 'lighting', zone: 'front_yard' }
  ],
  water: [
    { id: 'fountain', name: 'Garden Fountain', type: 'water', zone: 'front_yard' },
    { id: 'pond', name: 'Small Pond', type: 'water', zone: 'front_yard' },
    { id: 'rain_barrel', name: 'Rain Barrel', type: 'water', zone: 'front_yard' }
  ],
  structures: [
    { id: 'gazebo', name: 'Garden Gazebo', type: 'structure', zone: 'front_yard' },
    { id: 'trellis', name: 'Garden Trellis', type: 'structure', zone: 'front_yard' },
    { id: 'garden_arch', name: 'Garden Arch', type: 'structure', zone: 'front_yard' }
  ]
}

function generateBasicSvg(itemId: string, type: string): string {
  const colors = {
    plant: '#4FAF6D',
    furniture: '#A18463',
    path: '#B8B8B8',
    feature: '#E27D60',
    lighting: '#FFE066',
    water: '#8EC5E8',
    structure: '#2E4B3F'
  }

  const color = colors[type as keyof typeof colors] || '#A18463'

  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="18" height="18" rx="2" fill="${color}" opacity="0.8"/>
    <text x="12" y="16" text-anchor="middle" fill="white" font-size="8" font-weight="bold">
      ${type.charAt(0).toUpperCase()}
    </text>
  </svg>`
}

function generateRenderSvg(itemId: string, type: string): string {
  const colors = {
    plant: '#4FAF6D',
    furniture: '#A18463',
    path: '#B8B8B8',
    feature: '#E27D60',
    lighting: '#FFE066',
    water: '#8EC5E8',
    structure: '#2E4B3F'
  }

  const color = colors[type as keyof typeof colors] || '#A18463'

  return `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="20" r="16" fill="${color}" opacity="0.9"/>
    <text x="20" y="26" text-anchor="middle" fill="white" font-size="10" font-weight="bold">
      ${itemId.split('_')[0].charAt(0).toUpperCase()}
    </text>
  </svg>`
}

async function migrateItem(item: any, category: string, releaseType: string = 'BETA_USERS') {
  const itemId = item.id
  const existing = await prisma.decorationItem.findUnique({
    where: { itemId }
  })

  if (existing) {
    console.log(`✓ Decoration '${itemId}' already exists`)
    return existing
  }

  const decorationData = {
    itemId,
    name: item.name,
    type: item.type,
    category,
    zone: item.zone || 'front_yard',
    iconSvg: generateBasicSvg(itemId, item.type),
    renderSvg: generateRenderSvg(itemId, item.type),
    gridWidth: 1,
    gridHeight: 1,
    isActive: true,
    releaseType: releaseType as any,
    description: `Migrated from BETA_ITEMS: ${item.name}`
    // No createdBy - these are system items
  }

  const created = await prisma.decorationItem.create({
    data: decorationData
  })

  console.log(`✅ Created decoration: ${itemId} (${item.name})`)
  return created
}

export async function migrateBetaItems() {
  console.log('🎨 Starting BETA_ITEMS migration...\n')

  // Check for environment variable to set release type
  const releaseType = process.env.RELEASE_TYPE || process.argv[2] || 'BETA_USERS'
  const validReleaseTypes = ['DEFAULT', 'PUBLIC', 'BETA_USERS', 'ADMIN_ONLY']

  if (!validReleaseTypes.includes(releaseType)) {
    console.error(`❌ Invalid release type: ${releaseType}. Valid options: ${validReleaseTypes.join(', ')}`)
    process.exit(1)
  }

  console.log(`📋 Using release type: ${releaseType}`)
  console.log(`   To change: RELEASE_TYPE=DEFAULT npx tsx scripts/migrate-beta-items.ts\n`)

  try {
    let totalCreated = 0
    let totalSkipped = 0
    let totalExisting = 0

    for (const [category, items] of Object.entries(BETA_ITEMS)) {
      console.log(`📦 Processing category: ${category}`)

      for (const item of items) {
        try {
          const result = await migrateItem(item, category, releaseType)
          if (result) {
            if (result.id) {
              totalCreated++
            } else {
              totalExisting++
            }
          }
        } catch (error) {
          console.error(`❌ Failed to migrate ${item.id}:`, error)
          totalSkipped++
        }
      }

      console.log(``)
    }

    console.log(`🎉 Migration completed!`)
    console.log(`✅ Created: ${totalCreated} decorations`)
    console.log(`⏭️  Skipped: ${totalSkipped} existing decorations`)

    // Count total decorations
    const total = await prisma.decorationItem.count()
    console.log(`📊 Total decorations in database: ${total}`)

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  migrateBetaItems().catch(error => {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  })
}