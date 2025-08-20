import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkForks() {
  const forks = await prisma.threadRingFork.findMany({
    include: {
      parent: { select: { name: true, slug: true, id: true } },
      child: { select: { name: true, slug: true, id: true, parentId: true } }
    }
  });
  
  console.log('ThreadRingFork Records:');
  console.log('=======================');
  
  if (forks.length === 0) {
    console.log('No fork records found!');
  } else {
    for (const fork of forks) {
      console.log(`Fork: ${fork.parent.name} -> ${fork.child.name}`);
      console.log(`  Parent ID: ${fork.parent.id}`);
      console.log(`  Child ID: ${fork.child.id}`);
      console.log(`  Child's parentId field: ${fork.child.parentId}`);
      console.log(`  Match: ${fork.parent.id === fork.child.parentId ? '✅' : '❌ MISMATCH!'}`);
      console.log('');
    }
  }
  
  await prisma.$disconnect();
}

checkForks().catch(console.error);