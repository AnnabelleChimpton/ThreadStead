/**
 * Migration script to handle completed crawls that were never properly processed
 * These are sites that were crawled but never went through auto-validation
 */

const { PrismaClient } = require('@prisma/client');

async function migrateCompletedCrawls() {
  const db = new PrismaClient();

  try {
    console.log('🔍 Finding completed crawls that were never processed...');

    // Find completed crawl queue items that are NOT in IndexedSite or DiscoveredSite
    const unprocessedCrawls = await db.$queryRaw`
      SELECT cq.url, cq.status, cq.attempts, cq."lastAttempt"
      FROM "CrawlQueue" cq
      LEFT JOIN "IndexedSite" idx ON cq.url = idx.url
      LEFT JOIN "DiscoveredSite" disc ON cq.url = disc.url
      WHERE cq.status = 'completed'
      AND idx.url IS NULL
      AND disc.url IS NULL
      ORDER BY cq."lastAttempt" DESC
    `;

    console.log(`📊 Found ${unprocessedCrawls.length} unprocessed completed crawls`);

    if (unprocessedCrawls.length === 0) {
      console.log('✅ No unprocessed crawls found - all completed crawls have been handled!');
      return;
    }

    console.log('\nUnprocessed crawls:');
    unprocessedCrawls.forEach(crawl => {
      console.log(`  ${crawl.url} (completed: ${crawl.lastAttempt})`);
    });

    let processed = 0;
    let errors = 0;

    console.log('\n🔄 Processing unprocessed crawls...');
    console.log('Note: This will simulate what the crawler should have done when these sites completed.\n');

    for (const crawl of unprocessedCrawls) {
      try {
        console.log(`\n🕷️ Processing: ${crawl.url}`);

        // We need to re-crawl these sites to get their content and assess quality
        // Since we don't have the original crawl results, we'll add them to DiscoveredSite
        // with a note that they need manual review

        const discoveredSite = await db.discoveredSite.create({
          data: {
            url: crawl.url,
            title: 'Crawled Site (Needs Re-assessment)',
            description: 'Site was crawled but not properly processed due to a bug. Needs manual review.',
            qualityScore: 50, // Neutral score requiring manual review
            qualityReasons: ['crawler_processing_bug', 'needs_manual_assessment'],
            suggestedCategory: 'unknown',
            discoveryMethod: 'crawler_auto_submit',
            discoveryContext: 'Migrated from unprocessed completed crawls',
            reviewStatus: 'needs_review',
            reviewNotes: `Originally crawled on ${crawl.lastAttempt} but not processed due to crawler bug. Requires re-assessment.`,
            contentSample: 'Content extraction needed',
            lastCrawled: crawl.lastAttempt,
            crawlStatus: 'success'
          }
        });

        console.log(`✅ Added to DiscoveredSite for review: ${crawl.url}`);
        processed++;

      } catch (error) {
        console.error(`❌ Error processing ${crawl.url}:`, error.message);
        errors++;
      }
    }

    console.log(`\n🎉 Migration complete!`);
    console.log(`📈 Processed: ${processed} sites`);
    console.log(`❌ Errors: ${errors} sites`);

    if (processed > 0) {
      console.log(`\n💡 Next steps:`);
      console.log(`   1. Check your DiscoveredSite table - ${processed} sites need manual review`);
      console.log(`   2. These sites should be re-crawled to get proper content assessment`);
      console.log(`   3. Consider running a fresh crawler batch to process pending queue items`);
      console.log(`   4. The underlying crawler logic still needs to be fixed to handle new sites`);
    }

  } catch (error) {
    console.error('💥 Migration failed:', error);
  } finally {
    await db.$disconnect();
  }
}

// Run the migration
console.log('🚀 Starting completed crawls migration...');
migrateCompletedCrawls().catch(console.error);