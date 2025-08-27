#!/usr/bin/env npx tsx

/**
 * Script to delete the test users created by create-test-users.ts
 * Run with: npx tsx scripts/delete-test-users.ts
 */

import { db } from "../lib/db";

const TEST_USER_HANDLES = [
  "alice_blogger",
  "bob_developer", 
  "carol_artist",
  "david_writer",
  "eve_gamer",
  "frank_annoying"
];

async function deleteTestUsers(): Promise<void> {
  console.log("🧹 Deleting test users...\n");

  for (const handle of TEST_USER_HANDLES) {
    try {
      // Find users with this handle (regardless of host)
      const users = await db.user.findMany({
        where: {
          handles: {
            some: {
              handle: handle
            }
          }
        },
        include: {
          handles: true,
          posts: true,
          comments: true
        }
      });

      for (const user of users) {
        console.log(`Deleting user: ${handle} (${user.id})...`);
        
        // Delete related data first
        await db.post.deleteMany({
          where: { authorId: user.id }
        });
        
        await db.comment.deleteMany({
          where: { authorId: user.id }
        });
        
        await db.handle.deleteMany({
          where: { userId: user.id }
        });
        
        await db.profile.deleteMany({
          where: { userId: user.id }
        });
        
        await db.session.deleteMany({
          where: { userId: user.id }
        });
        
        // Finally delete the user
        await db.user.delete({
          where: { id: user.id }
        });
        
        console.log(`✅ Deleted user ${handle}`);
      }
      
    } catch (error) {
      console.error(`❌ Failed to delete user ${handle}:`, error);
    }
  }

  console.log("\n✨ Test user cleanup complete!");
}

async function main() {
  await deleteTestUsers();
  process.exit(0);
}

// Handle any uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
  process.exit(1);
});

main().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});