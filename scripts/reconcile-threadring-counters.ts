import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface ReconciliationResult {
  ringId: string
  ringName: string
  fieldName: string
  storedValue: number
  actualValue: number
  corrected: boolean
}

async function reconcileThreadRingCounters() {
  console.log('🔄 Starting ThreadRing Counter Reconciliation...')
  console.log(`⏰ Started at: ${new Date().toISOString()}`)

  const results: ReconciliationResult[] = []
  let totalFixed = 0

  try {
    // Get all ThreadRings for reconciliation
    const allRings = await prisma.threadRing.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        isSystemRing: true,
        directChildrenCount: true,
        totalDescendantsCount: true,
        lineagePath: true
      }
    })

    console.log(`📊 Processing ${allRings.length} ThreadRings...`)

    for (const ring of allRings) {
      console.log(`\n🔍 Checking: ${ring.name} (${ring.isSystemRing ? 'System' : 'Regular'})`)

      // 1. Reconcile directChildrenCount
      const actualDirectChildren = await prisma.threadRing.count({
        where: { parentId: ring.id }
      })

      if (ring.directChildrenCount !== actualDirectChildren) {
        console.log(`  ⚠️  Direct children mismatch: stored=${ring.directChildrenCount}, actual=${actualDirectChildren}`)
        
        await prisma.threadRing.update({
          where: { id: ring.id },
          data: { directChildrenCount: actualDirectChildren }
        })

        results.push({
          ringId: ring.id,
          ringName: ring.name,
          fieldName: 'directChildrenCount',
          storedValue: ring.directChildrenCount,
          actualValue: actualDirectChildren,
          corrected: true
        })
        totalFixed++
        console.log(`  ✅ Fixed direct children count: ${ring.directChildrenCount} → ${actualDirectChildren}`)
      } else {
        console.log(`  ✅ Direct children count correct: ${actualDirectChildren}`)
      }

      // 2. Reconcile totalDescendantsCount
      // Count all descendants using lineage path logic
      const actualTotalDescendants = await prisma.threadRing.count({
        where: {
          OR: [
            { lineagePath: { startsWith: `${ring.id},` } },
            { lineagePath: { contains: `,${ring.id},` } },
            { lineagePath: { endsWith: `,${ring.id}` } },
            { parentId: ring.id } // Direct children
          ]
        }
      })

      if (ring.totalDescendantsCount !== actualTotalDescendants) {
        console.log(`  ⚠️  Total descendants mismatch: stored=${ring.totalDescendantsCount}, actual=${actualTotalDescendants}`)
        
        await prisma.threadRing.update({
          where: { id: ring.id },
          data: { totalDescendantsCount: actualTotalDescendants }
        })

        results.push({
          ringId: ring.id,
          ringName: ring.name,
          fieldName: 'totalDescendantsCount',
          storedValue: ring.totalDescendantsCount,
          actualValue: actualTotalDescendants,
          corrected: true
        })
        totalFixed++
        console.log(`  ✅ Fixed total descendants count: ${ring.totalDescendantsCount} → ${actualTotalDescendants}`)
      } else {
        console.log(`  ✅ Total descendants count correct: ${actualTotalDescendants}`)
      }
    }

    // 3. Special verification for The Spool
    const spool = allRings.find(r => r.isSystemRing)
    if (spool) {
      console.log(`\n🧵 Special Spool Verification:`)
      
      const totalRegularRings = await prisma.threadRing.count({
        where: { isSystemRing: false }
      })

      console.log(`  - Spool descendants: ${spool.totalDescendantsCount}`)
      console.log(`  - Total regular rings: ${totalRegularRings}`)
      
      if (spool.totalDescendantsCount === totalRegularRings) {
        console.log(`  ✅ Spool counter matches total regular rings`)
      } else {
        console.log(`  ⚠️  Spool counter mismatch - this should have been fixed above`)
      }
    }

    // 4. Verify lineage path integrity
    console.log(`\n🔗 Verifying Lineage Path Integrity:`)
    
    let lineageErrors = 0
    for (const ring of allRings.filter(r => !r.isSystemRing)) {
      // Check if lineage path references valid rings
      if (ring.lineagePath) {
        const ancestorIds = ring.lineagePath.split(',').filter(Boolean)
        
        for (const ancestorId of ancestorIds) {
          const ancestorExists = await prisma.threadRing.findUnique({
            where: { id: ancestorId },
            select: { id: true, name: true }
          })
          
          if (!ancestorExists) {
            console.log(`  ❌ ${ring.name}: Invalid ancestor ID in lineage path: ${ancestorId}`)
            lineageErrors++
          }
        }
      }
    }

    if (lineageErrors === 0) {
      console.log(`  ✅ All lineage paths reference valid ancestors`)
    } else {
      console.log(`  ⚠️  Found ${lineageErrors} lineage path errors`)
    }

    // Summary
    console.log(`\n📈 Reconciliation Summary:`)
    console.log(`  - ThreadRings processed: ${allRings.length}`)
    console.log(`  - Counter discrepancies found: ${results.length}`)
    console.log(`  - Fields corrected: ${totalFixed}`)
    console.log(`  - Lineage path errors: ${lineageErrors}`)

    if (results.length > 0) {
      console.log(`\n🔧 Corrections Made:`)
      for (const result of results) {
        console.log(`  - ${result.ringName}.${result.fieldName}: ${result.storedValue} → ${result.actualValue}`)
      }
    }

    if (totalFixed === 0 && lineageErrors === 0) {
      console.log(`\n🎉 All ThreadRing counters are accurate!`)
    } else {
      console.log(`\n✅ Reconciliation completed successfully`)
    }

    console.log(`⏰ Finished at: ${new Date().toISOString()}`)

    return {
      processed: allRings.length,
      corrected: totalFixed,
      lineageErrors,
      results
    }

  } catch (error) {
    console.error('❌ Reconciliation failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Handle command line execution
if (require.main === module) {
  reconcileThreadRingCounters().catch((error) => {
    console.error('Reconciliation script failed:', error)
    process.exit(1)
  })
}

export { reconcileThreadRingCounters }