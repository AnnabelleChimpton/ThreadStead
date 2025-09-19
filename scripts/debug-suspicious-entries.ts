/**
 * Debug script to understand what the health check is finding
 * Run with: npx tsx scripts/debug-suspicious-entries.ts
 */

import { db } from '../lib/config/database/connection';

async function debugSuspiciousEntries() {
  console.log('🔍 Debug: What Health Check Found');
  console.log('=================================\n');

  // Replicate the exact query from verify-corporate-cleanup.ts
  const suspiciousEntries = await db.indexedSite.findMany({
    where: {
      OR: [
        // Corporate profiles that are still searchable
        {
          platformType: 'corporate_profile',
          indexingPurpose: 'full_index'
        },
        // High scoring sites on corporate domains
        {
          AND: [
            { communityScore: { gt: 0 } },
            { url: { contains: 'youtube.com' } }
          ]
        },
        {
          AND: [
            { communityScore: { gt: 0 } },
            { url: { contains: 'twitter.com' } }
          ]
        },
        {
          AND: [
            { communityScore: { gt: 0 } },
            { url: { contains: 'instagram.com' } }
          ]
        }
      ]
    },
    select: {
      id: true,
      url: true,
      title: true,
      communityScore: true,
      platformType: true,
      indexingPurpose: true,
      crawlStatus: true,
      createdAt: true
    },
    take: 30,
    orderBy: { communityScore: 'desc' }
  });

  console.log(`Found ${suspiciousEntries.length} suspicious entries:\n`);

  for (const entry of suspiciousEntries) {
    console.log(`🔍 ${entry.title}`);
    console.log(`   URL: ${entry.url}`);
    console.log(`   Community Score: ${entry.communityScore}`);
    console.log(`   Platform Type: ${entry.platformType || 'null'}`);
    console.log(`   Indexing Purpose: ${entry.indexingPurpose || 'null'}`);
    console.log(`   Crawl Status: ${entry.crawlStatus || 'null'}`);
    console.log(`   Created: ${entry.createdAt.toISOString().split('T')[0]}`);
    console.log('');
  }

  // Also check general stats
  console.log('📊 CURRENT STATS');
  console.log('================');

  const [
    totalSites,
    searchableSites,
    corporateProfiles,
    corporateForExtraction,
    youtubeCount,
    twitterCount
  ] = await Promise.all([
    db.indexedSite.count(),
    db.indexedSite.count({ where: { indexingPurpose: 'full_index' } }),
    db.indexedSite.count({ where: { platformType: 'corporate_profile' } }),
    db.indexedSite.count({
      where: {
        platformType: 'corporate_profile',
        indexingPurpose: 'link_extraction'
      }
    }),
    db.indexedSite.count({ where: { url: { contains: 'youtube.com' } } }),
    db.indexedSite.count({ where: { url: { contains: 'twitter.com' } } })
  ]);

  console.log(`Total sites: ${totalSites}`);
  console.log(`Searchable sites: ${searchableSites}`);
  console.log(`Corporate profiles (total): ${corporateProfiles}`);
  console.log(`Corporate for extraction: ${corporateForExtraction}`);
  console.log(`YouTube URLs (total): ${youtubeCount}`);
  console.log(`Twitter URLs (total): ${twitterCount}`);

  // Check for edge cases
  console.log('\n🔬 EDGE CASE ANALYSIS');
  console.log('=====================');

  const edgeCases = await db.indexedSite.findMany({
    where: {
      OR: [
        { platformType: null },
        { indexingPurpose: null },
        {
          AND: [
            { url: { contains: 'youtube.com' } },
            { platformType: { not: 'corporate_profile' } }
          ]
        }
      ]
    },
    select: {
      url: true,
      platformType: true,
      indexingPurpose: true,
      communityScore: true
    },
    take: 10
  });

  console.log(`Found ${edgeCases.length} edge cases (null fields or misclassified):`);
  edgeCases.forEach(entry => {
    console.log(`  ${entry.url} | platform: ${entry.platformType} | purpose: ${entry.indexingPurpose} | score: ${entry.communityScore}`);
  });
}

debugSuspiciousEntries().catch(console.error).finally(() => db.$disconnect());