/**
 * Script to run auto-validation on crawler submissions
 * Usage: npx tsx scripts/run-auto-validation.ts [--force]
 */

import { db } from '@/lib/config/database/connection';
import { runAutoValidation } from '@/lib/community-index/validation/auto-validate';

async function main() {
  const force = process.argv.includes('--force');

  console.log('🤖 Starting auto-validation of crawler submissions...');
  console.log(`Force mode: ${force ? 'ON' : 'OFF'}`);

  try {
    // Direct call: the HTTP route is admin/CRAWLER_API_KEY only now, and
    // this used to need the dev server running on :3000 anyway.
    const result = await runAutoValidation({ force });

    console.log('\n✅ Auto-validation completed successfully!');
    console.log(`📊 Results:`);
    console.log(`   • Processed: ${result.processed} sites`);
    console.log(`   • Approved: ${result.results.approved} sites`);
    console.log(`   • Rejected: ${result.results.rejected} sites`);
    console.log(`   • Skipped: ${result.results.skipped} sites`);
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