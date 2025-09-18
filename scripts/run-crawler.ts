/**
 * Production crawler script
 * Run with: npx ts-node scripts/run-crawler.ts
 * Intended for cron jobs or scheduled tasks
 */

import { CrawlerWorker } from '../lib/crawler/crawler-worker';

async function runCrawler() {
  const startTime = Date.now();
  console.log(`🕷️ [${new Date().toISOString()}] Starting scheduled crawler run`);

  const worker = new CrawlerWorker({
    batchSize: 20, // Process 20 sites per run
    concurrency: 3, // 3 concurrent requests
    enableLogging: true
  });

  try {
    // Get initial queue state
    const statsBefore = await worker.getQueueStats();
    console.log(`📊 Queue status: ${statsBefore.pending} pending, ${statsBefore.completed} completed, ${statsBefore.failed} failed`);

    if (statsBefore.pending === 0) {
      console.log('✅ No pending items in crawl queue');
      return;
    }

    // Run the crawler
    const crawlStats = await worker.processPendingQueue();

    // Get final queue state
    const statsAfter = await worker.getQueueStats();

    // Log results
    const duration = Date.now() - startTime;
    console.log(`\n📈 Crawl Results:`);
    console.log(`  ✅ Successful: ${crawlStats.successful}`);
    console.log(`  ❌ Failed: ${crawlStats.failed}`);
    console.log(`  ⏭️ Skipped (will retry): ${crawlStats.skipped}`);
    console.log(`  ⏱️ Total duration: ${duration}ms`);
    console.log(`  📊 Queue: ${statsAfter.pending} pending (was ${statsBefore.pending})`);

    // Log any errors
    if (crawlStats.errors.length > 0) {
      console.log(`\n⚠️ Errors (${crawlStats.errors.length}):`);
      crawlStats.errors.forEach(error => console.log(`  - ${error}`));
    }

    // Clean up old completed items weekly (if this is run daily)
    if (Math.random() < 0.14) { // ~1/7 chance = weekly
      console.log('\n🧹 Running weekly cleanup...');
      const cleaned = await worker.cleanupOldItems(30);
      console.log(`🗑️ Cleaned up ${cleaned} old completed items`);
    }

    console.log(`✅ Crawler run completed successfully`);

  } catch (error) {
    console.error('❌ Crawler run failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️ Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️ Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run the crawler
runCrawler()
  .then(() => {
    console.log(`🎉 [${new Date().toISOString()}] Crawler run completed`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(`💥 [${new Date().toISOString()}] Crawler run failed:`, error);
    process.exit(1);
  });