#!/usr/bin/env npx tsx

/**
 * Run decoration migration to add missing house and atmosphere items
 * This script requires admin access
 */

const API_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function runMigration() {
  console.log('🎨 Running decoration migration...\n');

  try {
    const response = await fetch(`${API_URL}/api/admin/decorations/migrate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Migration failed:', data.error || response.statusText);
      console.error('\nNote: This endpoint requires admin authentication.');
      console.error('Please ensure you are logged in as an admin user.\n');
      process.exit(1);
    }

    console.log('✅ Migration completed successfully!');
    console.log('\nResults:');
    console.log(`  - Created: ${data.results.created} items`);
    console.log(`  - Skipped: ${data.results.skipped} items`);

    if (data.results.errors && data.results.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered:`);
      data.results.errors.forEach((error: string) => {
        console.log(`  - ${error}`);
      });
    }

    console.log('\n🎉 Decoration system updated!');
    console.log('You can now use the Home Decorator with:');
    console.log('  - House options (doors, windows, roof trim)');
    console.log('  - Sky/atmosphere options');
    console.log('  - All existing yard decorations\n');

  } catch (error: any) {
    console.error('❌ Failed to run migration:', error.message);
    console.error('\nMake sure:');
    console.error('  1. Your development server is running');
    console.error('  2. You have admin access');
    console.error('  3. Database connection is working\n');
    process.exit(1);
  }
}

runMigration();
