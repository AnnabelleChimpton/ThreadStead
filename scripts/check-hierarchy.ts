import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkHierarchy() {
  const rings = await prisma.threadRing.findMany({
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
    },
    orderBy: { createdAt: 'asc' }
  });
  
  console.log('ThreadRing Hierarchy Report');
  console.log('===========================\n');
  
  // Find The Spool
  const spool = rings.find(r => r.isSystemRing);
  if (spool) {
    console.log('🧵 THE SPOOL (Root)');
    console.log(`   ID: ${spool.id}`);
    console.log(`   Direct Children: ${spool.directChildrenCount}`);
    console.log(`   Total Descendants: ${spool.totalDescendantsCount}`);
    console.log('');
  }
  
  // Group rings by parent
  const ringsByParent = new Map<string | null, typeof rings>();
  for (const ring of rings) {
    const parentId = ring.parentId;
    if (!ringsByParent.has(parentId)) {
      ringsByParent.set(parentId, []);
    }
    ringsByParent.get(parentId)!.push(ring);
  }
  
  // Print tree recursively
  function printTree(parentId: string | null, indent: string = '') {
    const children = ringsByParent.get(parentId) || [];
    for (const ring of children) {
      if (ring.isSystemRing) continue; // Already printed The Spool
      
      console.log(`${indent}📍 ${ring.name} (${ring.slug})`);
      console.log(`${indent}   ID: ${ring.id}`);
      console.log(`${indent}   Parent ID: ${ring.parentId || 'none'}`);
      console.log(`${indent}   Depth: ${ring.lineageDepth}`);
      console.log(`${indent}   Path: "${ring.lineagePath || ''}"`);
      console.log(`${indent}   Direct Children: ${ring.directChildrenCount}`);
      console.log(`${indent}   Total Descendants: ${ring.totalDescendantsCount}`);
      console.log('');
      
      // Recursively print children
      printTree(ring.id, indent + '  ');
    }
  }
  
  console.log('\nHierarchy Tree:');
  console.log('---------------');
  printTree(spool?.id || null);
  
  // Check for issues
  console.log('\nData Integrity Check:');
  console.log('--------------------');
  
  let issues = 0;
  
  // Check for orphaned rings (no parent and not The Spool)
  const orphans = rings.filter(r => !r.parentId && !r.isSystemRing);
  if (orphans.length > 0) {
    console.log(`❌ Found ${orphans.length} orphaned rings (no parent):`);
    for (const orphan of orphans) {
      console.log(`   - ${orphan.name} (ID: ${orphan.id})`);
    }
    issues += orphans.length;
  }
  
  // Check for rings with parent but no lineage path
  const missingPath = rings.filter(r => r.parentId && !r.lineagePath);
  if (missingPath.length > 0) {
    console.log(`❌ Found ${missingPath.length} rings with parent but no lineage path:`);
    for (const ring of missingPath) {
      console.log(`   - ${ring.name} (ID: ${ring.id}, Parent: ${ring.parentId})`);
    }
    issues += missingPath.length;
  }
  
  // Check for inconsistent depth
  for (const ring of rings) {
    if (ring.lineagePath) {
      const expectedDepth = ring.lineagePath.split(',').length;
      if (ring.lineageDepth !== expectedDepth) {
        console.log(`❌ Depth mismatch for ${ring.name}: expected ${expectedDepth}, got ${ring.lineageDepth}`);
        issues++;
      }
    }
  }
  
  if (issues === 0) {
    console.log('✅ All hierarchy data looks correct!');
  } else {
    console.log(`\n⚠️  Found ${issues} total issues`);
  }
  
  await prisma.$disconnect();
}

checkHierarchy().catch(console.error);