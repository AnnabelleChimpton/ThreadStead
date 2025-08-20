import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifySpool() {
  console.log('🔍 Verifying The Spool Architecture...')

  try {
    // Check The Spool exists
    const spool = await prisma.threadRing.findFirst({
      where: { isSystemRing: true },
      include: {
        children: {
          select: { id: true, name: true, slug: true, lineageDepth: true, parentId: true }
        }
      }
    })

    if (!spool) {
      throw new Error('❌ The Spool not found!')
    }

    console.log('✅ The Spool exists:')
    console.log(`   - ID: ${spool.id}`)
    console.log(`   - Name: ${spool.name}`)
    console.log(`   - Slug: ${spool.slug}`)
    console.log(`   - Is System Ring: ${spool.isSystemRing}`)
    console.log(`   - Parent ID: ${spool.parentId || 'null (root)'} ✓`)
    console.log(`   - Lineage Depth: ${spool.lineageDepth} ✓`)
    console.log(`   - Lineage Path: "${spool.lineagePath}" ✓`)
    console.log(`   - Direct Children Count: ${spool.directChildrenCount}`)
    console.log(`   - Total Descendants Count: ${spool.totalDescendantsCount}`)

    // Verify all non-system rings have The Spool as their parent
    const allRegularRings = await prisma.threadRing.findMany({
      where: { isSystemRing: false },
      select: { id: true, name: true, parentId: true, lineageDepth: true, lineagePath: true }
    })

    console.log(`\n📊 Regular ThreadRings (${allRegularRings.length}):`)
    
    let correctParentCount = 0
    let correctDepthCount = 0
    let correctPathCount = 0

    for (const ring of allRegularRings) {
      const hasCorrectParent = ring.parentId === spool.id
      const hasCorrectDepth = ring.lineageDepth === 1
      const hasCorrectPath = ring.lineagePath === spool.id

      console.log(`   - ${ring.name}:`)
      console.log(`     Parent: ${ring.parentId} ${hasCorrectParent ? '✓' : '❌'}`)
      console.log(`     Depth: ${ring.lineageDepth} ${hasCorrectDepth ? '✓' : '❌'}`)
      console.log(`     Path: "${ring.lineagePath}" ${hasCorrectPath ? '✓' : '❌'}`)

      if (hasCorrectParent) correctParentCount++
      if (hasCorrectDepth) correctDepthCount++
      if (hasCorrectPath) correctPathCount++
    }

    // Summary
    console.log(`\n📈 Verification Summary:`)
    console.log(`   - Regular rings with correct parent: ${correctParentCount}/${allRegularRings.length}`)
    console.log(`   - Regular rings with correct depth: ${correctDepthCount}/${allRegularRings.length}`)
    console.log(`   - Regular rings with correct path: ${correctPathCount}/${allRegularRings.length}`)

    // Check counters accuracy
    const actualChildrenCount = allRegularRings.filter(r => r.parentId === spool.id).length
    const counterMatch = spool.directChildrenCount === actualChildrenCount
    
    console.log(`\n🔢 Counter Verification:`)
    console.log(`   - Expected direct children: ${actualChildrenCount}`)
    console.log(`   - Stored direct children: ${spool.directChildrenCount} ${counterMatch ? '✓' : '❌'}`)
    console.log(`   - Total descendants: ${spool.totalDescendantsCount} ${spool.totalDescendantsCount === allRegularRings.length ? '✓' : '❌'}`)

    // Final result
    const allCorrect = (
      correctParentCount === allRegularRings.length &&
      correctDepthCount === allRegularRings.length &&
      correctPathCount === allRegularRings.length &&
      counterMatch &&
      spool.totalDescendantsCount === allRegularRings.length
    )

    if (allCorrect) {
      console.log('\n🎉 The Spool Architecture is correctly set up!')
    } else {
      console.log('\n⚠️  Some issues found with The Spool Architecture')
    }

    return allCorrect

  } catch (error) {
    console.error('❌ Verification failed:', error)
    return false
  } finally {
    await prisma.$disconnect()
  }
}

verifySpool()