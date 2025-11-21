/**
 * Chat message cleanup script
 * Deletes chat messages older than the specified retention period
 * Safe to run via cron job
 */

import { db } from '@/lib/config/database/connection';

// Configuration
const RETENTION_DAYS = parseInt(process.env.CHAT_RETENTION_DAYS || '90');
const DRY_RUN = process.argv.includes('--dry-run');

async function cleanupOldChatMessages() {
  console.log('🧹 CHAT MESSAGE CLEANUP');
  console.log('======================\n');

  try {
    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

    console.log(`📅 Retention period: ${RETENTION_DAYS} days`);
    console.log(`🗓️  Cutoff date: ${cutoffDate.toISOString()}`);
    console.log(`🔍 Mode: ${DRY_RUN ? 'DRY RUN (preview only)' : 'LIVE DELETE'}\n`);

    // 1. Check current state
    console.log('1️⃣ Analyzing chat messages...');

    const [totalMessages, oldMessages, recentMessages, messagesByRoom] = await Promise.all([
      // Total messages
      db.chatMessage.count(),

      // Old messages (to be deleted)
      db.chatMessage.count({
        where: { createdAt: { lt: cutoffDate } }
      }),

      // Recent messages (to be kept)
      db.chatMessage.count({
        where: { createdAt: { gte: cutoffDate } }
      }),

      // Messages by room
      db.chatMessage.groupBy({
        by: ['roomId'],
        _count: { id: true },
        where: { createdAt: { lt: cutoffDate } }
      })
    ]);

    console.log(`   💬 Total messages: ${totalMessages.toLocaleString()}`);
    console.log(`   🗑️  Messages to delete: ${oldMessages.toLocaleString()}`);
    console.log(`   ✅ Messages to keep: ${recentMessages.toLocaleString()}`);

    if (messagesByRoom.length > 0) {
      console.log(`\n   📊 Old messages by room:`);
      for (const room of messagesByRoom) {
        console.log(`      ${room.roomId}: ${room._count.id.toLocaleString()}`);
      }
    }

    // 2. Perform cleanup
    if (oldMessages > 0) {
      if (DRY_RUN) {
        console.log(`\n2️⃣ DRY RUN: Would delete ${oldMessages.toLocaleString()} messages`);
        console.log(`   ℹ️  Run without --dry-run flag to actually delete`);
      } else {
        console.log(`\n2️⃣ Deleting ${oldMessages.toLocaleString()} old messages...`);

        const startTime = Date.now();

        const deleted = await db.chatMessage.deleteMany({
          where: { createdAt: { lt: cutoffDate } }
        });

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log(`   ✅ Deleted ${deleted.count.toLocaleString()} messages in ${duration}s`);
      }
    } else {
      console.log(`\n2️⃣ No old messages to delete`);
      console.log(`   ✨ Chat database is clean!`);
    }

    // 3. Final stats
    if (!DRY_RUN && oldMessages > 0) {
      const remainingMessages = await db.chatMessage.count();
      const savedSpace = ((oldMessages / totalMessages) * 100).toFixed(1);

      console.log(`\n3️⃣ Cleanup complete!`);
      console.log(`   📊 Remaining messages: ${remainingMessages.toLocaleString()}`);
      console.log(`   💾 Freed up ~${savedSpace}% of storage`);
    }

    console.log(`\n✨ Done!\n`);

  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Run the script
cleanupOldChatMessages()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
