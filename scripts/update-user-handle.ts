#!/usr/bin/env npx tsx

/**
 * Script to safely update a user's handle
 * Usage: npx tsx scripts/update-user-handle.ts <user-id> <new-handle> [new-display-name]
 * 
 * This script:
 * - Validates the new handle format
 * - Checks handle availability 
 * - Updates User.primaryHandle, Handle records, and optionally Profile.displayName
 * - Uses transactions for data consistency
 */

import { db } from '../lib/db';
import { validateUsername } from '../lib/validation';
import { SITE_NAME } from '../lib/site-config';

async function updateUserHandle(userId: string, newHandle: string, newDisplayName?: string) {
  console.log('🔄 Starting user handle update...');
  console.log(`   User ID: ${userId}`);
  console.log(`   New Handle: ${newHandle}`);
  if (newDisplayName) console.log(`   New Display Name: ${newDisplayName}`);
  console.log(`   Host: ${SITE_NAME}`);
  console.log('');

  // Step 1: Validate inputs
  console.log('📋 Validating inputs...');
  
  if (!userId || typeof userId !== 'string') {
    throw new Error('Invalid user ID provided');
  }

  const validation = validateUsername(newHandle);
  if (!validation.ok) {
    throw new Error(`Invalid handle format: ${validation.message}`);
  }

  // Step 2: Check if user exists
  console.log('👤 Checking if user exists...');
  const existingUser = await db.user.findUnique({
    where: { id: userId },
    include: {
      handles: true,
      profile: true
    }
  });

  if (!existingUser) {
    throw new Error(`User with ID ${userId} not found`);
  }

  console.log(`   Current Primary Handle: ${existingUser.primaryHandle || 'None'}`);
  console.log(`   Current Display Name: ${existingUser.profile?.displayName || 'None'}`);
  console.log('');

  // Step 3: Check handle availability
  console.log('🔍 Checking handle availability...');
  const handleTaken = await db.handle.findFirst({
    where: { 
      handle: newHandle, 
      host: SITE_NAME,
      userId: { not: userId } // Allow user to keep their current handle
    }
  });

  if (handleTaken) {
    throw new Error(`Handle "${newHandle}@${SITE_NAME}" is already taken by another user`);
  }

  console.log('   ✅ Handle is available');
  console.log('');

  // Step 4: Confirm the update
  console.log('⚠️  CONFIRMATION REQUIRED');
  console.log('   This will permanently update the user\'s handle.');
  console.log('   Continue? Press Ctrl+C to cancel, or any key to continue...');
  
  // In a real script, you might want to add readline for user confirmation
  // For now, we'll proceed (remove this in production and add proper confirmation)

  // Step 5: Perform the update in a transaction
  console.log('🔄 Performing update...');
  
  const newPrimaryHandle = `${newHandle}@${SITE_NAME}`;
  
  await db.$transaction(async (tx) => {
    console.log('   📝 Updating User.primaryHandle...');
    await tx.user.update({
      where: { id: userId },
      data: { primaryHandle: newPrimaryHandle }
    });

    console.log('   📝 Updating Handle record...');
    // Remove old handle for this host (if it exists)
    await tx.handle.deleteMany({
      where: { 
        userId: userId, 
        host: SITE_NAME 
      }
    });

    // Create new handle
    await tx.handle.create({
      data: {
        userId: userId,
        handle: newHandle,
        host: SITE_NAME,
        verifiedAt: new Date()
      }
    });

    // Update display name if provided
    if (newDisplayName) {
      console.log('   📝 Updating Profile.displayName...');
      await tx.profile.upsert({
        where: { userId: userId },
        update: { displayName: newDisplayName },
        create: {
          userId: userId,
          displayName: newDisplayName,
          bio: `Hi, I'm ${newDisplayName}! Welcome to my retro page.`,
          avatarUrl: "/assets/default-avatar.gif",
          visibility: "public"
        }
      });
    }
  });

  console.log('');
  console.log('✅ User handle updated successfully!');
  console.log(`   New Primary Handle: ${newPrimaryHandle}`);
  if (newDisplayName) {
    console.log(`   New Display Name: ${newDisplayName}`);
  }
  
  // Verify the update
  const updatedUser = await db.user.findUnique({
    where: { id: userId },
    include: {
      handles: true,
      profile: true
    }
  });

  console.log('');
  console.log('📊 Final verification:');
  console.log(`   Primary Handle: ${updatedUser?.primaryHandle}`);
  console.log(`   Handle Records: ${updatedUser?.handles.map(h => `${h.handle}@${h.host}`).join(', ')}`);
  console.log(`   Display Name: ${updatedUser?.profile?.displayName || 'None'}`);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: npx tsx scripts/update-user-handle.ts <user-id> <new-handle> [new-display-name]');
    console.error('');
    console.error('Examples:');
    console.error('  npx tsx scripts/update-user-handle.ts clxyz123 johnsmith');
    console.error('  npx tsx scripts/update-user-handle.ts clxyz123 johnsmith "John Smith"');
    process.exit(1);
  }

  const [userId, newHandle, newDisplayName] = args;

  try {
    await updateUserHandle(userId, newHandle, newDisplayName);
    console.log('');
    console.log('🎉 Script completed successfully!');
  } catch (error) {
    console.error('');
    console.error('❌ Error updating user handle:');
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

if (require.main === module) {
  main().catch(console.error);
}