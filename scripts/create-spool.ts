import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createSpool() {
  console.log('🧵 Creating The Spool - Universal Parent ThreadRing...')

  try {
    // Check if The Spool already exists
    const existingSpool = await prisma.threadRing.findFirst({
      where: { isSystemRing: true }
    })

    if (existingSpool) {
      console.log('✅ The Spool already exists:', existingSpool.slug)
      return existingSpool
    }

    // Create a system user for The Spool (or use the first admin user)
    let systemUser = await prisma.user.findFirst({
      where: { role: 'admin' }
    })

    if (!systemUser) {
      // If no admin exists, use the first user
      systemUser = await prisma.user.findFirst()
      
      if (!systemUser) {
        throw new Error('No users found in database. Cannot create The Spool without a curator.')
      }
    }

    // Create The Spool
    const spool = await prisma.threadRing.create({
      data: {
        name: 'The Spool',
        slug: 'spool',
        description: 'The universal origin point of all ThreadRing communities. This is where all rings begin their journey.',
        uri: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/threadrings/spool`,
        curatorId: systemUser.id,
        joinType: 'closed', // The Spool doesn't accept new members
        visibility: 'public',
        isSystemRing: true,
        parentId: null, // The Spool has no parent
        lineageDepth: 0, // Root level
        lineagePath: '', // Empty for root
        memberCount: 0, // The Spool doesn't have traditional members
        currentPrompt: 'Welcome to The Spool - the origin of all ThreadRing communities!',
        curatorNote: 'The Spool represents the beginning of all ThreadRing genealogy. Every ThreadRing community can trace its lineage back to this symbolic origin point.'
      }
    })

    console.log('✅ Created The Spool:', spool.slug, `(ID: ${spool.id})`)
    return spool
  } catch (error) {
    console.error('❌ Error creating The Spool:', error)
    throw error
  }
}

async function updateOrphanedRings(spoolId: string) {
  console.log('🔗 Updating orphaned ThreadRings to assign The Spool as parent...')

  try {
    // Find all ThreadRings that don't have a parent (orphaned rings)
    const orphanedRings = await prisma.threadRing.findMany({
      where: {
        parentId: null,
        isSystemRing: false // Exclude The Spool itself
      }
    })

    console.log(`📊 Found ${orphanedRings.length} orphaned ThreadRings`)

    if (orphanedRings.length === 0) {
      console.log('✅ No orphaned rings to update')
      return
    }

    // Update orphaned rings to have The Spool as parent
    const updateResult = await prisma.threadRing.updateMany({
      where: {
        parentId: null,
        isSystemRing: false
      },
      data: {
        parentId: spoolId,
        lineageDepth: 1, // First level below The Spool
        lineagePath: spoolId // The Spool is their only ancestor
      }
    })

    console.log(`✅ Updated ${updateResult.count} ThreadRings to be children of The Spool`)

    // Update The Spool's descendant counters
    const totalRings = await prisma.threadRing.count({
      where: { isSystemRing: false }
    })

    await prisma.threadRing.update({
      where: { id: spoolId },
      data: {
        directChildrenCount: orphanedRings.length,
        totalDescendantsCount: totalRings
      }
    })

    console.log(`✅ Updated The Spool counters: ${orphanedRings.length} direct children, ${totalRings} total descendants`)

  } catch (error) {
    console.error('❌ Error updating orphaned rings:', error)
    throw error
  }
}

async function main() {
  console.log('🚀 Starting Spool Architecture Setup...')
  
  try {
    const spool = await createSpool()
    await updateOrphanedRings(spool.id)
    
    console.log('🎉 Spool Architecture setup complete!')
    console.log(`🔗 The Spool URL: /threadrings/${spool.slug}`)
    
    // Display final stats
    const totalRings = await prisma.threadRing.count()
    const systemRings = await prisma.threadRing.count({ where: { isSystemRing: true } })
    const regularRings = totalRings - systemRings
    
    console.log(`📊 Final Statistics:`)
    console.log(`   - Total ThreadRings: ${totalRings}`)
    console.log(`   - System Rings: ${systemRings}`)
    console.log(`   - Regular Rings: ${regularRings}`)
    
  } catch (error) {
    console.error('💥 Setup failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()