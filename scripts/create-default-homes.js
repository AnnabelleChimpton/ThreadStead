const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createDefaultHomes() {
  try {
    console.log('🏠 Creating default homes for all users...')

    // Get all users who have handles (active users)
    const users = await prisma.user.findMany({
      select: { id: true },
      where: {
        handles: {
          some: {}
        }
      }
    })

    console.log(`Found ${users.length} users with handles`)

    // Get existing home configs
    const existingConfigs = await prisma.userHomeConfig.findMany({
      select: { userId: true }
    })

    const existingUserIds = new Set(existingConfigs.map(config => config.userId))
    console.log(`${existingConfigs.length} users already have home configs`)

    // Find users without home configs
    const usersWithoutHomes = users.filter(user => !existingUserIds.has(user.id))
    console.log(`${usersWithoutHomes.length} users need default homes`)

    if (usersWithoutHomes.length === 0) {
      console.log('✅ All users already have home configurations!')
      return
    }

    // Create varied default home configs for users without them
    const templates = ['cottage_v1', 'townhouse_v1', 'loft_v1', 'cabin_v1']
    const palettes = ['thread_sage', 'charcoal_nights', 'pixel_petals', 'crt_glow', 'classic_linen']
    
    const defaultHomeConfigs = usersWithoutHomes.map((user, index) => {
      // Use user ID hash for deterministic but varied selection
      const userIdHash = user.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
      const template = templates[userIdHash % templates.length]
      const palette = palettes[(userIdHash * 2) % palettes.length]
      
      return {
        userId: user.id,
        houseTemplate: template,
        palette: palette,
        bookSkin: 'linen_v1',
        seasonalOptIn: false,
        preferPixelHome: false
      }
    })

    // Insert in batches to avoid overwhelming the database
    const batchSize = 100
    let created = 0

    for (let i = 0; i < defaultHomeConfigs.length; i += batchSize) {
      const batch = defaultHomeConfigs.slice(i, i + batchSize)
      
      await prisma.userHomeConfig.createMany({
        data: batch,
        skipDuplicates: true
      })
      
      created += batch.length
      console.log(`Created ${created}/${defaultHomeConfigs.length} default homes...`)
    }

    console.log(`✅ Successfully created ${created} default home configurations!`)

    // Verify the result
    const finalCount = await prisma.userHomeConfig.count()
    console.log(`Total home configurations in database: ${finalCount}`)

  } catch (error) {
    console.error('❌ Error creating default homes:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createDefaultHomes()