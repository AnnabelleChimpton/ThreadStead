import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testForkHierarchy() {
  console.log('🧪 Testing Fork Hierarchy System...')

  try {
    // 1. Check initial state
    console.log('\n1. Initial State:')
    const spool = await prisma.threadRing.findFirst({
      where: { isSystemRing: true }
    })
    
    if (!spool) {
      throw new Error('The Spool not found')
    }

    console.log(`   - The Spool: ${spool.directChildrenCount} direct children, ${spool.totalDescendantsCount} total descendants`)

    // Find a ring to fork
    const parentRing = await prisma.threadRing.findFirst({
      where: { 
        isSystemRing: false,
        parentId: spool.id 
      },
      select: {
        id: true,
        name: true,
        slug: true,
        lineageDepth: true,
        lineagePath: true,
        directChildrenCount: true,
        totalDescendantsCount: true
      }
    })

    if (!parentRing) {
      console.log('   - No regular rings found to test fork. Creating one first...')
      return
    }

    console.log(`   - Parent ring "${parentRing.name}": depth ${parentRing.lineageDepth}, ${parentRing.directChildrenCount} children, ${parentRing.totalDescendantsCount} descendants`)

    // 2. Simulate a fork creation (what the API would do)
    console.log('\n2. Simulating Fork Creation:')
    
    // Calculate lineage data (same logic as API)
    const newLineageDepth = parentRing.lineageDepth + 1
    const newLineagePath = parentRing.lineagePath 
      ? `${parentRing.lineagePath},${parentRing.id}`
      : parentRing.id

    // Get ancestor IDs for counter updates
    const ancestorIds = parentRing.lineagePath 
      ? parentRing.lineagePath.split(',').filter(Boolean)
      : []
    ancestorIds.push(parentRing.id) // Include direct parent

    console.log(`   - New fork would have depth: ${newLineageDepth}`)
    console.log(`   - New fork lineage path: "${newLineagePath}"`)
    console.log(`   - Ancestors to update: [${ancestorIds.join(', ')}]`)

    // 3. Verify the math is correct
    console.log('\n3. Verification:')
    
    // Count actual descendants of the parent
    const actualDescendants = await prisma.threadRing.count({
      where: {
        OR: [
          { lineagePath: { startsWith: `${parentRing.id},` } },
          { lineagePath: { contains: `,${parentRing.id},` } },
          { lineagePath: { endsWith: `,${parentRing.id}` } },
          { parentId: parentRing.id }
        ]
      }
    })

    console.log(`   - Parent's stored descendant count: ${parentRing.totalDescendantsCount}`)
    console.log(`   - Parent's actual descendant count: ${actualDescendants}`)
    console.log(`   - Match: ${parentRing.totalDescendantsCount === actualDescendants ? '✅' : '❌'}`)

    // Count actual children of the parent
    const actualChildren = await prisma.threadRing.count({
      where: { parentId: parentRing.id }
    })

    console.log(`   - Parent's stored children count: ${parentRing.directChildrenCount}`)
    console.log(`   - Parent's actual children count: ${actualChildren}`)
    console.log(`   - Match: ${parentRing.directChildrenCount === actualChildren ? '✅' : '❌'}`)

    // 4. Verify The Spool's counters
    console.log('\n4. The Spool Counter Verification:')
    
    const allRegularRings = await prisma.threadRing.count({
      where: { isSystemRing: false }
    })

    console.log(`   - Spool's stored descendant count: ${spool.totalDescendantsCount}`)
    console.log(`   - Actual regular ring count: ${allRegularRings}`)
    console.log(`   - Match: ${spool.totalDescendantsCount === allRegularRings ? '✅' : '❌'}`)

    // 5. Show the complete hierarchy
    console.log('\n5. Current Hierarchy:')
    
    const allRings = await prisma.threadRing.findMany({
      select: {
        id: true,
        name: true,
        isSystemRing: true,
        lineageDepth: true,
        lineagePath: true,
        directChildrenCount: true,
        totalDescendantsCount: true
      },
      orderBy: [
        { lineageDepth: 'asc' },
        { name: 'asc' }
      ]
    })

    for (const ring of allRings) {
      const indent = '  '.repeat(ring.lineageDepth)
      const marker = ring.isSystemRing ? '🧵' : '📍'
      console.log(`   ${indent}${marker} ${ring.name} (depth: ${ring.lineageDepth}, children: ${ring.directChildrenCount}, descendants: ${ring.totalDescendantsCount})`)
    }

    console.log('\n🎯 Fork hierarchy system is ready for API testing!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testForkHierarchy()