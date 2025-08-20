import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixForkHierarchy() {
  console.log('🔧 Fixing ThreadRing Fork Hierarchy');
  console.log('===================================\n');

  try {
    // Get all fork relationships
    const forks = await prisma.threadRingFork.findMany({
      include: {
        parent: { select: { id: true, name: true, lineagePath: true, lineageDepth: true } },
        child: { select: { id: true, name: true, parentId: true } }
      }
    });

    if (forks.length === 0) {
      console.log('No fork relationships found.');
      return;
    }

    console.log(`Found ${forks.length} fork relationships to process.\n`);

    // Fix each fork relationship
    for (const fork of forks) {
      console.log(`Processing: ${fork.parent.name} -> ${fork.child.name}`);
      
      // Check if the child's parentId matches the fork parent
      if (fork.child.parentId === fork.parent.id) {
        console.log('  ✅ Already correct\n');
        continue;
      }

      console.log(`  ❌ Mismatch detected!`);
      console.log(`     Current parentId: ${fork.child.parentId}`);
      console.log(`     Should be: ${fork.parent.id}`);

      // Calculate correct lineage data
      const newLineageDepth = fork.parent.lineageDepth + 1;
      const newLineagePath = fork.parent.lineagePath 
        ? `${fork.parent.lineagePath},${fork.parent.id}`
        : fork.parent.id;

      // Update the child ThreadRing with correct parent and lineage
      await prisma.threadRing.update({
        where: { id: fork.child.id },
        data: {
          parentId: fork.parent.id,
          lineageDepth: newLineageDepth,
          lineagePath: newLineagePath
        }
      });

      console.log('  ✅ Fixed! Updated with:');
      console.log(`     parentId: ${fork.parent.id}`);
      console.log(`     lineageDepth: ${newLineageDepth}`);
      console.log(`     lineagePath: ${newLineagePath}\n`);
    }

    // Now recalculate all descendant counts
    console.log('\n🔄 Recalculating descendant counts...\n');

    // Get all rings ordered by depth (deepest first) to calculate bottom-up
    const allRings = await prisma.threadRing.findMany({
      orderBy: { lineageDepth: 'desc' }
    });

    for (const ring of allRings) {
      // Count direct children
      const directChildrenCount = await prisma.threadRing.count({
        where: { parentId: ring.id }
      });

      // Count all descendants
      const totalDescendantsCount = await prisma.threadRing.count({
        where: {
          OR: [
            { parentId: ring.id }, // Direct children
            { lineagePath: { startsWith: `${ring.id},` } },
            { lineagePath: { contains: `,${ring.id},` } },
            { lineagePath: { endsWith: `,${ring.id}` } }
          ]
        }
      });

      // Update if different
      if (ring.directChildrenCount !== directChildrenCount || 
          ring.totalDescendantsCount !== totalDescendantsCount) {
        await prisma.threadRing.update({
          where: { id: ring.id },
          data: {
            directChildrenCount,
            totalDescendantsCount
          }
        });
        console.log(`Updated ${ring.name}: ${directChildrenCount} direct, ${totalDescendantsCount} total`);
      }
    }

    console.log('\n✅ Fork hierarchy fixed successfully!');

    // Final verification
    console.log('\n📊 Final Hierarchy:');
    console.log('==================\n');

    const finalRings = await prisma.threadRing.findMany({
      orderBy: { lineageDepth: 'asc' },
      select: {
        name: true,
        lineageDepth: true,
        parentId: true,
        directChildrenCount: true,
        totalDescendantsCount: true,
        isSystemRing: true
      }
    });

    // Build tree structure for display
    const ringsByParent = new Map<string | null, typeof finalRings>();
    for (const ring of finalRings) {
      const parentId = ring.parentId;
      if (!ringsByParent.has(parentId)) {
        ringsByParent.set(parentId, []);
      }
      ringsByParent.get(parentId)!.push(ring);
    }

    function printTree(parentId: string | null, indent: string = '') {
      const children = ringsByParent.get(parentId) || [];
      for (const ring of children) {
        const prefix = ring.isSystemRing ? '🧵' : '📍';
        console.log(`${indent}${prefix} ${ring.name}`);
        console.log(`${indent}   Children: ${ring.directChildrenCount}, Descendants: ${ring.totalDescendantsCount}`);
        printTree(ring.parentId === null ? ring.name : ring.parentId, indent + '  ');
      }
    }

    // Find root (The Spool)
    const spool = finalRings.find(r => r.isSystemRing);
    if (spool) {
      printTree(null);
    }

  } catch (error) {
    console.error('❌ Error fixing fork hierarchy:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  fixForkHierarchy().catch(console.error);
}

export { fixForkHierarchy };