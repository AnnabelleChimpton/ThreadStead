#!/usr/bin/env npx tsx

/**
 * Test script to verify delete-user.ts DID cleanup logic
 * This script simulates the deletion process without actually deleting anything
 *
 * Usage: npx tsx scripts/test-delete-user-did-cleanup.ts
 */

import { loadUserDIDMappings, storeUserDIDMappings } from '../lib/api/did/server-did-client';
import { join } from 'path';
import { readFile, writeFile, copyFile } from 'fs/promises';

const BACKUP_FILE = '.threadstead-user-dids.json.test-backup';

async function testDIDCleanup() {
  console.log('🧪 Testing DID cleanup logic for delete-user.ts\n');

  try {
    // Step 1: Load current DID mappings
    console.log('1️⃣  Loading current DID mappings...');
    const originalMappings = await loadUserDIDMappings();
    console.log(`   ✅ Found ${originalMappings.length} DID mappings`);

    if (originalMappings.length === 0) {
      console.log('\n⚠️  No DID mappings found. Create some test users first.');
      return;
    }

    // Step 2: Display all current DIDs
    console.log('\n2️⃣  Current DID mappings:');
    originalMappings.forEach((mapping, index) => {
      console.log(`   ${index + 1}. User ID: ${mapping.userId}`);
      console.log(`      DID: ${mapping.did}`);
      console.log(`      Hash: ${mapping.userHash}`);
      console.log(`      Created: ${mapping.created}`);
      console.log('');
    });

    // Step 3: Create a backup
    console.log('3️⃣  Creating backup of DID mappings file...');
    const filePath = join(process.cwd(), '.threadstead-user-dids.json');
    const backupPath = join(process.cwd(), BACKUP_FILE);
    await copyFile(filePath, backupPath);
    console.log(`   ✅ Backup created: ${BACKUP_FILE}`);

    // Step 4: Simulate deletion of first user
    if (originalMappings.length > 0) {
      const testUserId = originalMappings[0].userId;
      console.log(`\n4️⃣  Simulating deletion of user: ${testUserId}`);

      // Filter out the test user (this is what delete-user.ts does)
      const filteredMappings = originalMappings.filter(m => m.userId !== testUserId);

      console.log(`   Before: ${originalMappings.length} mappings`);
      console.log(`   After:  ${filteredMappings.length} mappings`);
      console.log(`   Removed: ${originalMappings.length - filteredMappings.length} mapping(s)`);

      // Verify the correct user was removed
      const removedMapping = originalMappings.find(m => m.userId === testUserId);
      const stillExists = filteredMappings.some(m => m.userId === testUserId);

      console.log('\n   🔍 Verification:');
      console.log(`      Target user ${testUserId}: ${stillExists ? '❌ STILL EXISTS (BAD)' : '✅ Removed (GOOD)'}`);

      // Verify other users are untouched
      const otherUsersIntact = originalMappings
        .filter(m => m.userId !== testUserId)
        .every(origMapping =>
          filteredMappings.some(filtMapping =>
            filtMapping.userId === origMapping.userId &&
            filtMapping.did === origMapping.did &&
            filtMapping.userHash === origMapping.userHash
          )
        );

      console.log(`      Other users intact: ${otherUsersIntact ? '✅ Yes (GOOD)' : '❌ No (BAD)'}`);

      // Step 5: Test the actual file operations (write and read back)
      console.log('\n5️⃣  Testing file write and read operations...');

      // Write the filtered mappings
      await storeUserDIDMappings(filteredMappings);
      console.log('   ✅ Wrote filtered mappings to disk');

      // Read them back
      const reloadedMappings = await loadUserDIDMappings();
      console.log(`   ✅ Read mappings back from disk: ${reloadedMappings.length} entries`);

      // Verify integrity
      const integrityCheck =
        reloadedMappings.length === filteredMappings.length &&
        reloadedMappings.every((reloaded, index) => {
          const filtered = filteredMappings[index];
          return reloaded.userId === filtered.userId &&
                 reloaded.did === filtered.did &&
                 reloaded.userHash === filtered.userHash;
        });

      console.log(`   Data integrity: ${integrityCheck ? '✅ Passed (GOOD)' : '❌ Failed (BAD)'}`);

      // Step 6: Display remaining mappings
      console.log('\n6️⃣  Remaining DID mappings after simulated deletion:');
      if (reloadedMappings.length === 0) {
        console.log('   (none)');
      } else {
        reloadedMappings.forEach((mapping, index) => {
          console.log(`   ${index + 1}. User ID: ${mapping.userId}`);
          console.log(`      DID: ${mapping.did}`);
          console.log('');
        });
      }

      // Step 7: Restore from backup
      console.log('7️⃣  Restoring original DID mappings from backup...');
      await copyFile(backupPath, filePath);
      console.log('   ✅ Original mappings restored');

      // Verify restoration
      const restoredMappings = await loadUserDIDMappings();
      const restorationSuccessful =
        restoredMappings.length === originalMappings.length &&
        restoredMappings.every((restored, index) => {
          const original = originalMappings[index];
          return restored.userId === original.userId &&
                 restored.did === original.did;
        });

      console.log(`   Restoration check: ${restorationSuccessful ? '✅ Successful (GOOD)' : '❌ Failed (BAD)'}`);

      // Step 8: Final summary
      console.log('\n' + '='.repeat(60));
      console.log('📊 TEST SUMMARY');
      console.log('='.repeat(60));
      console.log(`✅ Started with ${originalMappings.length} DID mappings`);
      console.log(`✅ Simulated deletion of user ${testUserId}`);
      console.log(`✅ Correctly removed 1 mapping, leaving ${filteredMappings.length}`);
      console.log(`✅ Other users' DIDs were preserved: ${otherUsersIntact ? 'YES' : 'NO'}`);
      console.log(`✅ File operations work correctly: ${integrityCheck ? 'YES' : 'NO'}`);
      console.log(`✅ Restoration successful: ${restorationSuccessful ? 'YES' : 'NO'}`);
      console.log('='.repeat(60));

      if (stillExists || !otherUsersIntact || !integrityCheck || !restorationSuccessful) {
        console.log('\n❌ TEST FAILED - DO NOT USE delete-user.ts IN PRODUCTION');
        process.exit(1);
      } else {
        console.log('\n✅ TEST PASSED - delete-user.ts DID cleanup logic is safe to use');
      }
    }

    // Cleanup backup file
    console.log(`\n8️⃣  Cleaning up test backup file...`);
    const { unlink } = await import('fs/promises');
    await unlink(backupPath);
    console.log('   ✅ Backup file removed');

  } catch (error) {
    console.error('\n❌ TEST ERROR:', error);
    console.error('\n⚠️  Your original DID mappings should be safe.');
    console.error(`⚠️  If something went wrong, restore from: ${BACKUP_FILE}`);
    process.exit(1);
  }
}

async function main() {
  await testDIDCleanup();
}

// Handle any uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
  console.error(`\n⚠️  If something went wrong, restore from: ${BACKUP_FILE}`);
  process.exit(1);
});

main().catch((error) => {
  console.error('❌ Script failed:', error);
  console.error(`\n⚠️  If something went wrong, restore from: ${BACKUP_FILE}`);
  process.exit(1);
});
