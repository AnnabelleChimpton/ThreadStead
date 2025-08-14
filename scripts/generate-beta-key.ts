#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const db = new PrismaClient();

function generateBetaKey(): string {
  // Generate a readable beta key: BETA-XXXX-XXXX-XXXX
  const parts = [];
  for (let i = 0; i < 3; i++) {
    const part = crypto.randomBytes(2).toString('hex').toUpperCase();
    parts.push(part);
  }
  return `BETA-${parts.join('-')}`;
}

async function main() {
  const count = process.argv[2] ? parseInt(process.argv[2], 10) : 1;
  
  if (isNaN(count) || count < 1 || count > 100) {
    console.error('Usage: tsx scripts/generate-beta-key.ts [count]');
    console.error('Count must be between 1 and 100');
    process.exit(1);
  }

  console.log(`Generating ${count} beta key(s)...\n`);

  const keys = [];
  for (let i = 0; i < count; i++) {
    const key = generateBetaKey();
    const betaKey = await db.betaKey.create({
      data: { key }
    });
    keys.push(betaKey.key);
  }

  console.log('Generated beta keys:');
  keys.forEach(key => console.log(`  ${key}`));
  
  console.log(`\n✅ ${count} beta key(s) generated successfully!`);
}

main()
  .catch((e) => {
    console.error('Error generating beta keys:', e);
    process.exit(1);
  })
  .finally(() => {
    db.$disconnect();
  });