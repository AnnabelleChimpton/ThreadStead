/**
 * Script to run auto-validation on crawler submissions
 * Usage: npx tsx scripts/run-auto-validation.ts [--force]
 */

import { db } from '@/lib/config/database/connection';

async function main() {
  const force = process.argv.includes('--force');

  console.log('🤖 Starting auto-validation of crawler submissions...');
  console.log(`Force mode: ${force ? 'ON' : 'OFF'}`);

  try {
    const response = await fetch(`http://localhost:3000/api/community-index/auto-validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ force }),
    });

    const result = await response.json();

    if (result.success) {
      console.log('\n✅ Auto-validation completed successfully!');
      console.log(`📊 Results:`);
      console.log(`   • Processed: ${result.processed} sites`);
      console.log(`   • Approved: ${result.results.approved} sites`);
      console.log(`   • Rejected: ${result.results.rejected} sites`);
      console.log(`   • Skipped: ${result.results.skipped} sites`);
    } else {
      console.error('❌ Auto-validation failed:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Script error:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export default main;