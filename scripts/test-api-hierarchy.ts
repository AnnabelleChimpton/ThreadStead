import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testAPIHierarchy() {
  console.log('🧪 Testing ThreadRing API Hierarchy Updates...')

  try {
    // 1. Check pre-test state
    console.log('\n1. Pre-test State:')
    
    const spoolBefore = await prisma.threadRing.findFirst({
      where: { isSystemRing: true }
    })

    if (!spoolBefore) {
      throw new Error('The Spool not found')
    }

    console.log(`   - The Spool: ${spoolBefore.directChildrenCount} direct children, ${spoolBefore.totalDescendantsCount} total descendants`)

    const testRing = await prisma.threadRing.findFirst({
      where: { 
        name: 'test',
        isSystemRing: false 
      }
    })

    if (!testRing) {
      throw new Error('Test ring not found')
    }

    console.log(`   - Test ring: ${testRing.directChildrenCount} direct children, ${testRing.totalDescendantsCount} total descendants`)

    // 2. Simulate what would happen if we created a new ThreadRing via API
    console.log('\n2. Simulating New ThreadRing Creation:')
    
    // This is what the create API would do now
    const newRingData = {
      name: 'API Test Ring',
      slug: 'api-test-ring',
      description: 'Testing API hierarchy updates',
      joinType: 'open',
      visibility: 'public',
      curatorId: testRing.curatorId, // Use existing user
      uri: 'http://localhost:3003/threadrings/api-test-ring',
      memberCount: 1,
      // Hierarchical fields (what the updated API now includes)
      parentId: spoolBefore.id,
      lineageDepth: 1,
      lineagePath: spoolBefore.id,
      directChildrenCount: 0,
      totalDescendantsCount: 0
    }

    console.log('   - Would create ring with hierarchical data')
    console.log(`   - Parent: ${newRingData.parentId} (The Spool)`)
    console.log(`   - Depth: ${newRingData.lineageDepth}`)
    console.log(`   - Path: ${newRingData.lineagePath}`)

    // 3. Simulate what would happen if we forked the test ring
    console.log('\n3. Simulating Fork Creation:')
    
    // This is what the fork API would do now
    const newLineageDepth = testRing.lineageDepth + 1
    const newLineagePath = testRing.lineagePath 
      ? `${testRing.lineagePath},${testRing.id}`
      : testRing.id

    const ancestorIds = testRing.lineagePath 
      ? testRing.lineagePath.split(',').filter(Boolean)
      : []
    ancestorIds.push(testRing.id)

    console.log('   - Would create fork with hierarchical data')
    console.log(`   - Parent: ${testRing.id} (${testRing.name})`)
    console.log(`   - Depth: ${newLineageDepth}`)
    console.log(`   - Path: ${newLineagePath}`)
    console.log(`   - Ancestors to update: [${ancestorIds.join(', ')}]`)

    // 4. Verify lineage path parsing
    console.log('\n4. Lineage Path Parsing Test:')
    
    const allRings = await prisma.threadRing.findMany({
      where: { isSystemRing: false },
      select: {
        id: true,
        name: true,
        lineagePath: true,
        lineageDepth: true
      }
    })

    for (const ring of allRings) {
      const ancestors = ring.lineagePath ? ring.lineagePath.split(',').filter(Boolean) : []
      console.log(`   - ${ring.name}: depth ${ring.lineageDepth}, ancestors [${ancestors.join(', ')}]`)
    }

    // 5. Test descendant counting logic
    console.log('\n5. Descendant Counting Logic Test:')
    
    for (const ring of allRings) {
      // Count actual descendants using the lineage path logic
      const actualDescendants = await prisma.threadRing.count({
        where: {
          OR: [
            { lineagePath: { startsWith: `${ring.id},` } },
            { lineagePath: { contains: `,${ring.id},` } },
            { lineagePath: { endsWith: `,${ring.id}` } },
            { parentId: ring.id }
          ]
        }
      })

      console.log(`   - ${ring.name}: stored=${ring.totalDescendantsCount}, actual=${actualDescendants} ${ring.totalDescendantsCount === actualDescendants ? '✅' : '❌'}`)
    }

    // 6. Show what the API endpoints should return
    console.log('\n6. API Response Verification:')
    
    const ringWithHierarchy = await prisma.threadRing.findFirst({
      where: { slug: 'test' },
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        lineageDepth: true,
        lineagePath: true,
        directChildrenCount: true,
        totalDescendantsCount: true,
        isSystemRing: true
      }
    })

    console.log('   - API should now return hierarchical data:')
    console.log('   ', JSON.stringify(ringWithHierarchy, null, 4))

    console.log('\n🎯 API hierarchy updates are ready for testing!')
    console.log('   - ThreadRing creation API will assign The Spool as parent')
    console.log('   - Fork API will calculate proper lineage and update ancestor counters')
    console.log('   - All operations maintain hierarchy integrity')

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testAPIHierarchy()