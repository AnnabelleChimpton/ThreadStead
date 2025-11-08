#!/usr/bin/env npx tsx

/**
 * Helper script to show what user identifier formats work with delete-user.ts
 * Usage: npx tsx scripts/show-user-formats.ts [optional-handle-to-lookup]
 */

import { db } from '../lib/config/database/connection';
import { SITE_NAME } from '../lib/config/site/constants';

async function showUserFormats(lookupHandle?: string) {
  console.log('📋 User Identifier Formats for delete-user.ts\n');
  console.log(`Site Name: ${SITE_NAME}\n`);

  console.log('✅ ACCEPTED FORMATS:\n');
  console.log('1. User ID (database ID):');
  console.log('   Example: npx tsx scripts/delete-user.ts clxyz12345abcde\n');

  console.log('2. Handle (without domain):');
  console.log(`   Example: npx tsx scripts/delete-user.ts testuser\n`);

  console.log('3. Full handle (with @domain):');
  console.log(`   Example: npx tsx scripts/delete-user.ts testuser@${SITE_NAME}\n`);

  console.log('='.repeat(60) + '\n');

  // If a handle was provided, look it up and show all valid formats
  if (lookupHandle) {
    console.log(`🔍 Looking up user: ${lookupHandle}\n`);

    // Remove @ prefix if present
    const cleanHandle = lookupHandle.replace(/^@/, '').replace(`@${SITE_NAME}`, '');

    const handle = await db.handle.findFirst({
      where: {
        handle: cleanHandle,
        host: SITE_NAME
      },
      include: {
        user: {
          select: {
            id: true,
            primaryHandle: true
          }
        }
      }
    });

    if (handle) {
      console.log('✅ User found! You can delete them using ANY of these formats:\n');
      console.log(`   npx tsx scripts/delete-user.ts ${handle.user.id}`);
      console.log(`   npx tsx scripts/delete-user.ts ${handle.handle}`);
      console.log(`   npx tsx scripts/delete-user.ts ${handle.handle}@${SITE_NAME}`);
    } else {
      console.log(`❌ User not found: ${cleanHandle}`);
      console.log('\nTrying to find similar handles...\n');

      const similarHandles = await db.handle.findMany({
        where: {
          handle: {
            contains: cleanHandle
          },
          host: SITE_NAME
        },
        take: 5,
        include: {
          user: {
            select: {
              id: true,
              primaryHandle: true
            }
          }
        }
      });

      if (similarHandles.length > 0) {
        console.log('📝 Similar handles found:');
        similarHandles.forEach(h => {
          console.log(`   - ${h.handle} (ID: ${h.user.id})`);
        });
      } else {
        console.log('No similar handles found.');
      }
    }
  } else {
    // Show some example users from the database
    console.log('📝 Example users in your database:\n');

    const users = await db.user.findMany({
      take: 5,
      include: {
        handles: {
          where: {
            host: SITE_NAME
          },
          take: 1
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (users.length > 0) {
      users.forEach((user, index) => {
        const handle = user.handles[0]?.handle || 'no-handle';
        console.log(`${index + 1}. Handle: ${handle}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Delete with: npx tsx scripts/delete-user.ts ${handle}`);
        console.log('');
      });

      console.log('💡 TIP: Run with a handle to see all valid formats for that user:');
      console.log(`   npx tsx scripts/show-user-formats.ts ${users[0].handles[0]?.handle || 'testuser'}\n`);
    } else {
      console.log('No users found in database.\n');
    }
  }

  await db.$disconnect();
}

async function main() {
  const args = process.argv.slice(2);
  const lookupHandle = args[0];

  await showUserFormats(lookupHandle);
}

main().catch(console.error);
