/**
 * Script to test the crawler functionality
 * Run with: npx ts-node scripts/test-crawler.ts
 */

import { CrawlerWorker } from '../lib/crawler/crawler-worker.js';
import { SiteCrawler } from '../lib/crawler/site-crawler.js';

async function testCrawler() {
  console.log('🕷️ Testing Threadstead Crawler\n');

  // Test individual site crawling
  console.log('=== TESTING INDIVIDUAL SITE CRAWL ===');
  const crawler = new SiteCrawler();
  const testUrl = 'https://antonok.com'; // From your crawl queue

  try {
    console.log(`Testing crawl of: ${testUrl}`);
    const result = await crawler.crawlSite(testUrl);

    console.log('Crawl Result:', {
      success: result.success,
      statusCode: result.statusCode,
      robotsAllowed: result.robotsAllowed,
      robotsDelay: result.robotsDelay,
      crawlTime: `${result.crawlTime}ms`,
      error: result.error
    });

    if (result.content) {
      console.log('\nExtracted Content:', {
        title: result.content.title,
        description: result.content.description?.substring(0, 100) + '...',
        snippet: result.content.snippet.substring(0, 150) + '...',
        language: result.content.language,
        keywords: result.content.keywords.slice(0, 5),
        contentLength: result.content.contentLength,
        hasIndieWebMarkers: result.content.hasIndieWebMarkers,
        isPersonalSite: result.content.isPersonalSite,
        techStack: result.content.techStack,
        outboundLinks: result.content.links.slice(0, 3)
      });
    }
  } catch (error) {
    console.error('Individual crawl test failed:', error);
  }

  console.log('\n=== TESTING CRAWLER WORKER ===');

  // Test crawler worker
  const worker = new CrawlerWorker({
    batchSize: 3, // Small batch for testing
    concurrency: 2,
    enableLogging: true
  });

  try {
    // Get initial stats
    const statsBefore = await worker.getQueueStats();
    console.log('Queue stats before:', statsBefore);

    if (statsBefore.pending === 0) {
      console.log('⚠️ No pending items in queue. Crawler worker test skipped.');
      return;
    }

    // Run crawler worker
    console.log('\n🚀 Running crawler worker...');
    const crawlStats = await worker.processPendingQueue();

    console.log('\nCrawler Stats:', crawlStats);

    // Get final stats
    const statsAfter = await worker.getQueueStats();
    console.log('\nQueue stats after:', statsAfter);

    // Summary
    console.log('\n=== SUMMARY ===');
    console.log(`✅ Processed: ${crawlStats.processed}`);
    console.log(`✅ Successful: ${crawlStats.successful}`);
    console.log(`❌ Failed: ${crawlStats.failed}`);
    console.log(`⏭️ Skipped: ${crawlStats.skipped}`);
    console.log(`⏱️ Duration: ${crawlStats.duration}ms`);

    if (crawlStats.errors.length > 0) {
      console.log('\n⚠️ Errors:');
      crawlStats.errors.forEach(error => console.log(`  - ${error}`));
    }

  } catch (error) {
    console.error('Worker test failed:', error);
  }
}

// Run the test
testCrawler()
  .then(() => {
    console.log('\n🎉 Crawler test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });