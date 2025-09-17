/**
 * Daily seeding cron job
 * Run with: npx tsx scripts/daily-seeding.ts
 * Can be scheduled with cron: 0 9 * * * cd /path/to/threadstead && npx tsx scripts/daily-seeding.ts
 */

import { CommunityIndexSeeder } from '../lib/community-index';

async function runDailySeeding() {
  console.log('🌱 Starting daily community index seeding...');
  console.log(`Time: ${new Date().toISOString()}`);

  const seeder = new CommunityIndexSeeder();

  try {
    // Run daily seeding with conservative settings
    const report = await seeder.runDailySeeding({
      maxQueries: 5,           // 5 queries per day
      maxSitesPerQuery: 15,    // 15 sites per query max
      minScore: 45,            // Higher quality threshold for automation
      dryRun: false            // Actually add to database
    });

    console.log('\n📊 Seeding Report:');
    console.log(`  Queries executed: ${report.queriesRun.length}`);
    console.log(`  Sites evaluated: ${report.sitesEvaluated}`);
    console.log(`  Sites added: ${report.sitesAdded}`);
    console.log(`  Sites rejected: ${report.sitesRejected}`);
    console.log(`  Average score: ${report.averageScore.toFixed(1)}`);
    console.log(`  Duration: ${(report.duration / 1000).toFixed(1)}s`);

    if (report.queriesRun.length > 0) {
      console.log(`  Queries: ${report.queriesRun.join(', ')}`);
    }

    if (report.topFinds.length > 0) {
      console.log('\n🌟 Top finds:');
      report.topFinds.slice(0, 3).forEach(find => {
        console.log(`  - ${find.title} (${find.seedingScore.score}) - ${find.url}`);
      });
    }

    if (report.errors.length > 0) {
      console.log('\n⚠️ Errors encountered:');
      report.errors.forEach(error => {
        console.log(`  - ${error}`);
      });
    }

    // Check system health
    const health = await seeder.validateSeedingHealth();
    if (health.recommendations.length > 0) {
      console.log('\n🔧 System recommendations:');
      health.recommendations.forEach(rec => {
        console.log(`  - ${rec}`);
      });
    }

    console.log('\n✅ Daily seeding completed successfully!');

    // Exit successfully
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Daily seeding failed:', error);

    // Log error details
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }

    // Exit with error code
    process.exit(1);
  }
}

// Run the daily seeding
runDailySeeding();