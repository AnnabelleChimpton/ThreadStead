/**
 * PRODUCTION-SAFE: Setup chat rooms
 * This script ONLY creates chat rooms, does NOT delete anything
 * Safe to run multiple times (idempotent)
 */

import { db } from '@/lib/config/database/connection';

async function setupChatRooms() {
  console.log('💬 CHAT ROOM SETUP');
  console.log('==================\n');

  try {
    // Create lounge room (or update if exists)
    const lounge = await db.chatRoom.upsert({
      where: { id: 'lounge' },
      update: {
        name: 'Lounge', // Update name if it ever changes
      },
      create: {
        id: 'lounge',
        name: 'Lounge',
      },
    });

    console.log('✅ Chat room setup complete:');
    console.log(`   ID: ${lounge.id}`);
    console.log(`   Name: ${lounge.name}`);
    console.log(`   Created: ${lounge.createdAt.toISOString()}`);

    // Check for existing messages
    const messageCount = await db.chatMessage.count({
      where: { roomId: 'lounge' }
    });

    console.log(`   Messages: ${messageCount}`);

    console.log('\n✨ Done! No data was deleted.\n');

  } catch (error) {
    console.error('\n❌ Error during setup:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Run the script
setupChatRooms()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
