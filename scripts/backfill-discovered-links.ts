/**
 * Backfill script to queue discovered links from already-crawled sites
 *
 * This script processes existing IndexedSite records and queues their
 * outboundLinks for crawling. This is a one-time migration to catch up
 * on links that were extracted but never queued.
 *
 * Usage:
 *   npm run backfill-links -- --dry-run
 *   npm run backfill-links -- --limit 100
 *   npm run backfill-links
 */

import { db } from '@/lib/config/database/connection';

interface BackfillOptions {
  limit?: number;
  batchSize?: number;
  dryRun?: boolean;
}

interface BackfillStats {
  sitesProcessed: number;
  linksFound: number;
  linksQueued: number;
  linksSkippedAlreadyIndexed: number;
  linksSkippedAlreadyQueued: number;
  queueAtCapacity: boolean;
}

async function backfillDiscoveredLinks(options: BackfillOptions = {}) {
  const {
    limit,
    batchSize = 50,
    dryRun = false
  } = options;

  console.log('🔄 Starting backfill of discovered links...');
  console.log('Options:', { limit, batchSize, dryRun });
  console.log('');

  const stats: BackfillStats = {
    sitesProcessed: 0,
    linksFound: 0,
    linksQueued: 0,
    linksSkippedAlreadyIndexed: 0,
    linksSkippedAlreadyQueued: 0,
    queueAtCapacity: false
  };

  // Get sites with outbound links
  const sites = await db.indexedSite.findMany({
    where: {
      outboundLinks: {
        isEmpty: false
      }
    },
    select: {
      id: true,
      url: true,
      title: true,
      outboundLinks: true
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: limit
  });

  console.log(`📊 Found ${sites.length} sites with outbound links`);
  console.log('');

  // Process sites in batches
  for (let i = 0; i < sites.length; i += batchSize) {
    const batch = sites.slice(i, i + batchSize);

    for (const site of batch) {
      stats.sitesProcessed++;
      const links = site.outboundLinks || [];
      stats.linksFound += links.length;

      if (links.length === 0) continue;

      console.log(`[${stats.sitesProcessed}/${sites.length}] Processing: ${site.title || site.url} (${links.length} links)`);

      // Check current queue size
      const currentQueueSize = await db.crawlQueue.count({
        where: { status: 'pending' }
      });

      const MAX_QUEUE_SIZE = 5000;
      if (currentQueueSize >= MAX_QUEUE_SIZE) {
        console.log(`  ⚠️  Queue at capacity (${currentQueueSize}/${MAX_QUEUE_SIZE}), stopping`);
        stats.queueAtCapacity = true;
        break;
      }

      // Limit to top 10 links per site to prevent overwhelming
      const linksToCheck = links.slice(0, 10);

      // Check which links are already indexed or queued
      const [existingIndexed, existingQueued] = await Promise.all([
        db.indexedSite.findMany({
          where: { url: { in: linksToCheck } },
          select: { url: true }
        }),
        db.crawlQueue.findMany({
          where: { url: { in: linksToCheck } },
          select: { url: true }
        })
      ]);

      const existingUrlSet = new Set([
        ...existingIndexed.map(s => s.url),
        ...existingQueued.map(q => q.url)
      ]);

      stats.linksSkippedAlreadyIndexed += existingIndexed.length;
      stats.linksSkippedAlreadyQueued += existingQueued.length;

      const newLinks = linksToCheck.filter(link => !existingUrlSet.has(link));

      if (newLinks.length === 0) {
        console.log(`  ℹ️  No new links to queue (all already known)`);
        continue;
      }

      // Calculate how many we can add without exceeding limit
      const slotsAvailable = Math.min(newLinks.length, MAX_QUEUE_SIZE - currentQueueSize);
      const linksToQueue = newLinks.slice(0, slotsAvailable);

      if (dryRun) {
        console.log(`  🔍 [DRY RUN] Would queue ${linksToQueue.length} links:`);
        linksToQueue.forEach(link => console.log(`     - ${link}`));
      } else {
        // Add to queue with low priority and delayed schedule
        const queueItems = linksToQueue.map(url => ({
          url,
          priority: 1, // Low priority for backfilled links
          scheduledFor: new Date(Date.now() + (48 + Math.random() * 72) * 60 * 60 * 1000), // 2-5 days delay
          status: 'pending' as const
        }));

        await db.crawlQueue.createMany({
          data: queueItems,
          skipDuplicates: true
        });

        stats.linksQueued += linksToQueue.length;
        console.log(`  ✅ Queued ${linksToQueue.length} new links (queue: ${currentQueueSize + linksToQueue.length}/${MAX_QUEUE_SIZE})`);
      }
    }

    if (stats.queueAtCapacity) break;

    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Print final stats
  console.log('');
  console.log('📈 Backfill Complete!');
  console.log('='.repeat(50));
  console.log(`Sites processed:              ${stats.sitesProcessed}`);
  console.log(`Total links found:            ${stats.linksFound}`);
  console.log(`Links queued:                 ${stats.linksQueued}`);
  console.log(`Skipped (already indexed):    ${stats.linksSkippedAlreadyIndexed}`);
  console.log(`Skipped (already queued):     ${stats.linksSkippedAlreadyQueued}`);
  console.log(`Queue at capacity:            ${stats.queueAtCapacity ? 'Yes' : 'No'}`);
  console.log('='.repeat(50));

  if (dryRun) {
    console.log('');
    console.log('ℹ️  This was a dry run. No links were actually queued.');
    console.log('   Run without --dry-run to queue links.');
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: BackfillOptions = {};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--limit' && args[i + 1]) {
    options.limit = parseInt(args[i + 1]);
    i++;
  } else if (args[i] === '--batch-size' && args[i + 1]) {
    options.batchSize = parseInt(args[i + 1]);
    i++;
  } else if (args[i] === '--dry-run') {
    options.dryRun = true;
  }
}

// Run the backfill
backfillDiscoveredLinks(options)
  .then(async () => {
    console.log('');
    console.log('✨ Done!');
    await db.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('❌ Backfill failed:', error);
    await db.$disconnect();
    process.exit(1);
  });
