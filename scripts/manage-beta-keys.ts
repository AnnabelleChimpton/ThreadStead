#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function listKeys() {
  const keys = await db.betaKey.findMany({
    include: {
      user: {
        select: {
          primaryHandle: true,
          did: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log('\n📋 Beta Keys Status:\n');
  
  if (keys.length === 0) {
    console.log('No beta keys found.');
    return;
  }

  const unused = keys.filter(k => !k.usedBy);
  const used = keys.filter(k => k.usedBy);

  console.log(`Total: ${keys.length} | Unused: ${unused.length} | Used: ${used.length}\n`);

  if (unused.length > 0) {
    console.log('🟢 Unused Keys:');
    unused.forEach(key => {
      console.log(`  ${key.key} (created: ${key.createdAt.toISOString().split('T')[0]})`);
    });
    console.log();
  }

  if (used.length > 0) {
    console.log('🔴 Used Keys:');
    used.forEach(key => {
      const handle = key.user?.primaryHandle || key.user?.did?.slice(0, 20) + '...' || 'Unknown';
      console.log(`  ${key.key} → ${handle} (used: ${key.usedAt?.toISOString().split('T')[0]})`);
    });
  }
}

async function deleteKey(keyToDelete: string) {
  try {
    const deleted = await db.betaKey.delete({
      where: { key: keyToDelete }
    });
    console.log(`✅ Deleted beta key: ${deleted.key}`);
  } catch (error) {
    console.error(`❌ Error deleting key ${keyToDelete}:`, error);
  }
}

async function main() {
  const command = process.argv[2];
  
  if (command === 'list' || !command) {
    await listKeys();
  } else if (command === 'delete') {
    const keyToDelete = process.argv[3];
    if (!keyToDelete) {
      console.error('Usage: tsx scripts/manage-beta-keys.ts delete <key>');
      process.exit(1);
    }
    await deleteKey(keyToDelete);
  } else {
    console.error('Available commands:');
    console.error('  tsx scripts/manage-beta-keys.ts list');
    console.error('  tsx scripts/manage-beta-keys.ts delete <key>');
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => {
    db.$disconnect();
  });